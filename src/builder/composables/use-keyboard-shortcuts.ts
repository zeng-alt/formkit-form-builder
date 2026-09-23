// ═══ H5：设计器键盘快捷键 ═══════════════════════════════════════════════════════
// Delete/Backspace 删除当前选中元素；Ctrl/Cmd+Z 撤销；Ctrl/Cmd+Shift+Z 与
// Ctrl/Cmd+Y 重做；Ctrl/Cmd+D 复制选中元素（并阻止浏览器默认的加书签行为）。
//
// 监听挂在设计器根元素上（BuilderMain.vue 的 @keydown），不挂 window：keydown 会
// 从任意子孙元素冒泡到这个根节点，多个设计器实例各自的根节点互不干扰，不需要
// window 单例监听器 + 手动判断"事件是否属于当前实例"。
//
// 删除/复制按 formSchema 的 __key 定位，用 utils/schema/tree.ts 的通用树工具
// （findNodeByKey/removeAtPath/insertAfterAtPath）——这些工具本来就支持任意嵌套
// 深度（容器内部的字段与根级字段用的是同一套 schema 树表示），不需要为"根级"和
// "容器内"分别写一套逻辑。
import { findNodeByKey, insertAfterAtPath, removeAtPath } from '@/utils/schema/tree'
import { collectSchemaNames, duplicateNode } from '@/utils/dnd/schema'
import { schemaChildren, type SchemaNode } from '@/utils/schema/types'
import { useFormBuilderI18n } from '@/i18n/context'
import type { FormBuilderState } from '@/state/create-form-builder-state'
import type { FormKitSchemaFormKit } from '@formkit/core'

// 焦点落在这些元素 / 弹窗里时不响应快捷键，避免打字（改名、输入内容、JS 绑定
// 代码编辑器等）时被误删/误撤销
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  // CodeMirror（JS 绑定代码编辑器）：根元素是 .cm-editor，内部实际接收键盘事件的
  // 是 contenteditable 的 .cm-content，上面那条已经覆盖，这里再兜底选择器本身
  if (target.closest('.cm-editor')) return true
  // 各类弹窗（导入导出 / 预览 / 事件绑定编辑等）：弹窗内的按键不应该穿透到画布
  if (target.closest('.n-modal, .n-drawer, [role="dialog"]')) return true
  return false
}

// 画布条目里 FormKit 字段的预览控件（不含标了 data-canvas-edit 的画布内编辑框）
function isCanvasPreviewControl(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.closest('[data-canvas-edit]')) return false
  return !!target.closest('[data-canvas-item] .formkit-outer')
}

/** 定位 path 对应的兄弟数组 + 下标（tree.ts 的 path 语义：最后一段是目标在其所在
 *  数组里的下标，前面几段逐层描述到达那个数组要经过的节点下标）。 */
function resolveParentArray(
  schema: SchemaNode[],
  path: number[],
): { arr: SchemaNode[]; index: number } | null {
  if (path.length === 0) return null
  if (path.length === 1) return { arr: schema, index: path[0]! }
  let cursor: SchemaNode | undefined = schema[path[0]!]
  for (let i = 1; i < path.length - 1; i++) {
    if (!cursor) return null
    cursor = schemaChildren(cursor)[path[i]!]
  }
  if (!cursor) return null
  return { arr: schemaChildren(cursor), index: path[path.length - 1]! }
}

// BuilderCanvas.vue 调用（BuilderThemeScope 子孙，useNotification() 能正常注入）：
// state 由调用方传入而不是这里自己 useFormBuilderState()——同一份状态，避免
// 再走一次注入。
export function useKeyboardShortcuts(state: FormBuilderState) {
  const { t } = useFormBuilderI18n()

  // 删除当前选中元素（根级或容器内嵌套均可）：删除后选中态回落到同位置的相邻
  // 元素，没有相邻元素时回落到表单设置
  const deleteSelected = () => {
    if (state.selectedTarget.value !== 'field') return
    const key = state.selectedKey.value
    if (!key) return
    const schema = state.formSchema.value as SchemaNode[]
    const found = findNodeByKey(schema, key)
    if (!found) return

    const parentInfo = resolveParentArray(schema, found.path)
    let fallbackKey: string | null = null
    if (parentInfo) {
      const remaining = parentInfo.arr.filter((_, i) => i !== parentInfo.index)
      const nextIndex = Math.min(parentInfo.index, remaining.length - 1)
      fallbackKey = remaining[nextIndex]?.__key ?? null
    }

    const nextSchema = removeAtPath(schema, found.path)
    state.commitSchemaReconcile(nextSchema as FormKitSchemaFormKit[], { reason: 'delete' })

    if (fallbackKey) {
      const stillThere = findNodeByKey(state.formSchema.value as SchemaNode[], fallbackKey)
      if (stillThere) {
        state.selectedTarget.value = 'field'
        state.selectedKey.value = fallbackKey
        state.selectedIndex.value = stillThere.rootIndex
        return
      }
    }
    state.selectedTarget.value = 'form'
    state.selectedKey.value = null
  }

  // 复制当前选中元素（根级或容器内嵌套均可），复制完成后选中新副本（H6）
  const duplicateSelected = () => {
    if (state.selectedTarget.value !== 'field') return
    const key = state.selectedKey.value
    if (!key) return
    const schema = state.formSchema.value as SchemaNode[]
    const found = findNodeByKey(schema, key)
    if (!found) return

    const existingNames = new Set<string>()
    collectSchemaNames(schema, existingNames)
    const clone = duplicateNode(found.node as FormKitSchemaFormKit, existingNames, {
      labelSuffix: t('common.copySuffix'),
    }) as SchemaNode

    const nextSchema = insertAfterAtPath(schema, found.path, clone)
    state.commitSchemaReconcile(nextSchema as FormKitSchemaFormKit[], { reason: 'duplicate' })

    const cloneKey = clone.__key
    if (!cloneKey) return
    const foundClone = findNodeByKey(state.formSchema.value as SchemaNode[], cloneKey)
    if (!foundClone) return
    state.selectedTarget.value = 'field'
    state.selectedKey.value = cloneKey
    state.selectedIndex.value = foundClone.rootIndex
  }

  const onKeydown = (e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey
    if (isEditableTarget(e.target)) {
      // 画布上的字段是预览控件，在里面打字不会保存到定义里——正常情况下点选字段时
      // CanvasGridItem.vue 的 focusin 兜底会把焦点收回条目自己身上，不会停留在这些
      // 控件里；这里的 Backspace/Delete 同等处理只是双重兜底（焦点因为某些边缘场景
      // 仍留在控件里时也能删掉）。标了 data-canvas-edit 的画布内编辑框（静态文本内联
      // 编辑、标签页/步骤改名）是真实的文本编辑，照常排除，Ctrl/Cmd 组合键正常放行。
      if (!isCanvasPreviewControl(e.target)) return
      if (!mod && e.key !== 'Delete' && e.key !== 'Backspace') return
    }

    if (!mod && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault()
      deleteSelected()
      return
    }
    if (mod && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault()
      if (e.shiftKey) state.redo()
      else state.undo()
      return
    }
    if (mod && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault()
      state.redo()
      return
    }
    if (mod && (e.key === 'd' || e.key === 'D')) {
      // 阻止浏览器默认的"添加书签"行为
      e.preventDefault()
      duplicateSelected()
      return
    }
  }

  return { onKeydown }
}
