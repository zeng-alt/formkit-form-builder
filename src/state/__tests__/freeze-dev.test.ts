// ═══ 开发态深度冻结 ═══════════════════════════════════════════════════════════
// 覆盖规格 B3：所有写真源的路径（含初始定义）都过 freezeDeepDev，vitest 下
// import.meta.env.DEV 为 true，冻结生效；对冻结对象的子节点赋值应直接抛 TypeError。

import { describe, expect, it } from 'vitest'
import { createFormBuilderState } from '@/state/create-form-builder-state'
import { DSL_VERSION } from '@/dsl'
import type { FormDefinition } from '@/types/dsl'

describe('开发态深度冻结：createFormBuilderState', () => {
  it('初始定义与提交后的 formDefinition.value 都被深度冻结', () => {
    const state = createFormBuilderState()

    expect(Object.isFrozen(state.formDefinition.value)).toBe(true)
    expect(Object.isFrozen(state.formDefinition.value.root)).toBe(true)
    expect(Object.isFrozen(state.formDefinition.value.root.children)).toBe(true)
    for (const child of state.formDefinition.value.root.children) {
      expect(Object.isFrozen(child)).toBe(true)
    }
  })

  it('对冻结定义的子节点赋值抛 TypeError（严格模式下原地改写立即报错）', () => {
    const state = createFormBuilderState()
    const child = state.formDefinition.value.root.children[0] as any
    expect(child).toBeTruthy()
    expect(() => {
      child.label = '不该改到这里'
    }).toThrow(TypeError)
  })

  it('提交新定义后，新定义同样被冻结，且改写子树也抛错', () => {
    const state = createFormBuilderState()
    const nextDef: FormDefinition = {
      version: DSL_VERSION,
      id: 'f2',
      name: 'form2',
      root: {
        id: 'root',
        category: 'container',
        type: 'group',
        renderAs: 'formkit',
        dataType: 'object',
        children: [
          {
            id: 'a',
            key: 'a',
            category: 'field',
            type: 'text',
            renderAs: 'formkit',
            name: 'a',
            label: 'A',
          } as any,
        ],
      },
      settings: { labelWidth: 80, labelAlign: 'top' },
    }
    state.commitFormDefinition(nextDef)

    expect(Object.isFrozen(state.formDefinition.value)).toBe(true)
    const field = state.formDefinition.value.root.children[0] as any
    expect(() => {
      field.props = {}
    }).toThrow(TypeError)
    expect(() => {
      // 数组本身也被冻结：push/splice 一律抛错
      ;(state.formDefinition.value.root.children as unknown[]).push({})
    }).toThrow(TypeError)
  })
})
