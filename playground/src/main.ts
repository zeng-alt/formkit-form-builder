import { createApp } from 'vue'
import { plugin } from '@formkit/vue'
import App from './App.vue'
import config from '../../formkit.config.ts'
import 'uno.css'
import './style.css'

createApp(App).use(plugin, config).mount('#app')
