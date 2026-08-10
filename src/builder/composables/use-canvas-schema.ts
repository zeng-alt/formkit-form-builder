import { computed, watch } from 'vue'
import type { Ref } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { useDragAndDrop } from '@formkit/drag-and-drop/vue'
import { customInsertPlugin } from '@/utils/custom-insert-plugin'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import type { DndContext } from '@/utils/dnd/context'
import { findNodeByKey, updateAtPath } from '@/utils/schema/tree'
import { canvasSchemaLibrary } from '@/builder/containers'
import { createDefaultInsertPointElement } from '@/utils/dnd/insert-point-element'
import {
  collectSchemaNames,
  duplicateNode,
  generateKey,
  generateNextFieldName,
} from '@/utils/dnd/schema'
import { toCanvasSchemaNode } from '@/utils/canvas-schema'
import { normalizeContainerNode } from '@/elements/canvas'
import { provideCanvasSchemaContext } from './canvas-schema-context'

// 画布（根 DropArea）组合函数：负责根级 DnD 列表 + schema 变更/选中逻辑
export function useCanvasSchema() {
  // 所属 FormBuilder 实例状态：多设计器并存时各自独立。
  const state = useFormBuilderState()
  const {
    formDefinition,
    formSchema,
    selectedIndex,
    selectedKey,
    selectedTarget,
    commitSchemaReconcile,
  } = state

  // ── 画布表单样式 ────────────────────────────────────────────────────────────
  const canvasFormClass = computed(() => {
    const common = ['[&_.formkit-label]:text-xs', '[&_.formkit-label]:font-bold'].join(' ')
    if (formDefinition.value?.settings?.labelAlign !== 'left') return common
    return [
      common,
      '[&_.formkit-wrapper]:flex',
      '[&_.formkit-wrapper]:flex-row',
      '[&_.formkit-wrapper]:items-start',
      '[&_.formkit-wrapper]:gap-3',
      '[&_.formkit-label]:mb-0',
      '[&_.formkit-label]:w-[var(--fk-label-width)]',
      '[&_.formkit-label]:shrink-0',
      '[&_.formkit-label]:pt-1',
      '[&_.formkit-inner]:flex-1',
      '[&_.formkit-inner]:min-w-0',
    ].join(' ')
  })

  // ── 删除根节点 ───────────────────────────────────────────────────────────────
  const deleteField = (index: number) => {
    const nextSchema = formSchema.value.filter((_, i) => i !== index)
    commitSchemaReconcile(nextSchema as FormKitSchemaFormKit[], { reason: 'delete' })
    fields.value = fields.value.filter((_, i) => i !== index)
  }

  // ── 复制根节点（在下方插入副本，name 重新生成，其余配置保持一致）────────────
  const duplicateField = (index: number) => {
    const source = fields.value[index]
    if (!source) return
    const existingNames = new Set<string>()
    collectSchemaNames(formSchema.value as any, existingNames)
    const clone = duplicateNode(source, existingNames)
    const next = [...fields.value]
    next.splice(index + 1, 0, clone)
    fields.value = next
    commitSchemaReconcile(next as FormKitSchemaFormKit[], { reason: 'duplicate' })
  }

  // ── 更新容器子节点（拖拽进出容器后写回 schema）──────────────────────────────
  const updateContainerChildren = (containerKey: string, children: FormKitSchemaFormKit[]) => {
    const currentFound = findNodeByKey(formSchema.value as unknown[], containerKey)
    if (!currentFound) return
    const existingNames = new Set<string>()
    collectSchemaNames(formSchema.value as any, existingNames)

    const ensureIdentity = (node: any): any => {
      if (!node || typeof node !== 'object') return node
      if (node.$formkit === 'submit' && Array.isArray(node.children)) {
        delete node.children
      }
      if (typeof node.__key === 'string' && node.__key) {
        if (Array.isArray(node.children))
          node.children = node.children.map((c: any) => ensureIdentity(c))
        return node
      }
      const nextKey = generateKey()
      const nextName = node.$formkit === 'submit' ? node.name : generateNextFieldName(existingNames)
      const next: any =
        node.$formkit === 'submit'
          ? { ...node, __key: nextKey, outerClass: node.outerClass || 'col-span-12 pt-2' }
          : {
              ...node,
              __key: nextKey,
              name: nextName,
              id: `field_${nextKey}`,
              // $cmp 节点的语义 name 在 props.name（DSL 回读取 props），顶层 name 仅画布展示
              ...(typeof node.$cmp === 'string'
                ? {
                    props:
                      node.props && typeof node.props === 'object'
                        ? { ...node.props, name: nextName }
                        : { name: nextName },
                  }
                : {}),
              outerClass: node.outerClass || 'col-span-12',
            }
      if (Array.isArray(node.children))
        next.children = node.children.map((c: any) => ensureIdentity(c))
      return next
    }
    const normalizedChildren = children.map((c: any) => ensureIdentity({ ...c }))

    const childKeys = new Set<string>()
    const collectKeys = (nodes: any[]) => {
      for (const n of nodes) {
        const k = n?.__key
        if (typeof k === 'string' && k) childKeys.add(k)
        const c = n?.children
        if (Array.isArray(c)) collectKeys(c)
      }
    }
    collectKeys(normalizedChildren as any[])

    // 从全树剪掉已移动进容器的节点（避免同节点同时出现在容器内外）
    const prune = (nodes: any[]): any[] => {
      return nodes
        .filter((node) => {
          const k = node?.__key
          if (typeof k === 'string' && k) {
            if (k === containerKey) return true
            if (childKeys.has(k)) return false
          }
          return true
        })
        .map((node) => {
          if (!node || typeof node !== 'object') return node
          const c = (node as any).children
          if (!Array.isArray(c)) return node
          const nextChildren = prune(c)
          return { ...(node as any), children: nextChildren }
        })
    }

    const prunedSchema = prune(formSchema.value as any[]) as FormKitSchemaFormKit[]
    const found = findNodeByKey(prunedSchema as unknown[], containerKey)
    if (!found) return
    const merged: any = { ...(found.node as any), children: normalizedChildren }
    if (merged.$cmp) {
      merged.props = { ...merged.props }
      if (merged.props && typeof merged.props === 'object') delete merged.props.modelValue
    }
    const nextSchema = updateAtPath(
      prunedSchema as unknown[],
      found.path,
      merged,
    ) as FormKitSchemaFormKit[]
    commitSchemaReconcile(nextSchema as FormKitSchemaFormKit[], {
      reason: 'container-children',
      merge: true,
    })
  }

  // ── 选中 ─────────────────────────────────────────────────────────────────────
  const selectByKey = (key: string) => {
    const found = findNodeByKey(formSchema.value as unknown[], key)
    if (!found) return
    selectedTarget.value = 'field'
    selectedIndex.value = found.rootIndex
    selectedKey.value = key
    // 选中普通节点即退出列编辑态
    state.selectedColumnIndex.value = null
  }

  // ── 画布内联编辑写回（静态元素 text 内容等）─────────────────────────────────
  const updateNodePropsByKey = (key: string, props: Record<string, unknown>) => {
    const found = findNodeByKey(formSchema.value as unknown[], key)
    if (!found) return
    const node: any = { ...(found.node as any) }
    node.props = { ...node.props, ...props }
    const nextSchema = updateAtPath(
      formSchema.value as unknown[],
      found.path,
      node,
    ) as FormKitSchemaFormKit[]
    commitSchemaReconcile(nextSchema, { reason: 'inline-edit', merge: true })
  }

  // ── 根级 DnD ────────────────────────────────────────────────────────────────
  // 根 drop-area 的 DnD 上下文：提交 / 插入定位绑定到本画布实例。
  const dndContext: DndContext = {
    formSchema: state.formSchema,
    commitSchemaReconcile: state.commitSchemaReconcile,
  }
  const [formFields, fields] = useDragAndDrop<FormKitSchemaFormKit>(formSchema.value, {
    group: 'form-builder',
    nativeDrag: true,
    draggingClass: 'opacity-5 bg-green-400/50',
    accepts: () => true,
    sortable: true,
    draggable: (el: HTMLElement) => el.getAttribute('data-canvas-item') === 'true',
    handleNodePointerup(data) {
      data.targetData.node.el.setAttribute('draggable', 'true')
    },
    plugins: [
      customInsertPlugin(
        {
          insertPoint: () => {
            return createDefaultInsertPointElement()
          },
        },
        dndContext,
      ),
    ],
  })

  const rootGrid = { containerRef: formFields, items: fields }

  watch(
    () => formSchema.value,
    (nextSchema) => {
      if (nextSchema !== fields.value) {
        fields.value = [...nextSchema]
      }
    },
  )

  const dropAreaUlClass = computed(
    () => 'w-full grid grid-cols-12 gap-x-4 gap-y-2 list-none p-0 m-0 flex-1 h-fit',
  )

  // ── 根节点交互回调（交给 ContainerChildrenGrid）────────────────────────────
  const onSelectRoot = (child: FormKitSchemaFormKit, index: number) => {
    const key = (child as any)?.__key as string | undefined
    selectedTarget.value = 'field'
    state.selectedColumnIndex.value = null
    if (key) selectByKey(key)
    else selectedIndex.value = index
  }

  const onSelectBlank = () => {
    selectedTarget.value = 'form'
    selectedKey.value = null
    state.selectedColumnIndex.value = null
  }

  const onResizeEnd = () => {
    commitSchemaReconcile(fields.value as FormKitSchemaFormKit[], { reason: 'resize', merge: true })
  }

  // ── 渲染上下文（提供给容器组件）────────────────────────────────────────────
  const schemaLibrary = canvasSchemaLibrary

  const renderCanvasSchemaNode = (field: any): any => {
    if (!field || typeof field !== 'object') return field
    const next = normalizeContainerNode(field)
    return toCanvasSchemaNode(next as FormKitSchemaFormKit)
  }

  provideCanvasSchemaContext({
    library: schemaLibrary,
    renderNode: renderCanvasSchemaNode,
    updateContainerChildren,
    selectByKey,
    updateNodePropsByKey,
  })

  return {
    rootGrid: rootGrid as unknown as {
      containerRef: Ref<unknown>
      items: Ref<FormKitSchemaFormKit[]>
    },
    dropAreaUlClass,
    canvasFormClass,
    onSelectRoot,
    onSelectBlank,
    onDelete: deleteField,
    onDuplicate: duplicateField,
    onResizeEnd,
    /** 实例标识：画布根 drop-area 的 testid 后缀，保证多设计器并存时 DnD 作用域隔离 */
    instanceId: state.instanceId,
  }
}
