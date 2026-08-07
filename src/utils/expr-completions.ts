import type { Completion, CompletionSource } from '@codemirror/autocomplete'
import type { EditorView } from '@codemirror/view'

export interface ExprFieldInfo {
  name: string
  label?: string
}

let _fields: ExprFieldInfo[] = []

export function setExprFieldNames(fields: ExprFieldInfo[]) {
  _fields = [...fields]
}

const TOOLTIP_STYLE = `
  font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
  font-size: 12px;
  line-height: 1.5;
  max-width: 380px;
  padding: 6px 10px;
`

function buildFieldInfo(name: string, label?: string): HTMLElement {
  const root = document.createElement('div')
  root.setAttribute('style', `${TOOLTIP_STYLE}min-width:180px;`)

  const sig = document.createElement('div')
  sig.setAttribute('style', 'display:flex;align-items:baseline;gap:2px;margin-bottom:4px;')
  const dollar = document.createElement('span')
  dollar.setAttribute('style', 'font-weight:700;font-size:13px;color:#dcdcaa;')
  dollar.textContent = '$'
  const n = document.createElement('span')
  n.setAttribute('style', 'font-weight:700;font-size:13px;color:#9cdcfe;')
  n.textContent = name
  sig.append(dollar, n)
  root.append(sig)

  const desc = document.createElement('div')
  desc.setAttribute('style', 'font-size:11px;opacity:0.75;')
  desc.textContent = `表单字段「${label || name}」的当前值`
  root.append(desc)

  return root
}

function buildBuiltinTooltip(title: string, detail: string, desc: string): HTMLElement {
  const root = document.createElement('div')
  root.setAttribute('style', `${TOOLTIP_STYLE}min-width:220px;`)

  const sig = document.createElement('div')
  sig.setAttribute('style', 'display:flex;align-items:baseline;gap:4px;margin-bottom:6px;')
  const icon = document.createElement('span')
  icon.setAttribute('style', 'font-weight:700;font-size:13px;color:#dcdcaa;')
  icon.textContent = title
  const type = document.createElement('span')
  type.setAttribute('style', 'font-size:11px;opacity:0.55;')
  type.textContent = detail
  sig.append(icon, type)
  root.append(sig)

  if (desc) {
    const d = document.createElement('div')
    d.setAttribute(
      'style',
      'font-size:11px;opacity:0.75;padding-top:4px;border-top:1px solid var(--cm-completionInfoBorder,#444);',
    )
    d.textContent = desc
    root.append(d)
  }

  return root
}

interface BuiltinDef {
  label: string
  detail: string
  info: string
  apply?: string
  boost?: number
}

const BUILTINS: Record<string, BuiltinDef> = {
  slots: {
    label: 'slots',
    detail: '插槽对象',
    info: 'FormKit schema 插槽上下文，可通过 $slots.default 等访问模板传入的插槽内容',
    apply: '$slots',
    boost: 1,
  },
}

interface MethodDef {
  name: string
  detail: string
  info: string
  apply?: string
}

const GET_DOT_METHODS: MethodDef[] = [
  { name: 'value', detail: 'unknown', info: '节点的当前值' },
  { name: 'name', detail: 'string', info: '节点的字段名' },
  { name: 'id', detail: 'string', info: '节点的唯一标识' },
  { name: 'type', detail: 'string', info: '节点的输入类型（text / select / …）' },
  { name: 'props', detail: 'Record<string, unknown>', info: '节点的属性配置' },
  { name: 'context', detail: 'FormKitContext', info: '节点的完整上下文对象' },
  { name: 'isValid', detail: 'boolean', info: '节点当前校验是否通过' },
  { name: 'isDirty', detail: 'boolean', info: '节点值是否已被用户修改过' },
  { name: 'isComplete', detail: 'boolean', info: '节点是否已填写完成' },
  { name: 'errors', detail: 'string[]', info: '节点的错误信息数组' },
]

function buildGetMethodInfo(name: string, detail: string, desc: string): HTMLElement {
  const root = document.createElement('div')
  root.setAttribute('style', `${TOOLTIP_STYLE}min-width:240px;`)

  const sig = document.createElement('div')
  sig.setAttribute('style', 'display:flex;align-items:baseline;gap:2px;margin-bottom:4px;')
  const obj = document.createElement('span')
  obj.setAttribute('style', 'font-weight:400;font-size:13px;color:#9cdcfe;')
  obj.textContent = '$get(…).'
  const n = document.createElement('span')
  n.setAttribute('style', 'font-weight:700;font-size:13px;color:#9cdcfe;')
  n.textContent = name
  sig.append(obj, n)
  const t = document.createElement('span')
  t.setAttribute('style', 'font-size:11px;opacity:0.55;margin-left:4px;')
  t.textContent = `: ${detail}`
  sig.append(t)
  root.append(sig)

  if (desc) {
    const d = document.createElement('div')
    d.setAttribute(
      'style',
      'font-size:11px;opacity:0.75;padding-top:4px;border-top:1px solid var(--cm-completionInfoBorder,#444);',
    )
    d.textContent = desc
    root.append(d)
  }

  return root
}

export const exprCompletionsSource: CompletionSource = (context) => {
  // $get(xxx). 点成员补全
  const afterGetDot = context.matchBefore(/\$get\(.*?\)\.\s*\w*$/)
  if (afterGetDot) {
    const text = afterGetDot.text
    const dotIdx = text.lastIndexOf('.')
    const afterDot = text.slice(dotIdx + 1).trim()
    const options: Completion[] = []
    for (const m of GET_DOT_METHODS) {
      if (!m.name.startsWith(afterDot)) continue
      options.push({
        label: m.name,
        type: 'property',
        detail: m.detail,
        info: () => buildGetMethodInfo(m.name, m.detail, m.info),
        apply: m.apply,
      })
    }
    if (options.length) return { from: afterGetDot.to, options, validFor: /^\w*$/ }
    return null
  }

  // $xxx 补全 — 手动扫描光标前最近的 $ 符号
  const pos = context.pos
  const doc = context.state.doc

  let from = pos - 1
  while (from >= 0) {
    const c = doc.sliceString(from, from + 1)
    if (c === '$') break
    if (!/[\w:.]/.test(c)) return null
    from--
  }
  if (from < 0) return null

  const prefix = doc.sliceString(from + 1, pos)
  const options: Completion[] = []

  // 内置变量 / 函数
  for (const [key, def] of Object.entries(BUILTINS)) {
    if (!key.startsWith(prefix) && !ctxNameEq(key, prefix)) continue
    options.push({
      label: key,
      type: key === 'get' ? 'function' : 'keyword',
      detail: def.detail,
      info: () => buildBuiltinTooltip(`$${key === ':' ? ':' : key}`, def.detail, def.info),
      apply: def.apply,
      boost: def.boost,
    })
  }

  // 表单字段
  for (const f of _fields) {
    if (!f.name.toLowerCase().startsWith(prefix.toLowerCase())) continue
    options.push({
      label: f.name,
      type: 'variable',
      detail: f.label ? `${f.label}` : '字段',
      info: () => buildFieldInfo(f.name, f.label),
      apply: `$${f.name}`,
    })
  }

  if (options.length === 0) return null
  return {
    from,
    to: pos,
    options,
    validFor: /^[\w:.]*$/,
  }
}

/** 宽松匹配：prefix 为 "g" 时也能匹配 "get" */
function ctxNameEq(key: string, prefix: string): boolean {
  return key.toLowerCase() === prefix.toLowerCase()
}

// ─── hover ──────────────────────────────────────────────────────────────────────

const BUILTIN_HOVER_DOC = new Map(Object.entries(BUILTINS).map(([k, v]) => [k, v]))

export function exprHoverTooltipSource(
  view: EditorView,
  pos: number,
): {
  pos: number
  end: number
  above?: boolean
  create(view: EditorView): { dom: HTMLElement }
} | null {
  const doc = view.state.doc
  const line = doc.lineAt(pos)
  const lineText = line.text
  const offset = pos - line.from

  // $get(xxx).member 悬停
  const getDotRe = /\$get\(.*?\)\.(\w+)/g
  let m: RegExpExecArray | null
  while ((m = getDotRe.exec(lineText)) !== null) {
    const start = m.index
    const end = start + m[0].length
    const memberName = m[1]!
    if (offset >= start && offset <= end) {
      const method = GET_DOT_METHODS.find((x) => x.name === memberName)
      if (!method) return null
      return {
        pos: line.from + start,
        end: line.from + end,
        above: true,
        create: () => ({ dom: buildGetMethodInfo(memberName, method.detail, method.info) }),
      }
    }
  }

  // $word 悬停
  const varRe = /\$\w+/g
  while ((m = varRe.exec(lineText)) !== null) {
    const start = m.index
    const end = start + m[0].length
    if (offset >= start && offset <= end) {
      const word = m[0].slice(1)
      // 内置
      const builtin = BUILTIN_HOVER_DOC.get(word)
      if (builtin) {
        return {
          pos: line.from + start,
          end: line.from + end,
          above: true,
          create: () => ({
            dom: buildBuiltinTooltip(`$${word}`, builtin.detail, builtin.info),
          }),
        }
      }
      // 字段
      const field = _fields.find((f) => f.name === word)
      if (field) {
        return {
          pos: line.from + start,
          end: line.from + end,
          above: true,
          create: () => ({ dom: buildFieldInfo(field.name, field.label) }),
        }
      }
    }
  }

  return null
}
