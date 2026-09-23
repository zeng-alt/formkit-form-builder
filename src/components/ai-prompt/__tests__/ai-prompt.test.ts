// @vitest-environment happy-dom
// ═══ 真实渲染集成测试：AiPrompt 空提示词提示 ═══════════════════════════════════
// AiPrompt 点击发送时若提示词为空，应给出可见提示；此前用 vue-sonner 的 toast()，
// 但仓库里从未挂载过 <Toaster/>（vue-sonner 要求显式挂载一个 Toaster 组件才会
// 渲染，否则 toast() 只是把消息塞进一个没人订阅的全局 store），导致这条提示、
// AI 请求失败提示（含错误详情）、ImportExportModal 的导入导出反馈全部静默不显示
// ——用户点了没反应，也看不到原因。
// 这里真实挂载 AiPrompt（包在 BuilderThemeScope 里，它是唯一的 n-config-provider /
// 通知 provider 渲染点），点击发送按钮（提示词为空），断言提示文案真的出现在
// document.body 里——naive-ui 的 notification 通过 teleport 挂到 body，不在
// wrapper 的挂载节点下，所以要查 body 而不是 wrapper.text()。
import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import AiPrompt from '@/components/ai-prompt/AiPrompt.vue'
import BuilderThemeScope from '@/theme/BuilderThemeScope.vue'
import BuilderProvider from '@/builder/BuilderProvider.vue'
import { BUILDER_STATE_KEY, createFormBuilderState } from '@/state/create-form-builder-state'

// 通知有过渡动画/异步渲染，多等几轮 tick 让它 settle 再断言。
const settle = async () => {
  for (let i = 0; i < 10; i++) await nextTick()
}

describe('AiPrompt：提示词为空时点击发送', () => {
  afterEach(() => {
    // naive-ui notification 是 teleport 到 body 的独立节点，组件 unmount 不会
    // 自动清空 body，手动清掉避免污染下一条用例。
    document.body.innerHTML = ''
  })

  it('提示文案应真的出现在 DOM（body）里，而不仅仅是调用了 toast', async () => {
    const wrapper = mount(BuilderThemeScope, {
      slots: {
        default: () => h(AiPrompt),
      },
      global: {
        provide: {
          [BUILDER_STATE_KEY as symbol]: createFormBuilderState(),
        },
      },
    })
    await settle()

    // 桌面态下 AiPrompt 只有一个可点击的发送按钮
    await wrapper.find('button').trigger('click')
    await settle()

    expect(document.body.textContent).toContain('提示为空')

    wrapper.unmount()
  })

  // BuilderThemeScope 嵌套时（BuilderProvider 包着 FormBuilder）内层走 inherited
  // 分支，不再重复渲染 provider，依赖外层那份。useNotification() 没有 provider
  // 祖先会直接抛错——这条锁住"嵌套用法下内层组件仍能拿到外层 provider"。
  it('BuilderProvider 外层 + BuilderThemeScope 内层嵌套时，同样能弹出提示', async () => {
    const wrapper = mount(BuilderProvider, {
      props: { config: {} },
      slots: {
        default: () => h(BuilderThemeScope, null, { default: () => h(AiPrompt) }),
      },
      global: {
        provide: {
          [BUILDER_STATE_KEY as symbol]: createFormBuilderState(),
        },
      },
    })
    await settle()

    await wrapper.find('button').trigger('click')
    await settle()

    expect(document.body.textContent).toContain('提示为空')

    wrapper.unmount()
  })
})
