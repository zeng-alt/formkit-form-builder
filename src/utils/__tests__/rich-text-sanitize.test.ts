// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { sanitizeRichText } from '../rich-text-sanitize'

describe('sanitizeRichText', () => {
  it('空值 / 空白返回空字符串', () => {
    expect(sanitizeRichText('')).toBe('')
    expect(sanitizeRichText('   ')).toBe('')
    expect(sanitizeRichText(undefined as unknown as string)).toBe('')
  })

  it('保留白名单标签，去掉多余属性', () => {
    const out = sanitizeRichText('<p class="x" style="color:red">你好<strong>世界</strong></p>')
    expect(out).toBe('<p>你好<strong>世界</strong></p>')
  })

  it('不在白名单的标签被拆包，只保留子内容', () => {
    const out = sanitizeRichText('<div><span>纯文本</span></div>')
    expect(out).toBe('纯文本')
  })

  it('script/style 等危险标签连同内容一起丢弃', () => {
    const out = sanitizeRichText('<p>安全</p><script>alert(1)</script><style>body{}</style>')
    expect(out).toBe('<p>安全</p>')
  })

  it('img 等未在白名单里的标签直接消失（没有文本子节点可保留）', () => {
    const out = sanitizeRichText('<p>前<img src="x.png" onerror="alert(1)">后</p>')
    expect(out).toBe('<p>前后</p>')
  })

  it('a 标签仅保留 http/https/mailto 的 href，并强制 target/rel', () => {
    const ok = sanitizeRichText('<a href="https://example.com" onclick="x()">链接</a>')
    expect(ok).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">链接</a>',
    )

    const mail = sanitizeRichText('<a href="mailto:a@b.com">邮件</a>')
    expect(mail).toContain('href="mailto:a@b.com"')
    expect(mail).toContain('target="_blank"')
  })

  it('a 标签的危险协议（javascript:）被丢弃 href，拆包保留文字', () => {
    const out = sanitizeRichText('<a href="javascript:alert(1)">点我</a>')
    expect(out).toBe('点我')
  })

  it('转义文本节点里的尖括号，避免被当成标签', () => {
    const out = sanitizeRichText('<p>1 &lt; 2 && 3 > 2</p>')
    expect(out).toBe('<p>1 &lt; 2 &amp;&amp; 3 &gt; 2</p>')
  })

  it('标题 / 列表 / 引用均保留', () => {
    const out = sanitizeRichText(
      '<h2>标题</h2><ul><li>一</li><li>二</li></ul><blockquote>引用</blockquote>',
    )
    expect(out).toBe('<h2>标题</h2><ul><li>一</li><li>二</li></ul><blockquote>引用</blockquote>')
  })
})
