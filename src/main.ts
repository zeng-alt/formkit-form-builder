import { createApp } from 'vue'
import 'uno.css'
import './style.css'
import { plugin } from '@formkit/vue'
import App from './App.vue'
import config from '../formkit.config.ts'

createApp(App).use(plugin, config).mount('#app')
