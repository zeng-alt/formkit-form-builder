// ═══ 多实例状态收口回归测试 ═══════════════════════════════════════════════════
// 覆盖点：
// 1. createFormBuilderState() 各实例互不串扰（真源 / 历史 / 选中 / 画布投影）。
// 2. 选中态 / 画布视口隔离。
// 3. useFormBuilderState() 在 provider 子树内可用、子树外直接报错；
//    useOptionalFormBuilderState() 子树外返回 null。
// 4. 回归护栏：被删掉的 5 个模块级单例不会被"图方便"加回来。

import { describe, it, expect } from 'vitest'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
  createFormBuilderState,
  provideFormBuilderState,
  useFormBuilderState,
  useOptionalFormBuilderState,
} from '@/state/create-form-builder-state'
import { createSchemaHistory } from '@/composables/schema-history'

describe('多实例隔离：createFormBuilderState', () => {
  it('两个实例的 instanceId 不同', () => {
    const a = createFormBuilderState()
    const b = createFormBuilderState()
    expect(a.instanceId).not.toBe(b.instanceId)
  })

  it('formDefinition 提交只影响自己的实例，不串到另一个实例', () => {
    const a = createFormBuilderState()
    const b = createFormBuilderState()
    const initialBName = b.formDefinition.value.name

    a.commitFormDefinition({ ...a.formDefinition.value, name: 'A' })

    expect(a.formDefinition.value.name).toBe('A')
    expect(b.formDefinition.value.name).toBe(initialBName)
  })

  it('undo 栈各自独立', () => {
    const a = createFormBuilderState()
    const b = createFormBuilderState()

    a.commitFormDefinition({ ...a.formDefinition.value, name: 'A' })

    expect(a.canUndo.value).toBe(true)
    expect(b.canUndo.value).toBe(false)

    const bNameBeforeUndo = b.formDefinition.value.name
    a.undo()
    expect(a.canUndo.value).toBe(false)
    expect(b.formDefinition.value.name).toBe(bNameBeforeUndo)
  })

  it('formSchema 投影是各自实例的独立 computed（引用不同）', () => {
    const a = createFormBuilderState()
    const b = createFormBuilderState()
    expect(a.formSchema.value).not.toBe(b.formSchema.value)
  })
})

describe('多实例隔离：选中 / 画布状态', () => {
  it('selectedKey / canvasView 互不影响', () => {
    const a = createFormBuilderState()
    const b = createFormBuilderState()

    a.selectedKey.value = 'x'
    a.canvasView.value = 'mobile'

    expect(b.selectedKey.value).toBeNull()
    expect(b.canvasView.value).toBe('desktop')
  })
})

describe('useFormBuilderState / useOptionalFormBuilderState：provider 边界', () => {
  it('provider 子树内可读到实例状态', async () => {
    const state = createFormBuilderState()

    const Child = defineComponent({
      setup() {
        const s = useFormBuilderState()
        return () => h('span', s.instanceId)
      },
    })
    const Parent = defineComponent({
      setup() {
        provideFormBuilderState(state)
        return () => h(Child)
      },
    })

    const html = await renderToString(createSSRApp(Parent))
    expect(html).toContain(state.instanceId)
  })

  it('provider 子树外调用 useFormBuilderState() 直接报错，不再回落全局单例', async () => {
    const Child = defineComponent({
      setup() {
        useFormBuilderState()
        return () => h('span', 'unreachable')
      },
    })

    await expect(renderToString(createSSRApp(Child))).rejects.toThrow(/useFormBuilderState/)
  })

  it('useOptionalFormBuilderState() 子树外返回 null', async () => {
    const Child2 = defineComponent({
      setup() {
        const s = useOptionalFormBuilderState()
        return () => h('span', String(s))
      },
    })

    const html = await renderToString(createSSRApp(Child2))
    expect(html).toContain('null')
  })
})

describe('回归护栏：状态模块不再暴露模块级单例', () => {
  // 这几个模块曾各自挂过一份"向后兼容"的模块级默认实例（defaultXxxState / 解构导出的
  // formDefinition / selectedKey / undo 等）。防止有人图方便又把单例加回来——
  // 状态必须只能通过 createXxx() 按实例创建，再由 provideFormBuilderState 下发。
  const FORBIDDEN_KEYS = [
    'formDefinition',
    'formSchema',
    'commitSchemaChildren',
    'selectedIndex',
    'selectedKey',
    'selectedTarget',
    'canvasView',
    'isLoading',
    'undo',
    'redo',
    'commitSchema',
    'commitSchemaReconcile',
    'commitFormDefinition',
  ]

  it.each([
    ['@/state/form-definition', () => import('@/state/form-definition')],
    ['@/state/form-schema', () => import('@/state/form-schema')],
    ['@/state/canvas-ui', () => import('@/state/canvas-ui')],
    ['@/composables/schema-history', () => import('@/composables/schema-history')],
    ['@/state/create-form-builder-state', () => import('@/state/create-form-builder-state')],
  ])('%s 不导出模块级单例或以 default 开头的兜底实例', async (_name, load) => {
    const mod = await load()
    const keys = Object.keys(mod)
    for (const key of keys) {
      expect(key.startsWith('default')).toBe(false)
    }
    for (const forbidden of FORBIDDEN_KEYS) {
      expect(keys).not.toContain(forbidden)
    }
  })
})

describe('回归护栏：createSchemaHistory 仍可脱离 FormBuilderState 独立组装', () => {
  it('按显式传入的状态切片创建历史漏斗（不再隐式依赖已删除的默认实例）', async () => {
    const { createFormDefinitionState } = await import('@/state/form-definition')
    const { createSelectionState } = await import('@/state/form-schema')
    const def = createFormDefinitionState()
    const selection = createSelectionState()
    const history = createSchemaHistory({ ...def, ...selection })
    expect(history.canUndo.value).toBe(false)
    history.commitFormDefinition({ ...def.formDefinition.value, name: 'X' })
    expect(def.formDefinition.value.name).toBe('X')
    expect(history.canUndo.value).toBe(true)
  })
})
