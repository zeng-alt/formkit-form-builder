// ═══ 只用渲染入口的独立页面 ═══════════════════════════════════════════════════════
// 只从 @zeng-alt/formkit-form-builder/renderer 导入，验证这个入口能独立渲染一个
// 包含字段、容器、条件必填的表单——不依赖设计器（画布/侧边栏）、不依赖
// @formkit/drag-and-drop、不依赖 CodeMirror。访问 http://localhost:5173/renderer-only.html
import { createApp, h, ref } from 'vue'
import { plugin } from '@formkit/vue'
import {
  formkitConfig,
  FormRenderer,
  type FormDefinition,
} from '@zeng-alt/formkit-form-builder/renderer'
import 'uno.css'
import './src/style.css'

// 字段（姓名）+ 容器（card 包一个邮箱字段）+ 条件必填（姓名非空时，电话变为必填）
const definition: FormDefinition = {
  version: 1,
  id: 'renderer-only-demo',
  name: 'renderer-only-demo',
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
        id: 'f-name',
        key: 'f-name',
        category: 'field',
        type: 'text',
        renderAs: 'cmp',
        name: 'name',
        label: '姓名',
        outerClass: 'col-span-12',
      },
      {
        id: 'c-card',
        key: 'c-card',
        category: 'container',
        type: 'card',
        renderAs: 'cmp',
        dataType: 'object',
        name: 'contact',
        label: '联系方式',
        outerClass: 'col-span-12',
        children: [
          {
            id: 'f-email',
            key: 'f-email',
            category: 'field',
            type: 'email',
            renderAs: 'cmp',
            name: 'email',
            label: '邮箱',
            outerClass: 'col-span-12',
          },
        ],
      },
      {
        id: 'f-phone',
        key: 'f-phone',
        category: 'field',
        type: 'tel',
        renderAs: 'cmp',
        name: 'phone',
        label: '电话（填写姓名后必填）',
        outerClass: 'col-span-12',
        requiredIf: { type: 'call', fn: 'notEmpty', args: [{ type: 'field', name: 'name' }] },
      },
    ],
  },
}

const data = ref<Record<string, unknown>>({})
const submitted = ref<Record<string, unknown> | null>(null)

const App = {
  setup() {
    return { data, submitted }
  },
  render() {
    return h('div', { style: 'max-width:480px;margin:24px auto;padding:0 16px' }, [
      h('h1', { style: 'font-size:16px;margin-bottom:12px' }, '渲染入口独立使用 Demo'),
      h('div', { 'data-testid': 'renderer-only-form' }, [
        h(FormRenderer, {
          definition,
          modelValue: data.value,
          'onUpdate:modelValue': (v: Record<string, unknown>) => (data.value = v),
          actions: true,
          onSubmit: (v: Record<string, unknown>) => {
            submitted.value = v
          },
        }),
      ]),
      submitted.value
        ? h(
            'pre',
            { 'data-testid': 'renderer-only-submitted', style: 'margin-top:16px;font-size:12px' },
            JSON.stringify(submitted.value, null, 2),
          )
        : null,
    ])
  },
}

createApp(App).use(plugin, formkitConfig()).mount('#app')
