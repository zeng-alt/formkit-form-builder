import { computed, watch } from 'vue'
import type { Ref } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { useDragAndDrop } from '@formkit/drag-and-drop/vue'
import { customInsertPlugin } from '@/utils/custom-insert-plugin'
import { formSchema, selectedIndex, selectedKey, selectedTarget } from '@/state/form-schema'
import { formDefinition } from '@/state/form-definition'
import { commitSchemaReconcile } from '@/composables/schema-history'
import { findNodeByKey, updateAtPath } from '@/utils/schema/tree'
import { canvasSchemaLibrary } from '@/builder/containers'
import { createDefaultInsertPointElement } from '@/utils/dnd/insert-point-element'
import { collectSchemaNames, ensureUniqueName, generateKey, toSafeName } from '@/utils/dnd/schema'
import { toCanvasSchemaNode } from '@/utils/canvas-schema'
import { normalizeContainerNode } from '@/containers/registry'
import { provideCanvasSchemaContext } from './canvas-schema-context'

// 画布（根 DropArea）组合函数：负责根级 DnD 列表 + schema 变更/选中逻辑
export function useCanvasSchema() {
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
      const base = toSafeName(node.$formkit || node.name || 'field')
      const nextName =
        node.$formkit === 'submit' ? node.name : ensureUniqueName(base, existingNames)
      const next: any =
        node.$formkit === 'submit'
          ? { ...node, __key: nextKey, outerClass: node.outerClass || 'col-span-12 pt-2' }
          : {
              ...node,
              __key: nextKey,
              name: nextName,
              id: `field_${nextKey}`,
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
  }

  // ── 根级 DnD ────────────────────────────────────────────────────────────────
  const [formFields, fields] = useDragAndDrop<FormKitSchemaFormKit>(formSchema.value, {
    group: 'form-builder',
    nativeDrag: true,
    draggingClass: 'opacity-5 bg-green-400/50',
    accepts: () => true,
    sortable: true,
    draggable: () => true,
    handleNodePointerup(data) {
      data.targetData.node.el.setAttribute('draggable', 'true')
    },
    plugins: [
      customInsertPlugin({
        insertPoint: () => {
          return createDefaultInsertPointElement()
        },
      }),
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

  const dropAreaUlClass = computed(() =>
    [
      'w-full grid grid-cols-12 gap-x-4 gap-y-2 list-none p-0 m-0 flex-1',
      fields.value.length === 0 ? 'min-h-[200px] h-full' : 'h-fit',
    ].join(' '),
  )

  // ── 根节点交互回调（交给 ContainerChildrenGrid）────────────────────────────
  const onSelectRoot = (child: FormKitSchemaFormKit, index: number) => {
    const key = (child as any)?.__key as string | undefined
    selectedTarget.value = 'field'
    if (key) selectByKey(key)
    else selectedIndex.value = index
  }

  const onSelectBlank = () => {
    selectedTarget.value = 'form'
    selectedKey.value = null
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
    onResizeEnd,
  }
}
