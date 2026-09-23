// ═══ 字段名清单实例作用域化：expr-lint / bind-runtime-completions ═══════════════
// 覆盖点：
// 1. 两个用不同 getFields 构造出来的补全源互不影响（多实例并存不再互相覆盖字段清单）。
// 2. 取值函数是惰性的：构造之后再改变字段清单，补全/校验结果跟着变（证明不是快照）。

import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { CompletionContext, type Completion } from '@codemirror/autocomplete'
import type { EditorView } from '@codemirror/view'
import { createExprLintSource } from '@/utils/expr-lint'
import { createBindRuntimeCompletionsSource } from '@/utils/bind-runtime-completions'

/** lint 源只用得到 view.state.doc，构造一个只带 state 的最小假 view 即可，
 *  不必拉起真正的 EditorView（那需要 DOM，这里是纯函数级测试，跑在 node 环境） */
function fakeView(doc: string): EditorView {
  return { state: EditorState.create({ doc }) } as unknown as EditorView
}

describe('createExprLintSource：实例作用域字段清单', () => {
  it('两个用不同 getFieldNames 构造的 lint 源互不影响', () => {
    const lintA = createExprLintSource(() => ['age'])
    const lintB = createExprLintSource(() => ['username'])

    // $age 对 A 有效、对 B 无效；$username 反之
    const diagsA = lintA(fakeView('$age + $username'))
    const diagsB = lintB(fakeView('$age + $username'))

    const undefinedNamesA = diagsA.filter((d) => d.severity === 'warning').map((d) => d.message)
    const undefinedNamesB = diagsB.filter((d) => d.severity === 'warning').map((d) => d.message)

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
  // CompletionSource 的返回类型是 CompletionResult | null | Promise<...>——本实现
  // 从不异步返回，但签名是通用接口类型，这里老老实实 await 一次拿到落地的结果，
  // 而不是断言掉这个联合类型
  async function completeFormDot(
    source: ReturnType<typeof createBindRuntimeCompletionsSource>,
    doc: string,
  ) {
    const state = EditorState.create({ doc })
    const context = new CompletionContext(state, doc.length, false)
    return await source(context)
  }

  it('两个用不同 getFieldNames 构造的补全源互不影响', async () => {
    const sourceA = createBindRuntimeCompletionsSource(() => ['age'])
    const sourceB = createBindRuntimeCompletionsSource(() => ['username'])

    const resultA = await completeFormDot(sourceA, 'form.')
    const resultB = await completeFormDot(sourceB, 'form.')

    expect(resultA?.options.map((o: Completion) => o.label)).toEqual(['age'])
    expect(resultB?.options.map((o: Completion) => o.label)).toEqual(['username'])
  })

  it('取值函数是惰性的：构造之后改变字段清单，form.xxx 补全跟着变', async () => {
    let names: string[] = ['foo']
    const source = createBindRuntimeCompletionsSource(() => names)

    const first = await completeFormDot(source, 'form.')
    expect(first?.options.map((o: Completion) => o.label)).toEqual(['foo'])

    names = ['bar']
    const second = await completeFormDot(source, 'form.')
    expect(second?.options.map((o: Completion) => o.label)).toEqual(['bar'])
  })
})
