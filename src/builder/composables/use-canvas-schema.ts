import { computed, watch } from 'vue'
import type { Ref } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { useDragAndDrop } from '@formkit/drag-and-drop/vue'
import { useNotification } from 'naive-ui'
import { customInsertPlugin } from '@/utils/custom-insert-plugin'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useFormBuilderI18n } from '@/i18n/context'
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
import { toCanvasSchemaNode, getCanvasSchemaArray } from '@/utils/canvas-schema'
import { normalizeContainerNode } from '@/elements/canvas'
import { provideCanvasSchemaContext } from './canvas-schema-context'
import { CANVAS_DRAGGING_CLASS, CANVAS_DROP_ZONE_CLASS } from '@/utils/dnd/drag-classes'
import { schemaContainsSteps } from '@/utils/schema/steps'
import { schemaChildren, type SchemaNode } from '@/utils/schema/types'
import { formLabelLayoutClass } from '@/utils/form-layout'

// 画布渲染管线：容器规范化 + 画布专用改写。模块级常量，作为 getCanvasSchemaArray
// 的缓存分桶键必须保持引用稳定
const computeCanvasSchemaNode = (node: unknown): unknown =>
  toCanvasSchemaNode(normalizeContainerNode(node) as FormKitSchemaFormKit)

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

  const { t } = useFormBuilderI18n()
  const notification = useNotification()

  // ── 画布表单样式：与 FormRenderer 运行时共用同一套标签布局类（见 utils/form-layout） ──
  const canvasFormClass = computed(() =>
    formLabelLayoutClass(formDefinition.value?.settings?.labelAlign),
  )

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
    collectSchemaNames(formSchema.value, existingNames)
    const clone = duplicateNode(source, existingNames, { labelSuffix: t('common.copySuffix') })
    const next = [...fields.value]
    next.splice(index + 1, 0, clone)
    fields.value = next
    commitSchemaReconcile(next as FormKitSchemaFormKit[], { reason: 'duplicate' })
    // H6：复制完成后选中新副本（selectByKey 定义在下方，运行时调用时已可用）
    const cloneKey = (clone as { __key?: string }).__key
    if (cloneKey) selectByKey(cloneKey)
  }

  // ── 更新容器子节点（拖拽进出容器后写回 schema）──────────────────────────────
  const updateContainerChildren = (containerKey: string, children: FormKitSchemaFormKit[]) => {
    const currentFound = findNodeByKey(formSchema.value, containerKey)
    if (!currentFound) return
    const existingNames = new Set<string>()
    collectSchemaNames(formSchema.value, existingNames)

    // 纯函数：不改动传入节点（可能来自缓存投影的共享引用），有变化时返回新对象
    const ensureIdentity = (input: SchemaNode): SchemaNode => {
      if (!input || typeof input !== 'object') return input
      let node = input
      if (node.$formkit === 'submit' && Array.isArray(node.children)) {
        const rest: SchemaNode = { ...node }
        delete rest.children
        node = rest
      }
      if (typeof node.__key === 'string' && node.__key) {
        if (Array.isArray(node.children))
          return { ...node, children: schemaChildren(node).map((c) => ensureIdentity(c)) }
        return node
      }
      const nextKey = generateKey()
      const nextName = node.$formkit === 'submit' ? node.name : generateNextFieldName(existingNames)
      const next: SchemaNode =
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
        next.children = schemaChildren(node).map((c) => ensureIdentity(c))
      return next
    }
    const normalizedChildren = children.map((c) => ensureIdentity(c))

    const childKeys = new Set<string>()
    const collectKeys = (nodes: SchemaNode[]) => {
      for (const n of nodes) {
        const k = n?.__key
        if (typeof k === 'string' && k) childKeys.add(k)
        collectKeys(schemaChildren(n))
      }
    }
    collectKeys(normalizedChildren)

    // 从全树剪掉已移动进容器的节点（避免同节点同时出现在容器内外）
    const prune = (nodes: SchemaNode[]): SchemaNode[] => {
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
          const c = node.children
          if (!Array.isArray(c)) return node
          const nextChildren = prune(schemaChildren(node))
          return { ...node, children: nextChildren }
        })
    }

    const prunedSchema = prune(formSchema.value)
    const found = findNodeByKey(prunedSchema, containerKey)
    if (!found) return
    const merged: SchemaNode = { ...found.node, children: normalizedChildren }
    if (merged.$cmp) {
      merged.props = { ...merged.props }
      if (merged.props && typeof merged.props === 'object') delete merged.props.modelValue
    }
    const nextSchema = updateAtPath(prunedSchema, found.path, merged)
    commitSchemaReconcile(nextSchema as FormKitSchemaFormKit[], {
      reason: 'container-children',
      merge: true,
    })
  }

  // ── 选中 ─────────────────────────────────────────────────────────────────────
  const selectByKey = (key: string) => {
    const found = findNodeByKey(formSchema.value, key)
    if (!found) return
    selectedTarget.value = 'field'
    selectedIndex.value = found.rootIndex
    selectedKey.value = key
    // 选中普通节点即退出列编辑态
    state.selectedColumnIndex.value = null
  }

  // ── 画布内联编辑写回（静态元素 text 内容等）─────────────────────────────────
  const updateNodePropsByKey = (key: string, props: Record<string, unknown>) => {
    const found = findNodeByKey(formSchema.value, key)
    if (!found) return
    const node: SchemaNode = { ...found.node }
    node.props = { ...node.props, ...props }
    const nextSchema = updateAtPath(formSchema.value, found.path, node)
    commitSchemaReconcile(nextSchema as FormKitSchemaFormKit[], {
      reason: 'inline-edit',
      merge: true,
    })
  }

  // ── 根级 DnD ────────────────────────────────────────────────────────────────
  // 根 drop-area 的 DnD 上下文：提交 / 插入定位绑定到本画布实例。
  const dndContext: DndContext = {
    formSchema: state.formSchema,
    commitSchemaReconcile: state.commitSchemaReconcile,
    // H8：拖入步骤条时把根画布已有内容整体收纳进第一步是有意设计，但用户容易
    // 以为内容丢了——commit.ts 在真的发生这次收纳时调用这里弹一条提示
    notifyStepsConsolidate: () => {
      notification.info({ title: t('builder.stepsConsolidateNotice'), duration: 4000 })
    },
  }
  // 拷贝初始值：formSchema.value 是 dslToSchema 的缓存投影，直接交给 DnD 库、库内部
  // 原地改写数组会污染缓存（数组本身不缓存，但传引用等于把它当成可写数组用了）
  const [formFields, fields] = useDragAndDrop<FormKitSchemaFormKit>([...formSchema.value], {
    group: 'form-builder',
    nativeDrag: true,
    draggingClass: CANVAS_DRAGGING_CLASS,
    dropZoneClass: CANVAS_DROP_ZONE_CLASS,
    // 步骤向导存在时根画布独占拖放区：元素只能拖进 step 内部，根不再作为 drop target
    accepts: () => !schemaContainsSteps(formSchema.value),
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
  const onSelectRoot = (child: SchemaNode, index: number) => {
    const key = child?.__key
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

  // 按源节点身份缓存渲染结果的单元素数组：同一个源节点（dslToSchema 缓存命中时引用
  // 不变）每次拿到同一个数组，FormKitSchema 的 schema prop 保持 === 不变，Vue 才能
  // 跳过未改动字段的重渲染。normalizeContainerNode / toCanvasSchemaNode 都是 field
  // 的纯函数（只读 field 本身与模块级注册表，不读其它外部可变状态）。
  const renderCanvasSchemaNode = (field: any): unknown[] =>
    getCanvasSchemaArray(field, computeCanvasSchemaNode)

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
