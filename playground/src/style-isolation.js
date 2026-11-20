import { createApp, h } from 'vue'
import { plugin } from '@formkit/vue'
import { BuilderPreview, FormRenderer, formkitConfig } from '../../dist/builder.es.js'
import '../../dist/builder.css'

createApp({
  render: () => h('div', [
    h(FormRenderer, { schema: [], theme: 'dark' }),
    h(BuilderPreview, { show: true, schema: [], title: 'Preview' }),
  ]),
}).use(plugin, formkitConfig()).mount('#app')
