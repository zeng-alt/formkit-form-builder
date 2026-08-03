import { createApp, ref, watchEffect, h } from 'vue'
import { FormKit, FormKitSchema, plugin } from '@formkit/vue'
import { getNode } from '@formkit/core'
import config from '../src/formkit.config.ts'
import { buildElementSchemaLibrary } from '../src/elements/formkit.ts'
import { evalExpression } from '../src/utils/expression-eval.ts'
import 'uno.css'
import './src/style.css'

const App = {
  setup() {
    const data = ref<any>({ base: 10 })
    const library = buildElementSchemaLibrary()
    const schema: any[] = [
      { $cmp: 'number', __key: 'base-key', props: { id: 'base', name: 'base', outerClass: 'col-span-12' }, outerClass: 'col-span-12', name: 'base', label: 'Base' },
      {
        $cmp: 'text', __key: 'computed-key',
        props: { id: 'computed', name: 'computed', useExpressionValue: true, __raw__valueExpression: '($base + 100)', outerClass: 'col-span-12' },
        outerClass: 'col-span-12', name: 'computed', label: 'Computed',
      },
      {
        $cmp: 'text', __key: 'cond-key',
        props: { id: 'cond', name: 'cond', outerClass: 'col-span-12' },
        outerClass: 'col-span-12', name: 'cond', label: 'Cond', if: '$base > 5',
      },
    ]
    const lastDepsSig = ref<Record<string, string>>({})
    watchEffect(() => {
      const currentData = data.value as Record<string, unknown>
      let nextData: Record<string, unknown> | null = null
      for (const field of schema) {
        const props = field.props && typeof field.props === 'object' ? field.props : {}
        if (!(props.useExpressionValue ?? field.useExpressionValue)) continue
        if (typeof field.name !== 'string' || !field.name) continue
        const expr = props.__raw__valueExpression ?? field.__raw__valueExpression ?? props.valueExpression ?? field.valueExpression
        if (typeof expr !== 'string' || !expr.trim()) continue
        const evalResult = evalExpression(expr, currentData)
        const depsSig = evalResult.deps.filter((k) => k !== field.name).map((k) => `${k}:${String(currentData[k] ?? '')}`).join('|')
        if (lastDepsSig.value[field.name] === depsSig) continue
        lastDepsSig.value = { ...lastDepsSig.value, [field.name]: depsSig }
        if (!evalResult.ok) continue
        const result = evalResult.value === null || evalResult.value === undefined ? '' : String(evalResult.value)
        const node = getNode(field.name)
        if (node) {
          node.input(result, false)
        } else {
          // field not yet registered (initial mount) -> seed data so FormKit initializes
          if (currentData[field.name] !== result) {
            if (!nextData) nextData = { ...currentData }
            nextData[field.name] = result
          }
        }
      }
      if (nextData) data.value = nextData
    })

    const report = ref('')
    const update = () => { report.value = JSON.stringify({ data: data.value }); window.__exprReport = report.value }
    update()
    return () =>
      h('div', { class: 'row' }, [
        h(FormKit, { type: 'form', modelValue: data.value, 'onUpdate:modelValue': (v) => { data.value = v; update() } }, {
          default: () => [h(FormKitSchema, { schema, data: data.value, library })],
        }),
        h('pre', report.value),
      ])
  },
}

const app = createApp(App)
app.use(plugin, config)
app.mount('#app')
