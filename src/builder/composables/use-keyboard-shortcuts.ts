// ═══ H5 / D0：设计器键盘快捷键 ══════════════════════════════════════════════════
// Delete/Backspace 删除当前选中元素（含多选）；Ctrl/Cmd+Z 撤销；Ctrl/Cmd+Shift+Z 与
// Ctrl/Cmd+Y 重做；Ctrl/Cmd+D 复制选中元素；Ctrl/Cmd+C/X/V 复制/剪切/粘贴；
// Esc 清空多选（并阻止浏览器默认的加书签 / 地址栏聚焦等行为）。
//
// 监听挂在设计器根元素上（BuilderMain.vue 的 @keydown），不挂 window：keydown 会
// 从任意子孙元素冒泡到这个根节点，多个设计器实例各自的根节点互不干扰，不需要
// window 单例监听器 + 手动判断"事件是否属于当前实例"。
//
// 删除 / 复制一份 / 剪切 / 粘贴等增删改逻辑统一委托给 use-canvas-commands.ts
// （D0 命令层）：工具条、右键菜单与这里的快捷键调用同一份实现，不再各写一套。
// 数据表格列删除是唯一的例外——列不是树节点，走 props.columns，不经命令层。
import { findNodeByKey, updateAtPath } from '@/utils/schema/tree'
import { type SchemaNode } from '@/utils/schema/types'
import { getElementTypeBySchema } from '@/elements'
import { useCanvasCommands } from './use-canvas-commands'
import type { FormBuilderState } from '@/state/create-form-builder-state'
import type { FormKitSchemaFormKit } from '@formkit/core'
import type { DataTableColumn } from '@/components/ui/containers/data-table/types'

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

// 真正接收文字输入的元素：Backspace/Delete/Ctrl+Z 在里面有原生含义（删字、撤销输入），
// 不能被快捷键抢走
const NON_TEXT_INPUT_TYPES = new Set([
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'range',
  'color',
  'file',
  'image',
])
function isTextEntry(target: HTMLElement): boolean {
  if (target.isContentEditable || target.tagName === 'TEXTAREA') return true
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUT_TYPES.has(target.type)
  return false
}

// 画布条目里 FormKit 字段的非文本预览控件（复选框、单选、滑块等；不含标了
// data-canvas-edit 的画布内编辑框）：这些控件对 Backspace/Delete 没有原生用途，
// 焦点停在上面时快捷键照常生效
function isCanvasNonTextControl(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (isTextEntry(target)) return false
  if (target.closest('[data-canvas-edit]')) return false
  return !!target.closest('[data-canvas-item] .formkit-outer')
}

// BuilderMain.vue 调用（BuilderThemeScope 子孙，useNotification() 能正常注入）：
// state 由调用方传入而不是这里自己 useFormBuilderState()——同一份状态，避免
// 再走一次注入。
export function useKeyboardShortcuts(state: FormBuilderState) {
  const commands = useCanvasCommands(state)

  // 数据表格选中列时优先删该列（列不是树节点，走 props.columns，不走通用的树删除）：
  // 命中返回 true，未命中（未选中列 / 选中节点不是数据表格）返回 false 交给
  // deleteSelected 走原逻辑。删除后选中态落到同位置的相邻列，没有列了则清空列选中
  // （selectedColumnIndex = null）但仍选中该表格。
  const deleteSelectedColumn = (): boolean => {
    if (state.selectedTarget.value !== 'field') return false
    const colIdx = state.selectedColumnIndex.value
    if (colIdx === null) return false
    const key = state.selectedKey.value
    if (!key) return false
    const schema = state.formSchema.value as SchemaNode[]
    const found = findNodeByKey(schema, key)
    if (!found) return false
    if (getElementTypeBySchema(found.node) !== 'dataTable') return false

    const cols = Array.isArray(found.node.props?.columns)
      ? [...(found.node.props.columns as DataTableColumn[])]
      : []
    if (colIdx < 0 || colIdx >= cols.length) return false

    const nextCols = cols.filter((_, i) => i !== colIdx)
    const node: SchemaNode = {
      ...found.node,
      props: { ...found.node.props, columns: nextCols.length ? nextCols : undefined },
    }
    const nextSchema = updateAtPath(schema, found.path, node)
    state.commitSchemaReconcile(nextSchema as FormKitSchemaFormKit[], {
      reason: 'delete-column',
      merge: true,
    })
    state.selectedColumnIndex.value = nextCols.length ? Math.min(colIdx, nextCols.length - 1) : null
    return true
  }

  // 当前选中的 key 列表：selectedKeys 由 state 自动跟随 selectedKey 同步（单选时
  // 恒为 [selectedKey]），target 不是 'field' 时视为没有可操作的画布选中
  const currentKeys = (): string[] =>
    state.selectedTarget.value === 'field' ? state.selectedKeys.value : []

  const onKeydown = (e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey
    // 画布字段控件可以正常交互：焦点在文本输入框里时按键交给输入框本身（删字、撤销
    // 输入）；要删除元素，点字段标签或条目空白处选中（焦点落在条目上）再按
    // Backspace/Delete。复选框、滑块等非文本控件没有删字的用途，快捷键照常生效。
    if (isEditableTarget(e.target) && !isCanvasNonTextControl(e.target)) return

    if (!mod && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault()
      if (deleteSelectedColumn()) return
      const keys = currentKeys()
      if (keys.length) commands.remove(keys)
      return
    }
    if (e.key === 'Escape' && state.selectedKeys.value.length > 1) {
      // 只处理"清空多选"这一件事：单选 / 未选中时放行，交给其它 Escape 处理逻辑
      // （如弹窗关闭）
      e.preventDefault()
      commands.clearSelection()
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
      const keys = currentKeys()
      if (keys.length) commands.duplicate(keys)
      return
    }
    if (mod && (e.key === 'c' || e.key === 'C')) {
      const keys = currentKeys()
      if (!keys.length) return
      e.preventDefault()
      commands.copy(keys)
      return
    }
    if (mod && (e.key === 'x' || e.key === 'X')) {
      const keys = currentKeys()
      if (!keys.length) return
      e.preventDefault()
      commands.cut(keys)
      return
    }
    if (mod && (e.key === 'v' || e.key === 'V')) {
      e.preventDefault()
      void commands.paste()
      return
    }
  }

  return { onKeydown }
}
