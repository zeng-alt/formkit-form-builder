// @vitest-environment happy-dom
// ═══ 真实渲染集成测试：画布增量渲染（本任务验收核心）═══════════════════════════════
// 挂载完整 BuilderMain（含画布），构造一个 ≥20 字段 + 一个 group 容器（内含字段）的
// 定义，通过公开的 state API（FormBuilderState.commitFormDefinition，同
// src/state/__tests__/multi-instance.test.ts 的用法）只改其中一个字段的 label：
// - 断言画布 DOM 里新 label 出现；
// - 用全局 mixin 的 updated() 钩子统计每个组件实例的重渲染次数，按其 DOM 节点最近的
//   [data-item-key] 祖先（画布条目 li，见 CanvasGridItem.vue）归属到具体字段，
//   断言未改动字段对应的 li 子树下没有任何组件实例触发过 updated()——Vue 只在
//   props 浅比较判定"变了"时才会调用子组件的更新函数，未改动字段的 schema 节点、
//   renderSchema 数组、schemaLibrary/schemaRenderData 引用全部不变，因此从
//   ContainerChildrenGrid 到 CanvasGridItem 到内部 FormKitSchema 渲染的具体字段
//   组件，整条链路都会在 Vue 的 shouldUpdateComponent 处直接 bail，updated()
//   不会被调用。
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import BuilderMain from '@/builder/BuilderMain.vue'
import { BUILDER_STATE_KEY, type FormBuilderState } from '@/state/create-form-builder-state'
import { DSL_VERSION } from '@/dsl'
import type { ContainerNode, FieldNode, FormDefinition, FormNode } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 5; i++) await nextTick()
}

function textField(id: string, label: string): FieldNode {
  return {
    id,
    key: id,
    category: 'field',
    type: 'text',
    renderAs: 'formkit',
    name: id,
    label,
  }
}

const FIELD_COUNT = 20

function buildDefinition(labelOfField0: string): FormDefinition {
  const rootFields: FormNode[] = []
  for (let i = 0; i < FIELD_COUNT; i++) {
    rootFields.push(textField(`f${i}`, i === 0 ? labelOfField0 : `Field ${i}`))
  }
  const group: ContainerNode = {
    id: 'g',
    key: 'g',
    category: 'container',
    type: 'group',
    renderAs: 'formkit',
    dataType: 'object',
    name: 'g',
    children: [textField('g_a', 'Group A'), textField('g_b', 'Group B')],
  }
  return {
    version: DSL_VERSION,
    id: 'perf-form',
    name: 'perf-form',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [...rootFields, group],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

// 按组件实例的 $el 最近的 [data-item-key] 祖先，把 updated() 调用归属到具体画布条目；
// 不在任何 li 内的实例（画布外层结构：ContainerChildrenGrid 自身、ul、侧栏等）不归属，
// 不参与"未改字段是否重渲染"的判断——它们的重渲染是预期行为（schema 数组每次编辑都会
// 换一个新的顶层数组包装，参见 schema-adapter.ts 顶部注释）。
function ownerKeyOf(el: unknown): string | null {
  if (!(el instanceof Element)) return null
  const li = el.closest('[data-item-key]')
  return li ? li.getAttribute('data-item-key') : null
}

describe('画布增量渲染：只改一个字段的 label，未改动字段不应重渲染', () => {
  it('新 label 出现在 DOM 里，且未改动字段对应的画布条目子树没有任何组件触发过 updated()', async () => {
    const updateCounts = new Map<number, number>()
    const uidToKey = new Map<number, string | null>()

    const countingMixin = {
      mounted(this: any) {
        uidToKey.set(this.$.uid, ownerKeyOf(this.$el))
      },
      updated(this: any) {
        updateCounts.set(this.$.uid, (updateCounts.get(this.$.uid) ?? 0) + 1)
      },
    }

    const wrapper = mount(BuilderMain, {
      global: {
        plugins: [[formkitPlugin, formkitDefaultConfig]],
        mixins: [countingMixin],
      },
      props: { config: {} },
    })
    await settle()

    const provides = (wrapper.vm.$ as any).provides
    const state = provides?.[BUILDER_STATE_KEY as unknown as string] as FormBuilderState
    expect(state).toBeTruthy()

    const initialDef = buildDefinition('Field 0')
    state.setFormDefinition(initialDef, { resetHistory: true })
    await settle()

    expect(wrapper.text()).toContain('Field 0')
    expect(wrapper.text()).toContain(`Field ${FIELD_COUNT - 1}`)
    expect(wrapper.text()).toContain('Group A')

    // 记录改动前，每个 uid 归属哪个画布条目（此时刚挂载完，统计的是"初次渲染"，
    // 不代表后续一定会再触发 updated，这里只用它做归属映射）
    const uidToKeySnapshot = new Map(uidToKey)
    updateCounts.clear()

    // 通过公开的 state API 只改 root 里第一个字段（f0）的 label —— 与
    // src/state/__tests__/multi-instance.test.ts / schema-history-identity.test.ts
    // 里 `state.commitFormDefinition(...)` 的用法一致
    const f0 = initialDef.root.children[0] as FieldNode
    const nextChildren = initialDef.root.children.map((n) =>
      n === f0 ? { ...f0, label: 'Field 0 CHANGED' } : n,
    )
    const nextDef: FormDefinition = {
      ...initialDef,
      root: { ...initialDef.root, children: nextChildren },
    }
    state.commitFormDefinition(nextDef, { reason: 'edit-label' })
    await settle()

    // 新 label 出现在画布 DOM 里
    expect(wrapper.text()).toContain('Field 0 CHANGED')
    expect(wrapper.text()).not.toContain('>Field 0<')

    // 改动字段（f0）对应的条目应该确实重渲染过（有 updated 记录，或至少 DOM 已更新—
    // 上面的文本断言已经证明了这一点；这里再确认统计口径本身能捕捉到"变了"的情况）
    const f0Uids = [...uidToKeySnapshot.entries()].filter(([, k]) => k === 'f0').map(([uid]) => uid)
    expect(f0Uids.length).toBeGreaterThan(0)
    const f0Updated = f0Uids.some((uid) => (updateCounts.get(uid) ?? 0) > 0)
    expect(f0Updated).toBe(true)

    // 未改动字段：f1..f19、group 及其内部两个字段——这些条目子树下的任何组件实例
    // 都不应该记录到 updated() 调用
    const uniqueKeys = new Set([...uidToKeySnapshot.values()].filter((k): k is string => !!k))
    const untouchedKeys = [...uniqueKeys].filter((k) => k !== 'f0')
    expect(untouchedKeys.length).toBeGreaterThan(0)

    const rerenderedUntouched: string[] = []
    for (const [uid, key] of uidToKeySnapshot) {
      if (!key || key === 'f0') continue
      if ((updateCounts.get(uid) ?? 0) > 0) rerenderedUntouched.push(key)
    }
    expect(
      rerenderedUntouched,
      `以下未改动画布条目在只改 f0 label 后仍触发了组件更新：${[...new Set(rerenderedUntouched)].join(', ')}`,
    ).toEqual([])

    wrapper.unmount()
  })
})
