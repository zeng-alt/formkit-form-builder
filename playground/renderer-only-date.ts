// ═══ 只用渲染入口的独立页面：含日期字段 ═══════════════════════════════════════════
// 与 renderer-only.ts（纯文本字段）配对使用，验证字段按需加载（任务 X）：
// 只打开 renderer-only.html 不应该拉取日期组件相关 chunk，打开这个页面则应该正常
// 拉取、渲染日期选择器并能正常选择日期。见 e2e/lazy-fields.spec.ts。
import { createApp, h, ref } from 'vue'
import { plugin } from '@formkit/vue'
import {
  formkitConfig,
  FormRenderer,
  type FormDefinition,
} from '@zeng-alt/formkit-form-builder/renderer'
import 'uno.css'
import './src/style.css'

const definition: FormDefinition = {
  version: 1,
  id: 'renderer-only-date-demo',
  name: 'renderer-only-date-demo',
  settings: { labelAlign: 'top', labelWidth: 80 },
  root: {
    id: 'root',
    key: 'root',
    category: 'container',
    type: 'group',
    renderAs: 'formkit',
    dataType: 'object',
    children: [
      {
        id: 'f-birthday',
        key: 'f-birthday',
        category: 'field',
        type: 'date',
        renderAs: 'cmp',
        name: 'birthday',
        label: '生日',
        outerClass: 'col-span-12',
      },
    ],
  },
}

const data = ref<Record<string, unknown>>({})

const App = {
  setup() {
    return { data }
  },
  render() {
    return h('div', { style: 'max-width:480px;margin:24px auto;padding:0 16px' }, [
      h('h1', { style: 'font-size:16px;margin-bottom:12px' }, '渲染入口独立使用 Demo（日期字段）'),
      h('div', { 'data-testid': 'renderer-only-date-form' }, [
        h(FormRenderer, {
          definition,
          modelValue: data.value,
          'onUpdate:modelValue': (v: Record<string, unknown>) => (data.value = v),
        }),
      ]),
    ])
  },
}

createApp(App).use(plugin, formkitConfig()).mount('#app')
