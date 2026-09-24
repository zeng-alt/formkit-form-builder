// ═══ 富文本内容清洗（纯函数）═════════════════════════════════════════════════════
// richText 字段的值是用户可编辑的 HTML 字符串：编辑时输入/粘贴、只读展示 v-html 之前
// 都必须先过一遍这里，避免脚本注入或格式失控。策略：
//   - 白名单标签原样保留（清空除 a.href 外的全部属性）；
//   - 不在白名单但也不危险的标签（如粘贴自 Word/网页的 div/span/font）"拆包"——
//     去掉标签本身，保留其子内容；
//   - 危险/无意义的标签（script/style/iframe 等）连同其内容一并丢弃。
// 用 DOMParser 解析，不依赖任何第三方净化库。

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
])

// 内容本身就不该展示为文字的标签：连同子内容一起丢弃（而不是拆包保留文字）
const DROP_WITH_CONTENT = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'svg',
  'head',
  'title',
  'noscript',
  'template',
])

const VOID_TAGS = new Set(['br'])

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/"/g, '&quot;')
}

/** 链接地址白名单：仅 http/https/mailto，其余（含 javascript: 等危险协议）一律丢弃 */
function sanitizeHref(raw: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed
  return null
}

function serializeChildren(node: ParentNode): string {
  let out = ''
  node.childNodes.forEach((child) => {
    out += serializeNode(child)
  })
  return out
}

function serializeNode(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent ?? '')
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  if (DROP_WITH_CONTENT.has(tag)) return ''
  if (!ALLOWED_TAGS.has(tag)) return serializeChildren(el)
  if (VOID_TAGS.has(tag)) return `<${tag}>`
  if (tag === 'a') {
    const href = sanitizeHref(el.getAttribute('href'))
    const inner = serializeChildren(el)
    // 无合法 href：链接本身也失去意义，拆包只保留文字
    if (!href) return inner
    return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
  }
  return `<${tag}>${serializeChildren(el)}</${tag}>`
}

export function sanitizeRichText(html: string): string {
  if (typeof html !== 'string' || !html.trim()) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return serializeChildren(doc.body)
}
