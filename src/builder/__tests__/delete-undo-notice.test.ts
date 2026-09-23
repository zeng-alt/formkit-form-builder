// @vitest-environment happy-dom
// ═══ H7：删除后提供撤销 ═══════════════════════════════════════════════════════
// 覆盖按钮删除路径（ContainerChildrenGrid 统一包了一层，见
// use-delete-undo-notice.ts）：删除 → 通知里点「撤销」→ 元素恢复；
// 删除 → 又发生了新的编辑 → 通知里的撤销不再生效（不会撤销到别的操作）。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import BuilderMain from '@/builder/BuilderMain.vue'
import { BUILDER_STATE_KEY, type FormBuilderState } from '@/state/create-form-builder-state'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { FieldNode, FormDefinition } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 5; i++) await nextTick()
}

function textField(id: string, label: string): FieldNode {
  const field = getElementTypeDef('text')!.defaults() as FieldNode
  field.id = id
  field.key = id
  field.name = id
  field.label = label
  return field
}

function buildDefinition(): FormDefinition {
  return {
    version: DSL_VERSION,
    id: 'delete-undo-test',
    name: 'delete-undo-test',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [textField('age', '年龄'), textField('name', '姓名')],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

function getState(wrapper: ReturnType<typeof mount>): FormBuilderState {
  const provides = (wrapper.vm.$ as any).provides
  const state = provides?.[BUILDER_STATE_KEY as unknown as string] as FormBuilderState
  expect(state).toBeTruthy()
  return state
}

describe('H7：删除后提供撤销', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('点击删除按钮 → 通知带撤销按钮 → 点撤销 → 元素恢复', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)

    const deleteBtn = wrapper.find('[data-item-key="age"] button[aria-label="删除字段"]')
    expect(deleteBtn.exists()).toBe(true)
    await deleteBtn.trigger('click')
    await settle()
    expect(state.formDefinition.value.root.children.some((n) => n.key === 'age')).toBe(false)

    // 通知里的撤销按钮渲染在 body 下的 teleport 容器里
    expect(document.body.textContent).toContain('已删除')
    const undoBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('撤销'),
    )
    expect(undoBtn, '通知里应有撤销按钮').toBeTruthy()
    undoBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await settle()

    expect(state.formDefinition.value.root.children.some((n) => n.key === 'age')).toBe(true)

    wrapper.unmount()
  })

  it('删除后又发生了新的编辑：撤销按钮不再生效', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)

    const deleteBtn = wrapper.find('[data-item-key="age"] button[aria-label="删除字段"]')
    await deleteBtn.trigger('click')
    await settle()
    expect(state.formDefinition.value.root.children.some((n) => n.key === 'age')).toBe(false)

    const undoBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('撤销'),
    )!

    // 删除之后又发生一次新的编辑（比如改了 name 字段的 label）
    state.commitFormDefinition(
      {
        ...state.formDefinition.value,
        root: {
          ...state.formDefinition.value.root,
          children: state.formDefinition.value.root.children.map((n) =>
            n.key === 'name' ? { ...n, label: '改过的姓名' } : n,
          ),
        },
      },
      { reason: 'field-edit' },
    )
    await settle()

    // 这时再点通知里的撤销：不应该把上面这次编辑撤销掉，age 也不应该恢复
    undoBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await settle()

    expect(state.formDefinition.value.root.children.some((n) => n.key === 'age')).toBe(false)
    expect(state.formDefinition.value.root.children.find((n) => n.key === 'name')?.label).toBe(
      '改过的姓名',
    )

    wrapper.unmount()
  })
})
