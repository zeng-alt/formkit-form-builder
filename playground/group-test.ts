import { createApp, h } from 'vue'
import { plugin } from '@formkit/vue'
import config from '../src/formkit.config.ts'
import 'uno.css'
import './src/style.css'
import FormSchemaRenderer from '../src/renderer/FormSchemaRenderer.vue'

const schema = [
  {
    $formkit: 'form',
    name: 'form',
    props: { labelPosition: 'top', labelWidth: 80 },
    children: [
      {
        $formkit: 'group',
        name: 'field_1',
        id: 'g1',
        __key: '64d3319e',
        label: '分组',
        outerClass: 'col-span-12',
        children: [
          {
            $cmp: 'text',
            name: 'a',
            id: 'c1',
            __key: 'c1',
            outerClass: 'col-span-6',
            props: { label: 'A', name: 'a', id: 'c1', outerClass: 'col-span-6' },
          },
          {
            $cmp: 'text',
            name: 'b',
            id: 'c2',
            __key: 'c2',
            outerClass: 'col-span-12',
            props: { label: 'B', name: 'b', id: 'c2', outerClass: 'col-span-12' },
          },
          {
            $formkit: 'text',
            name: 'c',
            id: 'c3',
            __key: 'c3',
            outerClass: 'col-span-4',
            props: { label: 'C' },
          },
        ],
      },
    ],
  },
]

const app = createApp({
  render: () => h(FormSchemaRenderer, { schema, formClass: 'w-full !grid !grid-cols-12 gap-x-4 gap-y-2' }),
})
app.use(plugin, config)
app.mount('#app')
