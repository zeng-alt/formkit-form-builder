// @vitest-environment happy-dom
// ═══ H1：字段改名同步引用（NameInput 逐字符输入）═══════════════════════════════════
// 名称逐字符提交：只有新名字合法且不与别的字段重名时才把引用改过去，中间态撞上别的字段名
// 时不能同步（否则两边的引用混在一起，再改名会把那个字段的引用一并带走）。
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createFormBuilderState, BUILDER_STATE_KEY } from '@/state/create-form-builder-state'
import NameInput from '@/components/sidebar-right/edits/common/NameInput.vue'
import { parseExprString } from '@/dsl'
import { DSL_VERSION } from '@/types/dsl'
import type { FieldNode, FormDefinition } from '@/types/dsl'

function field(id: string, extra: Partial<FieldNode> = {}): FieldNode {
  return {
    id,
    key: id,
    category: 'field',
    type: 'text',
    renderAs: 'formkit',
    name: id,
    ...extra,
  } as FieldNode
}

// ab 被 c 的条件引用，a 被 d 的条件引用
function buildDef(): FormDefinition {
  return {
    version: DSL_VERSION,
    id: 'f',
    name: 'f',
    root: {
      id: 'root',
      key: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [
        field('ab'),
        field('a'),
        field('c', { visibleIf: parseExprString('$ab == 1') }),
        field('d', { visibleIf: parseExprString('$a == 2') }),
      ],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

async function mountNameInput(selected: string) {
  const state = createFormBuilderState()
  state.setFormDefinition(buildDef(), { resetHistory: true })
  state.selectedKey.value = selected
  state.selectedTarget.value = 'field'
  const Host = defineComponent({ setup: () => () => h(NameInput) })
  const wrapper = mount(Host, {
    global: { provide: { [BUILDER_STATE_KEY as unknown as string]: state } },
  })
  await nextTick()
  const type = async (value: string) => {
    await wrapper.find('input').setValue(value)
    await nextTick()
  }
  const node = (key: string) =>
    state.formDefinition.value.root.children.find((n) => n.key === key) as FieldNode
  return { state, wrapper, type, node }
}

describe('NameInput：改名同步引用', () => {
  it('改名时同步替换引用，撤销一次连同引用一起还原', async () => {
    const { state, type, node } = await mountNameInput('ab')
    await type('ab2')
    expect(node('ab').name).toBe('ab2')
    expect(node('c').visibleIf).toEqual(parseExprString('$ab2 == 1'))

    state.undo()
    expect(node('ab').name).toBe('ab')
    expect(node('c').visibleIf).toEqual(parseExprString('$ab == 1'))
  })

  it('中间态与别的字段重名时不同步，继续输入后从原名同步，不带走那个字段的引用', async () => {
    const { type, node } = await mountNameInput('ab')
    await type('a') // 与字段 a 重名：不同步
    expect(node('c').visibleIf).toEqual(parseExprString('$ab == 1'))
    await type('ax')
    expect(node('c').visibleIf).toEqual(parseExprString('$ax == 1'))
    // 字段 a 的引用保持原样
    expect(node('d').visibleIf).toEqual(parseExprString('$a == 2'))
  })

  it('中间态为空（不合法）时不同步', async () => {
    const { type, node } = await mountNameInput('ab')
    await type('')
    expect(node('c').visibleIf).toEqual(parseExprString('$ab == 1'))
    await type('zz')
    expect(node('c').visibleIf).toEqual(parseExprString('$zz == 1'))
  })

  it('撤销改名后再改，从撤销后的名字同步', async () => {
    const { state, type, node } = await mountNameInput('ab')
    await type('ab2')
    state.undo()
    await nextTick()
    await type('ab3')
    expect(node('c').visibleIf).toEqual(parseExprString('$ab3 == 1'))
  })
})
