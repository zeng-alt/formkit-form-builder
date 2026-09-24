// ═══ 表达式检查：以真实解析器为准提示「解析不了」═══════════════════════════════════
import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { createExprLintSource } from '@/utils/expr-lint'

const fakeView = (text: string) =>
  ({ state: EditorState.create({ doc: text }) }) as unknown as EditorView
const lint = createExprLintSource(() => ['name', 'id'])
const messages = (text: string) => lint(fakeView(text)).map((d) => `${d.severity}:${d.message}`)

describe('expr-lint', () => {
  it('字符串拼接（英文 / 中文引号）不报任何问题', () => {
    expect(messages('$name + "先生"')).toEqual([])
    expect(messages('$name + “先生”')).toEqual([])
    expect(messages('"编号-" + $id + "-" + $name')).toEqual([])
  })

  it('括号 / 引号都对但内置语法解析不了：给警告', () => {
    const m = messages('foo($name)')
    expect(m).toHaveLength(1)
    expect(m[0]).toMatch(/^warning:无法按内置语法解析/)
  })

  it('引号未闭合仍给出具体的错误原因', () => {
    expect(messages('$name + "abc')[0]).toMatch(/^error:字符串未闭合/)
  })
})
