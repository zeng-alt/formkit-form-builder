import type { Completion, CompletionSource } from '@codemirror/autocomplete'
import type { EditorView } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'

// ---- 类型定义 ----

interface MemberDef {
  name: string
  detail: string
  info: string
  type?: 'method' | 'property'
  apply?: string
}

interface VarInfo {
  type: string
  description: string
  members?: MemberDef[]
}

// ---- 运行时变量元数据 ----

const bindRuntimeVariables: Record<string, VarInfo> = {
  event: {
    type: 'Event',
    description: '触发事件的原始事件对象（click / input / focus / blur 等）',
    members: [
      { name: 'target', detail: 'EventTarget', type: 'property', info: '触发事件的元素' },
      { name: 'currentTarget', detail: 'EventTarget', type: 'property', info: '绑定事件处理器的元素' },
      { name: 'type', detail: 'string', type: 'property', info: '事件类型名称' },
      { name: 'clientX', detail: 'number', type: 'property', info: '鼠标相对视口 X 坐标' },
      { name: 'clientY', detail: 'number', type: 'property', info: '鼠标相对视口 Y 坐标' },
      { name: 'pageX', detail: 'number', type: 'property', info: '鼠标相对文档 X 坐标' },
      { name: 'pageY', detail: 'number', type: 'property', info: '鼠标相对文档 Y 坐标' },
      { name: 'key', detail: 'string', type: 'property', info: '按键值（键盘事件）' },
      { name: 'code', detail: 'string', type: 'property', info: '物理按键码（键盘事件）' },
      { name: 'altKey', detail: 'boolean', type: 'property', info: 'Alt 键是否按下' },
      { name: 'ctrlKey', detail: 'boolean', type: 'property', info: 'Ctrl 键是否按下' },
      { name: 'shiftKey', detail: 'boolean', type: 'property', info: 'Shift 键是否按下' },
      { name: 'data', detail: 'string | null', type: 'property', info: '输入字符（input 事件）' },
      { name: 'value', detail: 'string', type: 'property', info: '输入框当前值（input 事件）' },
      { name: 'button', detail: 'number', type: 'property', info: '按下的鼠标按钮编号' },
      { name: 'preventDefault', detail: '() => void', type: 'method', info: '阻止默认行为' },
      { name: 'stopPropagation', detail: '() => void', type: 'method', info: '阻止事件冒泡' },
    ],
  },
  form: {
    type: 'Record<string, unknown>',
    description: '当前表单数据',
  },
  id: {
    type: 'string | undefined',
    description: '表单定义 id',
  },
  version: {
    type: 'number | undefined',
    description: '表单定义 version',
  },
  $value: {
    type: 'unknown',
    description: '当前节点的值',
  },
  $node: {
    type: 'FormKitNode',
    description: '当前节点的 FormKit 节点实例',
    members: [
      { name: 'name', detail: 'string', type: 'property', info: '字段名' },
      { name: 'value', detail: 'unknown', type: 'property', info: '当前节点的值' },
      { name: 'props', detail: 'Record<string, unknown>', type: 'property', info: '节点属性配置' },
      { name: 'context', detail: 'FormKitContext', type: 'property', info: '节点上下文对象' },
      { name: 'type', detail: 'string', type: 'property', info: '输入类型（text / select / …）' },
      { name: 'id', detail: 'string', type: 'property', info: '节点唯一标识' },
      { name: 'parent', detail: 'FormKitNode | null', type: 'property', info: '父节点' },
      { name: 'children', detail: 'FormKitNode[]', type: 'property', info: '子节点数组' },
      { name: 'index', detail: 'number', type: 'property', info: '在兄弟节点中的位置' },
    ],
  },
  $name: {
    type: 'string',
    description: '当前节点的字段名（即 $node.name）',
  },
  $slots: {
    type: 'Record<string, Slot>',
    description: '节点插槽',
  },
  attrs: {
    type: 'Record<string, unknown>',
    description: '当前节点的全部配置',
  },
  ctx: {
    type: '{ event, form, attrs, $value, $node, $name, $get, $slots }',
    description: '以上参数的合并上下文对象',
    members: [
      { name: 'event', detail: 'Event', type: 'property', info: '触发事件的事件对象' },
      { name: 'form', detail: 'Record<string, unknown>', type: 'property', info: '当前表单数据' },
      { name: 'attrs', detail: 'Record<string, unknown>', type: 'property', info: '当前节点配置' },
      { name: '$value', detail: 'unknown', type: 'property', info: '当前节点的值' },
      { name: '$node', detail: 'FormKitNode', type: 'property', info: '当前节点的 FormKit 节点实例' },
      { name: '$name', detail: 'string', type: 'property', info: '当前节点的字段名' },
      { name: '$get', detail: '(name: string) => unknown', type: 'method', info: '按字段名取任意字段的当前值' },
      { name: '$slots', detail: 'Record<string, Slot>', type: 'property', info: '节点插槽' },
    ],
  },
  extra: {
    type: 'Record<string, unknown>',
    description: '额外传入的数据',
  },
  axios: {
    type: 'AxiosInstance',
    description: 'HTTP 请求库',
    members: [
      { name: 'request', detail: '(config) => Promise', type: 'method', info: '通用请求方法' },
      { name: 'get', detail: '(url, config?) => Promise', type: 'method', info: 'GET 请求' },
      { name: 'delete', detail: '(url, config?) => Promise', type: 'method', info: 'DELETE 请求' },
      { name: 'head', detail: '(url, config?) => Promise', type: 'method', info: 'HEAD 请求' },
      { name: 'options', detail: '(url, config?) => Promise', type: 'method', info: 'OPTIONS 请求' },
      { name: 'post', detail: '(url, data?, config?) => Promise', type: 'method', info: 'POST 请求' },
      { name: 'put', detail: '(url, data?, config?) => Promise', type: 'method', info: 'PUT 请求' },
      { name: 'patch', detail: '(url, data?, config?) => Promise', type: 'method', info: 'PATCH 请求' },
      { name: 'getUri', detail: '(config?) => string', type: 'method', info: '获取完整 URL' },
      { name: 'defaults', detail: 'AxiosDefaults', type: 'property', info: '全局默认配置' },
      { name: 'interceptors', detail: 'InterceptorManager', type: 'property', info: '拦截器管理器' },
    ],
  },
}

const bindRuntimeNames = new Set(Object.keys(bindRuntimeVariables))

// ---- 表单字段名（动态注入，供 form.xxx 补全） ----

let _formFieldNames: string[] = []

export function setFormFieldNames(names: string[]) {
  _formFieldNames = [...names]
}

// ---- 工具函数 ----

/** 将方法签名转换为 snippet apply 串，如 get(url) → get('${1:url}') */
function methodSnippet(name: string, detail: string): string | undefined {
  const match = detail.match(/^\(([^)]*)\)/)
  if (!match) return undefined
  const paramsStr = match[1]!.trim()
  if (!paramsStr) return `${name}()`
  const params = paramsStr.split(',').map((p) => p.trim()).filter(Boolean)
  const placeholders = params.map((p, i) => {
    const paramName = p.replace(/[:?].*$/, '').trim()
    return `\${${i + 1}:${paramName}}`
  })
  return `${name}(${placeholders.join(', ')})`
}

/** 点成员补全信息弹窗 */
function buildMemberInfoDom(parent: string, member: MemberDef): HTMLElement {
  const root = document.createElement('div')
  root.setAttribute('style', `${TOOLTIP_STYLE}min-width:240px;`)

  // 签名行
  const sig = document.createElement('div')
  sig.setAttribute('style', 'display:flex;align-items:baseline;gap:2px;margin-bottom:6px;')
  const icon = document.createElement('span')
  icon.setAttribute('style', 'width:16px;font-size:10px;text-align:center;flex-shrink:0;')
  icon.textContent = member.type === 'method' ? 'fn' : 'P'
  icon.style.color = member.type === 'method' ? '#dcdcaa' : '#9cdcfe'
  const objSpan = document.createElement('span')
  objSpan.setAttribute('style', 'font-weight:400;font-size:13px;color:#9cdcfe;')
  objSpan.textContent = `${parent}.`
  const nameSpan = document.createElement('span')
  nameSpan.setAttribute('style', 'font-weight:700;font-size:13px;color:#dcdcaa;')
  nameSpan.textContent = member.name
  const sigTail = document.createElement('span')
  sigTail.setAttribute('style', 'font-size:11px;opacity:0.55;margin-left:2px;')
  sigTail.textContent = member.detail
  sig.append(icon, objSpan, nameSpan, sigTail)
  root.append(sig)

  // 描述
  if (member.info) {
    const desc = document.createElement('div')
    desc.setAttribute('style', `${TOOLTIP_DESC}font-size:11px;opacity:0.75;`)
    desc.textContent = member.info
    root.append(desc)
  }

  return root
}

// ---- 补全信息弹窗渲染 ----

const TOOLTIP_STYLE = `
  font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
  font-size: 12px;
  line-height: 1.5;
  max-width: 380px;
  padding: 8px 10px;
`
const TOOLTIP_HEADER = `
  display:flex;align-items:baseline;gap:6px;margin-bottom:6px;
`
const TOOLTIP_TITLE = `
  font-weight:700;font-size:13px;color:var(--cm-completionInfoTitle,#569cd6);
`
const TOOLTIP_TYPE = `
  font-size:11px;opacity:0.7;color:var(--cm-completionInfoType,#aaa);
`
const TOOLTIP_DESC = `
  margin-top:0;padding:4px 0 0;border-top:1px solid var(--cm-completionInfoBorder,#444);
  font-size:11px;opacity:0.85;color:var(--cm-completionInfoDesc,#ccc);white-space:pre-wrap;
`

function renderInfoPanel(name: string, info: VarInfo): HTMLElement {
  const root = document.createElement('div')
  root.setAttribute('style', TOOLTIP_STYLE)

  // 头部：名称 + 类型
  const header = document.createElement('div')
  header.setAttribute('style', TOOLTIP_HEADER)
  const title = document.createElement('span')
  title.setAttribute('style', TOOLTIP_TITLE)
  title.textContent = name
  const typeBadge = document.createElement('span')
  typeBadge.setAttribute('style', TOOLTIP_TYPE)
  typeBadge.textContent = `: ${info.type}`
  header.append(title, typeBadge)
  root.append(header)

  // 描述
  if (info.description) {
    const desc = document.createElement('div')
    desc.setAttribute('style', TOOLTIP_DESC)
    desc.textContent = info.description
    root.append(desc)
  }

  // 成员列表
  if (info.members?.length) {
    const list = document.createElement('div')
    list.setAttribute(
      'style',
      'margin-top:6px;padding-top:4px;border-top:1px solid var(--cm-completionInfoBorder,#444);',
    )
    for (const m of info.members) {
      const row = document.createElement('div')
      row.setAttribute('style', 'display:flex;align-items:baseline;gap:4px;padding:1px 0;')
      const icon = document.createElement('span')
      icon.setAttribute('style', `width:14px;font-size:10px;text-align:center;color:${m.type === 'method' ? '#dcdcaa' : '#9cdcfe'};flex-shrink:0;`)
      icon.textContent = m.type === 'method' ? 'fn' : 'P'
      const memberName = document.createElement('code')
      memberName.setAttribute('style', 'font-weight:600;font-size:12px;color:var(--cm-completionInfoMember,#e06c75);')
      memberName.textContent = m.name
      const memberDetail = document.createElement('span')
      memberDetail.setAttribute('style', 'font-size:11px;opacity:0.55;color:var(--cm-completionInfoMemberDetail,#999);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;')
      memberDetail.textContent = m.detail
      row.append(icon, memberName, memberDetail)
      list.append(row)
    }
    root.append(list)
  }

  return root
}

function buildInfoDom(info: VarInfo): HTMLElement {
  const root = document.createElement('div')
  root.setAttribute('style', TOOLTIP_STYLE)
  root.setAttribute('style', `${TOOLTIP_STYLE}min-width:260px;`)

  const typeRow = document.createElement('div')
  typeRow.setAttribute('style', 'font-weight:600;margin-bottom:2px;')
  typeRow.textContent = info.type
  root.append(typeRow)

  const desc = document.createElement('div')
  desc.setAttribute('style', 'font-size:11px;opacity:0.75;margin-bottom:6px;color:var(--cm-completionInfoDesc,#aaa);')
  desc.textContent = info.description
  root.append(desc)

  if (info.members?.length) {
    const list = document.createElement('div')
    list.setAttribute('style', 'padding-top:4px;border-top:1px solid var(--cm-completionInfoBorder,#444);')
    for (const m of info.members) {
      const row = document.createElement('div')
      row.setAttribute('style', 'display:flex;align-items:baseline;gap:4px;padding:1px 0;')
      const memberName = document.createElement('code')
      memberName.setAttribute('style', 'font-weight:600;font-size:11px;color:#e06c75;')
      memberName.textContent = m.name
      const memberDetail = document.createElement('span')
      memberDetail.setAttribute('style', 'font-size:10px;opacity:0.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;')
      memberDetail.textContent = m.detail
      row.append(memberName, memberDetail)
      list.append(row)
    }
    root.append(list)
  }

  return root
}

// ---- CompletionSource ----

export const bindRuntimeCompletionsSource: CompletionSource = (context) => {
  // 优先检测点成员补全（支持 $ 前缀变量，如 $node. / axios. / event. / form.）
  const beforeDot = context.matchBefore(/(\$?\w+)\.\s*/)
  if (beforeDot) {
    const raw = beforeDot.text
    const dotIdx = raw.lastIndexOf('.')
    const objectName = raw.slice(0, dotIdx)
    const afterDot = raw.slice(dotIdx + 1).trim()

    // form.xxx —— 动态字段名补全
    if (objectName === 'form' && _formFieldNames.length > 0) {
      const options: Completion[] = []
      const lowerAfter = afterDot.toLowerCase()
      for (const name of _formFieldNames) {
        if (!name.toLowerCase().startsWith(lowerAfter)) continue
        options.push({
          label: name,
          type: 'property',
          detail: 'unknown',
          info: () => {
            const div = document.createElement('div')
            div.setAttribute('style', `${TOOLTIP_STYLE}min-width:200px;`)
            const sig = document.createElement('div')
            sig.setAttribute('style', 'display:flex;align-items:baseline;gap:2px;margin-bottom:6px;')
            const obj = document.createElement('span')
            obj.setAttribute('style', 'font-weight:400;font-size:13px;color:#9cdcfe;')
            obj.textContent = 'form.'
            const n = document.createElement('span')
            n.setAttribute('style', 'font-weight:700;font-size:13px;color:#9cdcfe;')
            n.textContent = name
            sig.append(obj, n)
            div.append(sig)
            const desc = document.createElement('div')
            desc.setAttribute('style', `${TOOLTIP_DESC}font-size:11px;opacity:0.75;`)
            desc.textContent = `表单字段「${name}」的当前值`
            div.append(desc)
            return div
          },
        })
      }
      if (options.length > 0) {
        return { from: beforeDot.to, options, validFor: /^\w*$/ }
      }
      return null
    }

    const info = bindRuntimeVariables[objectName]
    if (info?.members?.length) {
      const options: Completion[] = []
      for (const m of info.members) {
        if (!m.name.startsWith(afterDot)) continue
        options.push({
          label: m.name,
          type: m.type ?? 'property',
          detail: m.detail,
          info: () => buildMemberInfoDom(objectName, m),
          apply: m.type === 'method' ? methodSnippet(m.name, m.detail) : undefined,
        })
      }
      if (options.length > 0) {
        return { from: beforeDot.to, options, validFor: /^\w*$/ }
      }
    }
    // 即使没有匹配成员，也消费这个 dot 上下文避免 Fallback 到全局补全
    return null
  }

  // 全局变量补全
  const word = context.matchBefore(/\$?\w*/)
  if (!word || (word.from === word.to && !context.explicit)) return null

  const options: Completion[] = []

  for (const [name, info] of Object.entries(bindRuntimeVariables)) {
    if (!name.startsWith(word.text)) continue
    options.push({
      label: name,
      type: info.members?.length ? 'class' : 'variable',
      detail: info.type,
      info: () => renderInfoPanel(name, info),
    })
  }

  // $get 特殊补全（函数 + snippet）
  if ('$get'.startsWith(word.text)) {
    options.push({
      label: '$get',
      type: 'function',
      detail: '(name: string) => unknown',
      info: '按字段名取任意字段的当前值',
      apply: '$get(\'$1\')',
    })
  }

  if (options.length === 0) return null
  return { from: word.from, options, validFor: /^\$?\w*$/ }
}

// ---- hoverTooltip 源 ----

export function bindRuntimeHoverTooltipSource(
  view: EditorView,
  pos: number,
): { pos: number; end: number; above?: boolean; create(view: EditorView): { dom: HTMLElement } } | null {
  const tree = syntaxTree(view.state)
  const node = tree.resolveInner(pos, -1)
  if (!node) return null
  const doc = view.state.doc.sliceString(0)

  // 属性访问：obj.prop
  const parent = node.parent
  if (
    parent?.name === 'MemberExpression' &&
    node.name === 'PropertyName'
  ) {
    const obj = parent.firstChild
    const objName = obj && doc.slice(obj.from, obj.to)
    const propName = doc.slice(node.from, node.to)
    if (!objName || !propName) return null

    // form.xxx 动态字段悬停
    if (objName === 'form' && _formFieldNames.includes(propName)) {
      return {
        pos: parent.from,
        end: parent.to,
        above: true,
        create: () => ({
          dom: (() => {
            const div = document.createElement('div')
            div.setAttribute('style', `${TOOLTIP_STYLE}min-width:200px;`)
            const sig = document.createElement('div')
            sig.setAttribute('style', 'display:flex;align-items:baseline;gap:2px;margin-bottom:6px;')
            const o = document.createElement('span')
            o.setAttribute('style', 'font-weight:400;font-size:13px;color:#9cdcfe;')
            o.textContent = 'form.'
            const n = document.createElement('span')
            n.setAttribute('style', 'font-weight:700;font-size:13px;color:#9cdcfe;')
            n.textContent = propName
            sig.append(o, n)
            const t = document.createElement('span')
            t.setAttribute('style', 'font-size:11px;opacity:0.55;margin-left:4px;')
            t.textContent = ': unknown'
            sig.append(t)
            div.append(sig)
            const desc = document.createElement('div')
            desc.setAttribute('style', `${TOOLTIP_DESC}font-size:11px;opacity:0.75;`)
            desc.textContent = `表单字段「${propName}」的当前值`
            div.append(desc)
            return div
          })(),
        }),
      }
    }

    if (objName && bindRuntimeNames.has(objName)) {
      const varInfo = bindRuntimeVariables[objName]
      const member = varInfo?.members?.find((m) => m.name === propName)
      if (member) {
        return {
          pos: parent.from,
          end: parent.to,
          above: true,
          create: () => ({
            dom: buildMemberTooltip(objName, member),
          }),
        }
      }
    }
    return null
  }

  // 顶层变量名
  if (node.name === 'VariableName' || node.name === 'VariableDefinition') {
    const name = doc.slice(node.from, node.to)
    if (!bindRuntimeNames.has(name)) return null
    const info = bindRuntimeVariables[name]
    if (!info) return null
    return {
      pos: node.from,
      end: node.to,
      above: true,
      create: () => ({ dom: buildInfoDom(info) }),
    }
  }

  return null
}

function buildMemberTooltip(objName: string, member: MemberDef): HTMLElement {
  const root = document.createElement('div')
  root.setAttribute('style', `${TOOLTIP_STYLE}min-width:240px;`)

  const sig = document.createElement('div')
  sig.setAttribute('style', 'display:flex;align-items:baseline;gap:2px;margin-bottom:6px;')
  const icon = document.createElement('span')
  icon.setAttribute('style', 'width:16px;font-size:10px;text-align:center;flex-shrink:0;')
  icon.textContent = member.type === 'method' ? 'fn' : 'P'
  icon.style.color = member.type === 'method' ? '#dcdcaa' : '#9cdcfe'
  const objSpan = document.createElement('span')
  objSpan.setAttribute('style', 'font-weight:400;font-size:13px;color:#9cdcfe;')
  objSpan.textContent = `${objName}.`
  const nameSpan = document.createElement('span')
  nameSpan.setAttribute('style', 'font-weight:700;font-size:13px;color:#dcdcaa;')
  nameSpan.textContent = member.name
  const sigTail = document.createElement('span')
  sigTail.setAttribute('style', 'font-size:11px;opacity:0.55;margin-left:2px;')
  sigTail.textContent = member.detail
  sig.append(icon, objSpan, nameSpan, sigTail)
  root.append(sig)

  if (member.info) {
    const desc = document.createElement('div')
    desc.setAttribute('style', `${TOOLTIP_DESC}font-size:11px;opacity:0.75;`)
    desc.textContent = member.info
    root.append(desc)
  }

  return root
}
