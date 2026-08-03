// 新公共 API 演示：两个独立 FormBuilder（v-model 隔离）+ FormRenderer 操作器。
// 访问 http://localhost:5173/api-demo.html
import { createApp, h, ref } from 'vue'
import { plugin } from '@formkit/vue'
import { formkitConfig, FormBuilder, FormRenderer } from '@zeng-alt/formkit-form-builder'
import type { FormDefinition } from '@zeng-alt/formkit-form-builder'
import 'uno.css'
import './src/style.css'

const defA = ref<FormDefinition | undefined>(undefined)
const defB = ref<FormDefinition | undefined>(undefined)
const data = ref<Record<string, unknown>>({})

const App = {
  setup() {
    return { defA, defB, data }
  },
  render() {
    const panel = (title: string, children: unknown[]) =>
      h(
        'div',
        { style: 'border:1px solid #ccc;border-radius:8px;padding:8px;min-width:0;overflow:hidden' },
        [h('h3', { style: 'margin:4px 0;font-size:13px' }, title), ...children],
      )
    return h(
      'div',
      {
        style:
          'display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:8px;padding:8px;box-sizing:border-box',
      },
      [
        panel('设计器 A（v-model）', [
          h(FormBuilder, {
            modelValue: defA.value,
            'onUpdate:modelValue': (v: FormDefinition) => (defA.value = v),
          }),
        ]),
        panel('设计器 B（v-model，独立实例）', [
          h(FormBuilder, {
            modelValue: defB.value,
            'onUpdate:modelValue': (v: FormDefinition) => (defB.value = v),
          }),
        ]),
        panel('操作器（渲染 defA，可填写提交）', [
          h(FormRenderer, {
            definition: defA.value,
            modelValue: data.value,
            'onUpdate:modelValue': (v: Record<string, unknown>) => (data.value = v),
            actions: true,
            'onSubmit': (v: Record<string, unknown>) => console.log('[api-demo] submit', v),
          }),
        ]),
      ],
    )
  },
}

createApp(App).use(plugin, formkitConfig()).mount('#app')
