// ═══ D0：画布命令层 ═════════════════════════════════════════════════════════════
// 工具条 / 右键菜单 / 快捷键都只调用这里的命令，不各写一套增删改逻辑。命令层直接
// 操作 formSchema（画布 schema 投影），统一走 commitSchemaReconcile 提交，保证可撤销；
// 选中态只写 selectedKey/selectedTarget，selectedKeys（多选）由 form-schema.ts 里的
// watcher 跟随同步（见该文件顶部注释），命令层大多数情况下不需要手动维护它。
import { ref } from 'vue'
import type { Ref } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { useNotification } from 'naive-ui'
import { getElementTypeDef, schemaNodeToDslNode } from '@/dsl'
import { getContainerSpec } from '@/elements/container-spec'
import { getElementDefinition, getElementTypeBySchema, createDefaultFormElements } from '@/elements'
import { useFormBuilderI18n } from '@/i18n/context'
import { findNodeByKey, updateAtPath } from '@/utils/schema/tree'
import {
  collectSchemaNames,
  duplicateNode,
  generateKey,
  generateNextFieldName,
} from '@/utils/dnd/schema'
import { schemaContainsSteps } from '@/utils/schema/steps'
import { schemaChildren, type SchemaNode } from '@/utils/schema/types'
import type { FormBuilderState } from '@/state/create-form-builder-state'
import type { FieldNode, ValidationRule } from '@/types/dsl'

// ─── 兼容类型分组（D6）──────────────────────────────────────────────────────────
const TEXT_GROUP = new Set(['text', 'textarea', 'email', 'url', 'tel', 'password', 'richText'])
const SELECT_GROUP = new Set(['select', 'radio', 'checkbox'])
const NUMBER_GROUP = new Set(['number', 'range', 'naiveRate'])
const DATE_GROUP = new Set(['date', 'time', 'naiveDateTime'])
// 开关类只有 naiveSwitch 一个成员（checkbox 的单选框形态不计入，避免与选择类混淆），
// 单成员分组没有可转换的目标，convertTargets 对它恒返回空数组
const SWITCH_GROUP = new Set(['naiveSwitch'])
const CONVERT_GROUPS: Set<string>[] = [
  TEXT_GROUP,
  SELECT_GROUP,
  NUMBER_GROUP,
  DATE_GROUP,
  SWITCH_GROUP,
]

function groupOf(type: string): Set<string> | undefined {
  return CONVERT_GROUPS.find((g) => g.has(type))
}

// 校验规则 → 支持的字段类型（数据来自 sidebar-right/validations/ValidationSection.vue
// 的同名映射；该文件不在本任务负责范围内，这里按只读数据复制一份，只用于转换类型时
// 过滤目标类型不支持的规则，两处如需新增规则请保持同步）
const VALIDATION_RULE_TYPES: Record<string, string[]> = {
  accepted: ['checkbox'],
  required: [
    'text',
    'textarea',
    'number',
    'date',
    'radio',
    'checkbox',
    'email',
    'url',
    'color',
    'time',
    'naiveDateTime',
    'file',
    'password',
    'range',
    'select',
    'naiveCascader',
    'naiveTreeSelect',
    'naiveTransfer',
    'naiveMention',
    'naiveAutoComplete',
    'naiveRate',
    'naiveSwitch',
    'tel',
  ],
  alpha: ['text', 'textarea', 'password', 'naiveAutoComplete'],
  alpha_spaces: ['text', 'textarea', 'password', 'naiveAutoComplete'],
  alphanumeric: ['text', 'textarea', 'password', 'naiveAutoComplete'],
  symbol: ['text', 'textarea', 'password', 'naiveAutoComplete'],
  contains_alpha: ['text', 'textarea', 'password', 'naiveAutoComplete'],
  contains_alphanumeric: ['text', 'textarea', 'password', 'naiveAutoComplete'],
  contains_alpha_spaces: ['text', 'textarea', 'password', 'naiveAutoComplete'],
  contains_symbol: ['text', 'textarea', 'password', 'naiveAutoComplete'],
  contains_uppercase: ['text', 'textarea', 'password', 'naiveAutoComplete'],
  contains_lowercase: ['text', 'textarea', 'password', 'naiveAutoComplete'],
  contains_numeric: ['text', 'textarea', 'password', 'naiveAutoComplete'],
  confirm: ['password', 'text'],
  email: ['text', 'email'],
  number: ['text', 'number', 'naiveRate'],
  lowercase: ['text', 'textarea', 'password', 'naiveAutoComplete'],
  uppercase: ['text', 'textarea', 'password', 'naiveAutoComplete'],
  url: ['text', 'url'],
  min: ['number', 'text', 'file', 'naiveRate'],
  max: ['number', 'text', 'file', 'naiveRate'],
  matches: ['text', 'password', 'url', 'tel'],
  starts_with: ['text', 'textarea', 'password', 'url', 'tel', 'email'],
  ends_with: ['text', 'textarea', 'password', 'url', 'tel', 'email'],
  date_after: ['date', 'naiveDateTime'],
  date_before: ['date', 'naiveDateTime'],
  date_between: ['date', 'naiveDateTime'],
  date_format: ['date', 'naiveDateTime', 'text'],
  is: ['text', 'textarea', 'password', 'url', 'tel', 'email', 'number'],
  not: ['text', 'textarea', 'password', 'url', 'tel', 'email', 'number'],
  require_one: ['checkbox', 'radio', 'select'],
  length: [
    'text',
    'textarea',
    'password',
    'url',
    'tel',
    'email',
    'naiveMention',
    'naiveAutoComplete',
    'naiveTransfer',
  ],
  between: ['number'],
}

function isValidationRuleSupported(rule: string, type: string): boolean {
  const allowed = VALIDATION_RULE_TYPES[rule]
  return !allowed || allowed.includes(type)
}

function isValueCompatible(value: unknown, targetType: string): boolean {
  if (value === undefined || value === null) return false
  if (TEXT_GROUP.has(targetType) || DATE_GROUP.has(targetType)) return typeof value === 'string'
  if (NUMBER_GROUP.has(targetType)) return typeof value === 'number'
  if (targetType === 'select' || targetType === 'radio') return typeof value === 'string'
  if (targetType === 'checkbox') return Array.isArray(value)
  if (targetType === 'naiveSwitch') return typeof value === 'boolean'
  return false
}

// ─── 容器 accepts 规则（复用拖放的限制思路，见 utils/dnd 下各容器组件的 accepts）──
const BUTTON_TYPES = new Set(['submit', 'reset', 'naiveButton'])
function isButtonNode(node: SchemaNode): boolean {
  const type = (node?.$cmp ?? node?.$formkit) as string | undefined
  return !!type && BUTTON_TYPES.has(type)
}
function isFieldNode(node: SchemaNode): boolean {
  const type = getElementTypeBySchema(node)
  return !!type && getElementDefinition(type)?.category === 'field'
}
function isStepsNode(node: SchemaNode | null | undefined): boolean {
  return node?.$cmp === 'steps' || node?.$formkit === 'steps'
}

/** 选中的节点是否可以作为粘贴/包进容器等操作的"容器目标"（直接持有可拖拽子节点数组）。
 *  tabs/steps 自身的 children 是内部 pane 结构，不能被当成普通子节点列表追加，
 *  必须选中具体的 pane（tabsPane/stepsPane 节点，通过 __paneType 标记识别）才行。 */
function isAppendableContainer(node: SchemaNode): boolean {
  const type = getElementTypeBySchema(node)
  if (type === 'tabs' || type === 'steps') return false
  if (type && getContainerSpec(type)) return true
  return typeof (node as { __paneType?: unknown }).__paneType === 'string'
}

interface AcceptResult {
  ok: boolean
  reasonKey?: string
}

/** 某个候选节点能否放进目标容器（null 表示根画布）；镜像 dnd 各容器组件的 accepts
 *  判断（按钮组只收按钮 / 列表与徽标只收一个 / 数据表格搜索区只收字段 / 步骤条
 *  全局唯一），不是照抄同一份代码，但保持规则一致。 */
function containerAcceptsNode(
  containerNode: SchemaNode | null,
  candidate: SchemaNode,
): AcceptResult {
  if (isStepsNode(candidate)) {
    if (containerNode) return { ok: false, reasonKey: 'dnd.reason.noNestedSteps' }
    return { ok: true }
  }
  if (!containerNode) return { ok: true }
  const type = getElementTypeBySchema(containerNode)
  if (type === 'buttonGroup') {
    return { ok: isButtonNode(candidate), reasonKey: 'dnd.reason.buttonGroupOnly' }
  }
  if (type === 'list' || type === 'badge') {
    return { ok: schemaChildren(containerNode).length < 1, reasonKey: 'dnd.reason.singleChildOnly' }
  }
  if (type === 'dataTable') {
    return { ok: isFieldNode(candidate), reasonKey: 'dnd.reason.searchFieldsOnly' }
  }
  return { ok: true }
}

// ─── 树路径工具（沿用 utils/schema/tree.ts 的 path 语义：-1 表示"进入 children"）──
function normalizePath(path: number[]): number[] {
  return path.filter((p) => p !== -1)
}
function nodeAtNormPath(schema: SchemaNode[], path: number[]): SchemaNode | undefined {
  if (!path.length) return undefined
  let cursor: SchemaNode | undefined = schema[path[0]!]
  for (let i = 1; i < path.length; i++) {
    if (!cursor) return undefined
    cursor = schemaChildren(cursor)[path[i]!]
  }
  return cursor
}

interface Locate {
  node: SchemaNode
  arr: SchemaNode[]
  index: number
  parentNode: SchemaNode | null
  /** 父节点自身的规范化路径（不含 -1），用于 updateAtPath 写回；根级时为 null */
  parentPath: number[] | null
}

/** 按 __key 定位节点及其所在的兄弟数组 + 父节点信息（父节点为空即根画布）。 */
function locate(schema: SchemaNode[], key: string): Locate | null {
  const found = findNodeByKey(schema, key)
  if (!found) return null
  const normPath = normalizePath(found.path)
  const isRoot = normPath.length <= 1
  const parentPath = isRoot ? null : normPath.slice(0, -1)
  const parentNode = parentPath ? (nodeAtNormPath(schema, parentPath) ?? null) : null
  const arr = parentNode ? schemaChildren(parentNode) : schema
  const index = normPath[normPath.length - 1]!
  return { node: found.node, arr, index, parentNode, parentPath }
}

/** 定位 key 所在容器的 __key（根级为 null，未找到为 undefined）：多选"同一父容器"
 *  约束、跨容器 Shift 点击判定都靠它比较。 */
function parentKeyOf(schema: SchemaNode[], key: string): string | null | undefined {
  const loc = locate(schema, key)
  if (!loc) return undefined
  return loc.parentNode?.__key ?? null
}

/** 用新的兄弟数组替换 loc 对应的父级（根级时直接返回新数组本身）。 */
function replaceSiblings(schema: SchemaNode[], loc: Locate, nextArr: SchemaNode[]): SchemaNode[] {
  if (!loc.parentNode || !loc.parentPath) return nextArr
  return updateAtPath(schema, loc.parentPath, {
    ...loc.parentNode,
    children: nextArr,
  }) as SchemaNode[]
}

/** 递归从整棵树里摘掉一批 __key（不要求同一父级，remove 需要兼容任意来源的 keys）。 */
function removeKeysFromSchema(nodes: SchemaNode[], keys: Set<string>): SchemaNode[] {
  return nodes
    .filter((n) => !(n && typeof n.__key === 'string' && keys.has(n.__key)))
    .map((n) => {
      if (!n || typeof n !== 'object') return n
      const children = schemaChildren(n)
      if (!children.length) return n
      const nextChildren = removeKeysFromSchema(children, keys)
      return nextChildren === children ? n : { ...n, children: nextChildren }
    })
}

// ─── 新建容器节点的身份化（wrapIn 专用：new key/name/id，参考 utils/dnd/schema.ts
// 的 duplicateNode 与 utils/dnd/commit.ts 的 normalizeInsertValues 对容器节点的处理，
// 这里只处理"全新节点"这一种场景，不涉及子节点递归改名）─────────────────────────
function materializeContainer(raw: SchemaNode, existingNames: Set<string>): SchemaNode {
  const nextKey = generateKey()
  const nextName = generateNextFieldName(existingNames)
  const val: SchemaNode = { ...raw }
  const spec = getContainerSpec(val.$cmp ?? val.$formkit)
  if (spec && spec.primitive === 'cmp') {
    const props: Record<string, unknown> = {
      ...val.props,
      name: nextName,
      id: `field_${nextKey}`,
      [spec.keyProp]: nextKey,
    }
    delete props.modelValue
    val.props = props
  }
  val.name = nextName
  val.id = `field_${nextKey}`
  val.__key = nextKey
  val.outerClass = val.outerClass || 'col-span-12'
  return val
}

// ─── 剪贴板（模块级单例：同一页面内多个设计器实例、CanvasGridItem 的多份命令层
// 实例共享同一份剪贴板，天然支持"同一浏览器多个标签页/多个设计器之间粘贴"里
// "同一浏览器" 这部分；跨标签页则靠下面的系统剪贴板）──────────────────────────
const CLIPBOARD_MARKER = 'formkit-form-builder/canvas-clipboard@1'
interface ClipboardPayload {
  marker: typeof CLIPBOARD_MARKER
  nodes: SchemaNode[]
}
let memoryClipboard: SchemaNode[] | null = null
const clipboardAvailable = ref(false)

function parseClipboardText(text: string | null | undefined): SchemaNode[] | null {
  if (!text) return null
  try {
    const parsed = JSON.parse(text) as Partial<ClipboardPayload>
    if (
      parsed &&
      parsed.marker === CLIPBOARD_MARKER &&
      Array.isArray(parsed.nodes) &&
      parsed.nodes.length
    ) {
      return parsed.nodes as SchemaNode[]
    }
  } catch {
    /* 系统剪贴板内容不是本应用格式，忽略 */
  }
  return null
}

async function readSystemClipboard(): Promise<SchemaNode[] | null> {
  try {
    const text = await navigator.clipboard?.readText?.()
    return parseClipboardText(text)
  } catch {
    // 权限不足 / 非安全上下文 / 浏览器不支持：静默回退内存剪贴板
    return null
  }
}

export interface CanvasCommands {
  copy: (keys: string[]) => void
  cut: (keys: string[]) => void
  paste: (targetKey?: string | null) => Promise<void>
  duplicate: (keys: string[]) => void
  remove: (keys: string[]) => void
  moveUp: (key: string) => void
  moveDown: (key: string) => void
  canMoveUp: (key: string) => boolean
  canMoveDown: (key: string) => boolean
  wrapIn: (keys: string[], containerType: 'card' | 'group' | 'collapse') => void
  convertTo: (key: string, type: string) => void
  canPaste: Ref<boolean>
  refreshCanPaste: () => Promise<void>
  canWrap: (keys: string[]) => boolean
  convertTargets: (key: string) => string[]
  /** 画布条目点击选中：处理 Shift/Ctrl(Cmd) 多选切换、跨容器回退单选。 */
  selectItem: (key: string, modifiers: { shift: boolean; multi: boolean }) => void
  /** 全选根级元素（D4 空白右键菜单项）。 */
  selectAllRoot: () => void
  /** 清空多选（Esc）：回落到无选中。 */
  clearSelection: () => void
}

export function useCanvasCommands(state: FormBuilderState): CanvasCommands {
  const { t } = useFormBuilderI18n()
  // useNotification() 要求祖先链上已经渲染了 n-notification-provider（BuilderThemeScope
  // 内部提供）；本命令层大多数调用点（CanvasGridItem / 工具条 / 右键菜单）都在那棵子树
  // 里，能正常拿到。但 use-keyboard-shortcuts.ts 是在 BuilderMain.vue 自己的 setup 里
  // 调用它——那时 BuilderThemeScope 还没挂载，提前于 provider 之前调用会直接抛错。
  // 这里用 try/catch 兜底：拿不到时降级为不提示（增删改本身照常生效，只是键盘快捷键
  // 触发的粘贴/多选被拒绝时不弹提示条，鼠标操作路径不受影响）。
  let notification: ReturnType<typeof useNotification> | null = null
  try {
    notification = useNotification()
  } catch {
    notification = null
  }

  const notify = (message: string) => {
    notification?.info({ title: message, duration: 3000 })
  }

  const schemaOf = () => state.formSchema.value as unknown as SchemaNode[]

  // ── 选中 ─────────────────────────────────────────────────────────────────────
  function selectItem(key: string, modifiers: { shift: boolean; multi: boolean }) {
    if (!key) return
    if (!modifiers.shift && !modifiers.multi) {
      state.selectedTarget.value = 'field'
      state.selectedKey.value = key
      state.selectedColumnIndex.value = null
      return
    }
    const schema = schemaOf()
    const currentKeys = state.selectedKeys.value
    const anchorKey = currentKeys[0] ?? state.selectedKey.value
    if (!anchorKey || state.selectedTarget.value !== 'field') {
      state.selectedTarget.value = 'field'
      state.selectedKey.value = key
      state.selectedColumnIndex.value = null
      return
    }
    const anchorParent = parentKeyOf(schema, anchorKey)
    const clickedParent = parentKeyOf(schema, key)
    if (
      anchorParent === undefined ||
      clickedParent === undefined ||
      anchorParent !== clickedParent
    ) {
      // 跨容器：多选只允许同一父容器下的兄弟元素，替换为新的单选并提示一次
      state.selectedTarget.value = 'field'
      state.selectedKey.value = key
      state.selectedColumnIndex.value = null
      notify(t('builder.commands.crossContainerNotice'))
      return
    }
    if (currentKeys.includes(key)) {
      const nextKeys = currentKeys.filter((k) => k !== key)
      const nextAnchor = nextKeys[nextKeys.length - 1] ?? null
      state.selectedTarget.value = nextAnchor ? 'field' : 'form'
      state.setMultiSelection(nextKeys, nextAnchor)
      state.selectedColumnIndex.value = null
      return
    }
    const nextKeys = [...currentKeys, key]
    state.selectedTarget.value = 'field'
    state.setMultiSelection(nextKeys, key)
    state.selectedColumnIndex.value = null
  }

  function selectAllRoot() {
    const schema = schemaOf()
    const keys = schema
      .map((n) => n?.__key)
      .filter((k): k is string => typeof k === 'string' && k.length > 0)
    if (!keys.length) return
    state.selectedTarget.value = 'field'
    state.setMultiSelection(keys, keys[keys.length - 1]!)
    state.selectedColumnIndex.value = null
  }

  function clearSelection() {
    state.selectedTarget.value = 'form'
    state.setMultiSelection([], null)
  }

  // ── 删除 ─────────────────────────────────────────────────────────────────────
  function remove(keys: string[], reason = 'delete') {
    const validKeys = keys.filter((k): k is string => typeof k === 'string' && !!k)
    if (!validKeys.length) return
    const schema = schemaOf()
    const keySet = new Set(validKeys)
    const primaryLoc = locate(schema, validKeys[0]!)
    let fallbackKey: string | null = null
    if (primaryLoc) {
      const remaining = primaryLoc.arr.filter((n) => !(n?.__key && keySet.has(n.__key)))
      const nextIndex = Math.min(primaryLoc.index, remaining.length - 1)
      fallbackKey = remaining[nextIndex]?.__key ?? null
    }
    const nextSchema = removeKeysFromSchema(schema, keySet)
    state.commitSchemaReconcile(nextSchema as unknown as FormKitSchemaFormKit[], { reason })
    if (fallbackKey && findNodeByKey(schemaOf(), fallbackKey)) {
      state.selectedTarget.value = 'field'
      state.selectedKey.value = fallbackKey
    } else {
      state.selectedTarget.value = 'form'
      state.selectedKey.value = null
    }
  }

  // ── 复制一份（原地在后面插入副本，H6 逻辑迁移到这里）───────────────────────────
  function duplicate(keys: string[]) {
    const validKeys = keys.filter((k): k is string => typeof k === 'string' && !!k)
    if (!validKeys.length) return
    let schema = schemaOf()
    let lastCloneKey: string | null = null
    // 多个 key 依次复制：每次都基于最新的 schema 重新定位，保证多选批量复制时
    // name 去重与插入位置都是对的（后一个副本要看到前一个副本已占用的新名字）
    for (const key of validKeys) {
      const loc = locate(schema, key)
      if (!loc) continue
      // 步骤向导全局唯一：不提供复制（这里统一兜底，工具条/右键菜单/Ctrl+D 快捷键
      // 都经这里，不需要各自记得排除）
      if (isStepsNode(loc.node)) continue
      const existingNames = new Set<string>()
      collectSchemaNames(schema, existingNames)
      const clone = duplicateNode(loc.node as FormKitSchemaFormKit, existingNames, {
        labelSuffix: t('common.copySuffix'),
      }) as SchemaNode
      const nextArr = [...loc.arr]
      nextArr.splice(loc.index + 1, 0, clone)
      schema = replaceSiblings(schema, loc, nextArr)
      lastCloneKey = clone.__key ?? null
    }
    state.commitSchemaReconcile(schema as unknown as FormKitSchemaFormKit[], {
      reason: 'duplicate',
    })
    if (lastCloneKey) {
      state.selectedTarget.value = 'field'
      state.selectedKey.value = lastCloneKey
    }
  }

  // ── 上移 / 下移（同父级内交换顺序）───────────────────────────────────────────
  function canMoveUp(key: string): boolean {
    const loc = locate(schemaOf(), key)
    return !!loc && loc.index > 0
  }
  function canMoveDown(key: string): boolean {
    const loc = locate(schemaOf(), key)
    return !!loc && loc.index < loc.arr.length - 1
  }
  function moveUp(key: string) {
    const schema = schemaOf()
    const loc = locate(schema, key)
    if (!loc || loc.index <= 0) return
    const nextArr = [...loc.arr]
    ;[nextArr[loc.index - 1], nextArr[loc.index]] = [nextArr[loc.index]!, nextArr[loc.index - 1]!]
    const nextSchema = replaceSiblings(schema, loc, nextArr)
    state.commitSchemaReconcile(nextSchema as unknown as FormKitSchemaFormKit[], {
      reason: 'reorder',
    })
  }
  function moveDown(key: string) {
    const schema = schemaOf()
    const loc = locate(schema, key)
    if (!loc || loc.index >= loc.arr.length - 1) return
    const nextArr = [...loc.arr]
    ;[nextArr[loc.index], nextArr[loc.index + 1]] = [nextArr[loc.index + 1]!, nextArr[loc.index]!]
    const nextSchema = replaceSiblings(schema, loc, nextArr)
    state.commitSchemaReconcile(nextSchema as unknown as FormKitSchemaFormKit[], {
      reason: 'reorder',
    })
  }

  // ── 复制 / 剪切 / 粘贴 ───────────────────────────────────────────────────────
  function copy(keys: string[]) {
    const validKeys = keys.filter((k): k is string => typeof k === 'string' && !!k)
    if (!validKeys.length) return
    const schema = schemaOf()
    const loc0 = locate(schema, validKeys[0]!)
    if (!loc0) return
    // 按兄弟数组里的原始顺序整理（多选可能按点击顺序传入，粘贴要还原视觉顺序）
    const keySet = new Set(validKeys)
    const orderedNodes = loc0.arr.filter((n) => n?.__key && keySet.has(n.__key))
    if (!orderedNodes.length) return
    const cloned = JSON.parse(JSON.stringify(orderedNodes)) as SchemaNode[]
    memoryClipboard = cloned
    clipboardAvailable.value = true
    try {
      const payload: ClipboardPayload = { marker: CLIPBOARD_MARKER, nodes: cloned }
      void navigator.clipboard?.writeText?.(JSON.stringify(payload))
    } catch {
      /* 系统剪贴板不可用：静默回退内存剪贴板，不打断用户操作 */
    }
  }

  function cut(keys: string[]) {
    copy(keys)
    remove(keys, 'cut')
  }

  async function refreshCanPaste() {
    const fromSystem = await readSystemClipboard()
    if (fromSystem && fromSystem.length) {
      clipboardAvailable.value = true
      return
    }
    clipboardAvailable.value = !!(memoryClipboard && memoryClipboard.length)
  }

  async function paste(targetKeyArg?: string | null) {
    const nodesRaw = (await readSystemClipboard()) ?? memoryClipboard
    if (!nodesRaw || !nodesRaw.length) return
    const schema = schemaOf()
    // 显式传 null（画布空白处右键粘贴）强制粘到根末尾，忽略当前选中；不传（快捷键
    // Ctrl/Cmd+V）才回落到当前选中，两者用 targetKeyArg === undefined 区分，
    // 不能用 ?? ——null 和 undefined 都是 nullish，会被误判成同一种情况
    const targetKey =
      targetKeyArg === undefined
        ? state.selectedTarget.value === 'field'
          ? state.selectedKey.value
          : null
        : targetKeyArg

    let containerNode: SchemaNode | null = null
    let siblings: SchemaNode[]
    let insertIndex: number
    let parentPath: number[] | null

    if (targetKey) {
      const found = findNodeByKey(schema, targetKey)
      if (found && isAppendableContainer(found.node)) {
        containerNode = found.node
        siblings = schemaChildren(found.node)
        insertIndex = siblings.length
        parentPath = normalizePath(found.path)
      } else if (found) {
        const loc = locate(schema, targetKey)
        if (!loc) return
        containerNode = loc.parentNode
        siblings = loc.arr
        insertIndex = loc.index + 1
        parentPath = loc.parentPath
      } else {
        siblings = schema
        insertIndex = schema.length
        parentPath = null
      }
    } else {
      siblings = schema
      insertIndex = schema.length
      parentPath = null
    }

    if (!containerNode && schemaContainsSteps(schema as unknown as FormKitSchemaFormKit[])) {
      notify(t('dnd.reason.stepsExclusive'))
      return
    }
    for (const n of nodesRaw) {
      const check = containerAcceptsNode(containerNode, n)
      if (!check.ok) {
        notify(t(check.reasonKey ?? 'dnd.reject.notAllowed'))
        return
      }
    }

    const existingNames = new Set<string>()
    collectSchemaNames(schema, existingNames)
    const clones = nodesRaw.map(
      (n) => duplicateNode(n as FormKitSchemaFormKit, existingNames) as SchemaNode,
    )

    const nextSiblings = [...siblings]
    nextSiblings.splice(insertIndex, 0, ...clones)

    const nextSchema: SchemaNode[] =
      containerNode && parentPath
        ? (updateAtPath(schema, parentPath, {
            ...containerNode,
            children: nextSiblings,
          }) as SchemaNode[])
        : nextSiblings

    state.commitSchemaReconcile(nextSchema as unknown as FormKitSchemaFormKit[], {
      reason: 'paste',
    })
    const lastKey = clones[clones.length - 1]?.__key
    if (lastKey) {
      state.selectedTarget.value = 'field'
      state.selectedKey.value = lastKey
    }
  }

  // ── 包进容器（D5）────────────────────────────────────────────────────────────
  function canWrap(keys: string[]): boolean {
    const validKeys = keys.filter((k): k is string => typeof k === 'string' && !!k)
    if (!validKeys.length) return false
    const schema = schemaOf()
    for (const key of validKeys) {
      const loc = locate(schema, key)
      if (!loc) return false
      if (isStepsNode(loc.node)) return false
    }
    return true
  }

  function wrapIn(keys: string[], containerType: 'card' | 'group' | 'collapse') {
    if (!canWrap(keys)) return
    const schema = schemaOf()
    const loc0 = locate(schema, keys[0]!)
    if (!loc0) return
    const keySet = new Set(keys)
    const indices = loc0.arr
      .map((n, i) => (n?.__key && keySet.has(n.__key) ? i : -1))
      .filter((i) => i >= 0)
    if (!indices.length) return
    const orderedChildren = indices.map((i) => loc0.arr[i]!)

    const existingNames = new Set<string>()
    collectSchemaNames(schema, existingNames)

    const templateNode = createDefaultFormElements(t).find(
      (n) => getElementTypeBySchema(n) === containerType,
    ) as SchemaNode | undefined
    if (!templateNode) return
    // JSON 深拷贝顺带丢掉模板节点上不可枚举的面板展示元数据（description/__paletteIcon），
    // 与真实拖入面板元素时 normalizeInsertValues 的处理方式一致
    const containerBase = JSON.parse(JSON.stringify(templateNode)) as SchemaNode
    containerBase.children = orderedChildren
    // materializeContainer 会重新生成身份键并清掉模板自带的空 props.modelValue（cmp 容器）
    const containerSchema = materializeContainer(containerBase, existingNames)
    containerSchema.children = orderedChildren

    const removedSet = new Set(indices)
    const nextSiblings = loc0.arr.filter((_, i) => !removedSet.has(i))
    nextSiblings.splice(indices[0]!, 0, containerSchema)

    const nextSchema = replaceSiblings(schema, loc0, nextSiblings)
    state.commitSchemaReconcile(nextSchema as unknown as FormKitSchemaFormKit[], { reason: 'wrap' })
    if (containerSchema.__key) {
      state.selectedTarget.value = 'field'
      state.selectedKey.value = containerSchema.__key
    }
  }

  // ── 转换类型（D6）────────────────────────────────────────────────────────────
  function convertTargets(key: string): string[] {
    const loc = locate(schemaOf(), key)
    if (!loc) return []
    const type = getElementTypeBySchema(loc.node)
    if (!type) return []
    const group = groupOf(type)
    if (!group) return []
    return [...group].filter((t2) => t2 !== type)
  }

  function convertTo(key: string, targetType: string) {
    const schema = schemaOf()
    const found = findNodeByKey(schema, key)
    if (!found) return
    const oldType = getElementTypeBySchema(found.node)
    if (!oldType) return
    const group = groupOf(oldType)
    if (!group || !group.has(targetType) || oldType === targetType) return
    const targetDef = getElementTypeDef(targetType)
    if (!targetDef) return

    const oldFormNode = schemaNodeToDslNode(found.node as FormKitSchemaFormKit) as FieldNode
    const targetDefaults = targetDef.defaults() as FieldNode

    const merged: FieldNode = {
      ...targetDefaults,
      id: oldFormNode.id,
      key: oldFormNode.key,
      name: oldFormNode.name,
      label: oldFormNode.label,
      outerClass: oldFormNode.outerClass,
      visibleIf: oldFormNode.visibleIf,
    }

    // props：帮助 / 占位符保留，其余用目标类型默认值
    const targetProps: Record<string, unknown> = { ...targetDefaults.props }
    const oldProps = (oldFormNode.props ?? {}) as Record<string, unknown>
    if (typeof oldProps.help === 'string' && oldProps.help) targetProps.help = oldProps.help
    if (typeof oldProps.placeholder === 'string' && oldProps.placeholder) {
      targetProps.placeholder = oldProps.placeholder
    }
    merged.props = Object.keys(targetProps).length ? targetProps : undefined

    // 校验规则：目标类型不支持的规则去掉
    if (oldFormNode.validation?.length) {
      const filtered = oldFormNode.validation.filter((r: ValidationRule) =>
        isValidationRuleSupported(r.rule, targetType),
      )
      if (filtered.length) merged.validation = filtered
    }

    // 选项：仅选择类之间转换才保留
    if (SELECT_GROUP.has(oldType) && SELECT_GROUP.has(targetType) && oldFormNode.options) {
      merged.options = oldFormNode.options
    }

    // 默认值：类型兼容才保留，否则用目标类型默认值（已经在 ...targetDefaults 里）
    if (isValueCompatible(oldFormNode.value, targetType)) {
      merged.value = oldFormNode.value
    }

    const nextNode = targetDef.toSchema(merged, {}) as SchemaNode
    const nextSchema = updateAtPath(schema, found.path, nextNode)
    state.commitSchemaReconcile(nextSchema as unknown as FormKitSchemaFormKit[], {
      reason: 'convert-type',
    })
    state.selectedTarget.value = 'field'
    state.selectedKey.value = key
  }

  return {
    copy,
    cut,
    paste,
    duplicate,
    remove,
    moveUp,
    moveDown,
    canMoveUp,
    canMoveDown,
    wrapIn,
    convertTo,
    canPaste: clipboardAvailable,
    refreshCanPaste,
    canWrap,
    convertTargets,
    selectItem,
    selectAllRoot,
    clearSelection,
  }
}
