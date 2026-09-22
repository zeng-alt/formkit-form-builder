// ═══ 字段名清单实例作用域化：expr-completions / expr-lint / bind-runtime-completions ═══
// 覆盖点：
// 1. 两个用不同 getFields 构造出来的补全源互不影响（多实例并存不再互相覆盖字段清单）。
// 2. 取值函数是惰性的：构造之后再改变字段清单，补全/校验结果跟着变（证明不是快照）。

import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { CompletionContext } from '@codemirror/autocomplete'
import type { EditorView } from '@codemirror/view'
import { createExprCompletionSource, type ExprFieldInfo } from '@/utils/expr-completions'
import { createExprLintSource } from '@/utils/expr-lint'
import { createBindRuntimeCompletionsSource } from '@/utils/bind-runtime-completions'

/** 在文档末尾发起一次补全请求，模拟用户在行尾敲字符触发补全 */
function completeAtEnd(source: ReturnType<typeof createExprCompletionSource>, doc: string) {
  const state = EditorState.create({ doc })
  const context = new CompletionContext(state, doc.length, false)
  return source(context)
}

/** lint 源只用得到 view.state.doc，构造一个只带 state 的最小假 view 即可，
 *  不必拉起真正的 EditorView（那需要 DOM，这里是纯函数级测试，跑在 node 环境） */
function fakeView(doc: string): EditorView {
  return { state: EditorState.create({ doc }) } as unknown as EditorView
}

describe('createExprCompletionSource：实例作用域字段清单', () => {
  it('两个用不同 getFields 构造的补全源互不影响', () => {
    const fieldsA: ExprFieldInfo[] = [{ name: 'age', label: '年龄' }]
    const fieldsB: ExprFieldInfo[] = [{ name: 'username', label: '用户名' }]

    const sourceA = createExprCompletionSource(() => fieldsA)
    const sourceB = createExprCompletionSource(() => fieldsB)

    const resultA = completeAtEnd(sourceA, '$a')
    const resultB = completeAtEnd(sourceB, '$u')

    expect(resultA?.options.map((o) => o.label)).toContain('age')
    expect(resultA?.options.map((o) => o.label)).not.toContain('username')

    expect(resultB?.options.map((o) => o.label)).toContain('username')
    expect(resultB?.options.map((o) => o.label)).not.toContain('age')
  })

  it('取值函数是惰性的：构造之后改变字段清单，补全结果跟着变（不是快照）', () => {
    let fields: ExprFieldInfo[] = [{ name: 'foo' }]
    const source = createExprCompletionSource(() => fields)

    const before = completeAtEnd(source, '$f')
    expect(before?.options.map((o) => o.label)).toEqual(['foo'])

    // 换一份字段清单——同一个 source，不重新构造
    fields = [{ name: 'bar' }]
    const after = completeAtEnd(source, '$b')
    expect(after?.options.map((o) => o.label)).toEqual(['bar'])

    // 旧字段名不再出现在新清单下的补全里
    const stillOld = completeAtEnd(source, '$f')
    expect(stillOld).toBeNull()
  })
})

describe('createExprLintSource：实例作用域字段清单', () => {
  it('两个用不同 getFieldNames 构造的 lint 源互不影响', () => {
    const lintA = createExprLintSource(() => ['age'])
    const lintB = createExprLintSource(() => ['username'])

    // $age 对 A 有效、对 B 无效；$username 反之
    const diagsA = lintA(fakeView('$age + $username'))
    const diagsB = lintB(fakeView('$age + $username'))

    const undefinedNamesA = diagsA
      .filter((d) => d.severity === 'warning')
      .map((d) => d.message)
    const undefinedNamesB = diagsB
      .filter((d) => d.severity === 'warning')
      .map((d) => d.message)

    expect(undefinedNamesA.some((m) => m.includes('username'))).toBe(true)
    expect(undefinedNamesA.some((m) => m.includes('age'))).toBe(false)

    expect(undefinedNamesB.some((m) => m.includes('age'))).toBe(true)
    expect(undefinedNamesB.some((m) => m.includes('username'))).toBe(false)
  })

  it('取值函数是惰性的：构造之后改变字段清单，校验结果跟着变', () => {
    let names: string[] = ['age']
    const lint = createExprLintSource(() => names)

    expect(lint(fakeView('$age')).length).toBe(0)

    names = [] // age 不再是已知字段
    const diags = lint(fakeView('$age'))
    expect(diags.some((d) => d.message.includes('age'))).toBe(true)
  })
})

describe('createBindRuntimeCompletionsSource：实例作用域字段清单（form.xxx 补全）', () => {
  function completeFormDot(
    source: ReturnType<typeof createBindRuntimeCompletionsSource>,
    doc: string,
  ) {
    const state = EditorState.create({ doc })
    const context = new CompletionContext(state, doc.length, false)
    return source(context)
  }

  it('两个用不同 getFieldNames 构造的补全源互不影响', () => {
    const sourceA = createBindRuntimeCompletionsSource(() => ['age'])
    const sourceB = createBindRuntimeCompletionsSource(() => ['username'])

    const resultA = completeFormDot(sourceA, 'form.')
    const resultB = completeFormDot(sourceB, 'form.')

    expect(resultA?.options.map((o) => o.label)).toEqual(['age'])
    expect(resultB?.options.map((o) => o.label)).toEqual(['username'])
  })

  it('取值函数是惰性的：构造之后改变字段清单，form.xxx 补全跟着变', () => {
    let names: string[] = ['foo']
    const source = createBindRuntimeCompletionsSource(() => names)

    expect(completeFormDot(source, 'form.')?.options.map((o) => o.label)).toEqual(['foo'])

    names = ['bar']
    expect(completeFormDot(source, 'form.')?.options.map((o) => o.label)).toEqual(['bar'])
  })
})
