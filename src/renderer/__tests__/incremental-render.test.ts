// @vitest-environment happy-dom
// ═══ FormRenderer 增量渲染（规格 D2/D4 验收核心）══════════════════════════════════
// 参照 src/builder/__tests__/canvas-incremental-render.test.ts 的统计 updated() 方式：
// 挂载 FormRenderer，构造一个 20+ 字段 + 一个 group 容器（内含两个字段）的 definition，
// 只改其中一个字段的 label：
// - 断言 DOM 里新 label 出现；
// - 用全局 mixin 的 updated() 钩子统计每个组件实例的重渲染次数，按其 DOM 节点最近的
//   .formkit-outer 祖先（每个 FormKit 输入自己的外层容器）归属到具体字段，断言未改动
//   字段对应的 .formkit-outer 子树下没有任何组件实例触发过 updated()。
// 覆盖两种编辑方式：
//   1. 不可变方式（展开拷贝出新 definition，整体替换 props.definition）；
//   2. 原地修改一个 reactive() 包裹的 definition 的嵌套字段（回归场景，见
//      reactive-definition-mutation.test.ts）。
// 两种方式都应该只让改动字段重渲染，DOM 里能看到新 label。
//
// 两个用例的字段名 / label 文案刻意用不同前缀（r_ / i_）：FormKit 的 FormKitSchema
// 对内容完全相同的 schema 有一层全局（模块级、跨组件实例）的编译结果缓存（按
// JSON.stringify(schema) 做 key，见 node_modules/@formkit/vue/dist/index.mjs 的
// parseSchema/memo），同一个 vitest worker 里两个用例如果字段内容逐字节相同，会
// 撞上这层缓存、干扰彼此——这是 FormKit 自身的实现细节，不是本仓库代码的问题，
// 这里用不同前缀绕开，避免测试之间假性关联。
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import FormRenderer from '@/renderer/FormRenderer.vue'
import { DSL_VERSION } from '@/dsl'
import type { ContainerNode, FieldNode, FormDefinition, FormNode } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 6; i++) await nextTick()
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

function buildDefinition(prefix: string, labelOfField0: string): FormDefinition {
  const rootFields: FormNode[] = []
  for (let i = 0; i < FIELD_COUNT; i++) {
    rootFields.push(textField(`${prefix}${i}`, i === 0 ? labelOfField0 : `${prefix}Field ${i}`))
  }
  const group: ContainerNode = {
    id: `${prefix}g`,
    key: `${prefix}g`,
    category: 'container',
    type: 'group',
    renderAs: 'formkit',
    dataType: 'object',
    name: `${prefix}g`,
    children: [
      textField(`${prefix}g_a`, `${prefix}Group A`),
      textField(`${prefix}g_b`, `${prefix}Group B`),
    ],
  }
  return {
    version: DSL_VERSION,
    id: `${prefix}renderer-perf-form`,
    name: `${prefix}renderer-perf-form`,
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

// 按组件实例最近的 .formkit-outer 祖先（每个 FormKit 字段自己的外层容器）把
// updated() 调用归属到具体字段；group 内嵌字段的 .formkit-outer 比 group 自身的
// .formkit-outer 更近，closest() 会先命中字段自己的，粒度与画布测试的
// [data-item-key] 等价。不在任何 .formkit-outer 内的实例（FormRenderer 自身、
// FormKitSchemaWrapper 外层结构等）不归属，不参与判断。
function ownerKeyOf(el: unknown): string | null {
  if (!(el instanceof Element)) return null
  const outer = el.closest('.formkit-outer')
  if (!outer) return null
  const labelFor = outer.querySelector(':scope > .formkit-wrapper > label[for]')
  if (labelFor) return labelFor.getAttribute('for')
  const input = outer.querySelector('input[id], textarea[id], select[id]')
  return input ? input.id : outer.getAttribute('data-type')
}

function makeCountingMixin(
  updateCounts: Map<number, number>,
  uidToKey: Map<number, string | null>,
) {
  return {
    mounted(this: any) {
      uidToKey.set(this.$.uid, ownerKeyOf(this.$el))
    },
    updated(this: any) {
      updateCounts.set(this.$.uid, (updateCounts.get(this.$.uid) ?? 0) + 1)
    },
  }
}

describe('FormRenderer 增量渲染：只改一个字段的 label，未改动字段不应重渲染', () => {
  it('不可变方式（整体替换 props.definition）：新 label 出现，未改动字段无 updated()', async () => {
    const updateCounts = new Map<number, number>()
    const uidToKey = new Map<number, string | null>()

    const wrapper = mount(FormRenderer, {
      global: {
        plugins: [[formkitPlugin, formkitDefaultConfig]],
        mixins: [makeCountingMixin(updateCounts, uidToKey)],
      },
      props: { definition: buildDefinition('i_', 'i_Field 0'), modelValue: {} },
    })
    await settle()

    expect(wrapper.text()).toContain('i_Field 0')
    expect(wrapper.text()).toContain(`i_Field ${FIELD_COUNT - 1}`)
    expect(wrapper.text()).toContain('i_Group A')

    const uidToKeySnapshot = new Map(uidToKey)
    updateCounts.clear()

    const prevDef = wrapper.props('definition') as FormDefinition
    const f0 = prevDef.root.children[0] as FieldNode
    const nextChildren = prevDef.root.children.map((n) =>
      n === f0 ? { ...f0, label: 'i_Field 0 CHANGED' } : n,
    )
    const nextDef: FormDefinition = {
      ...prevDef,
      root: { ...prevDef.root, children: nextChildren },
    }
    await wrapper.setProps({ definition: nextDef })
    await settle()

    expect(wrapper.text()).toContain('i_Field 0 CHANGED')
    expect(wrapper.text()).not.toContain('>i_Field 0<')

    const f0Uids = [...uidToKeySnapshot.entries()]
      .filter(([, k]) => k === 'i_0')
      .map(([uid]) => uid)
    expect(f0Uids.length).toBeGreaterThan(0)
    expect(f0Uids.some((uid) => (updateCounts.get(uid) ?? 0) > 0)).toBe(true)

    const uniqueKeys = new Set([...uidToKeySnapshot.values()].filter((k): k is string => !!k))
    const untouchedKeys = [...uniqueKeys].filter((k) => k !== 'i_0')
    expect(untouchedKeys.length).toBeGreaterThan(0)

    const rerenderedUntouched: string[] = []
    for (const [uid, key] of uidToKeySnapshot) {
      if (!key || key === 'i_0') continue
      if ((updateCounts.get(uid) ?? 0) > 0) rerenderedUntouched.push(key)
    }
    expect(
      rerenderedUntouched,
      `以下未改动字段在只改 i_0 label 后仍触发了组件更新：${[...new Set(rerenderedUntouched)].join(', ')}`,
    ).toEqual([])

    wrapper.unmount()
  })

  it('原地修改 reactive() definition 的嵌套字段：DOM 同样更新，未改动字段无 updated()', async () => {
    const updateCounts = new Map<number, number>()
    const uidToKey = new Map<number, string | null>()

    const def = reactive<FormDefinition>(buildDefinition('r_', 'r_Field 0'))

    const wrapper = mount(FormRenderer, {
      global: {
        plugins: [[formkitPlugin, formkitDefaultConfig]],
        mixins: [makeCountingMixin(updateCounts, uidToKey)],
      },
      props: { definition: def, modelValue: {} },
    })
    await settle()

    expect(wrapper.text()).toContain('r_Field 0')
    expect(wrapper.text()).toContain('r_Group A')

    const uidToKeySnapshot = new Map(uidToKey)
    updateCounts.clear()

    // 原地改写：不经过展开拷贝，直接改 reactive definition 内嵌套字段的 label
    ;(def.root.children[0] as FieldNode).label = 'r_Field 0 CHANGED'
    await settle()

    expect(wrapper.text()).toContain('r_Field 0 CHANGED')
    expect(wrapper.text()).not.toContain('>r_Field 0<')

    const f0Uids = [...uidToKeySnapshot.entries()]
      .filter(([, k]) => k === 'r_0')
      .map(([uid]) => uid)
    expect(f0Uids.length).toBeGreaterThan(0)
    expect(f0Uids.some((uid) => (updateCounts.get(uid) ?? 0) > 0)).toBe(true)

    const rerenderedUntouched: string[] = []
    for (const [uid, key] of uidToKeySnapshot) {
      if (!key || key === 'r_0') continue
      if ((updateCounts.get(uid) ?? 0) > 0) rerenderedUntouched.push(key)
    }
    expect(
      rerenderedUntouched,
      `以下未改动字段在原地改写 r_0 label 后仍触发了组件更新：${[...new Set(rerenderedUntouched)].join(', ')}`,
    ).toEqual([])

    wrapper.unmount()
  })
})
