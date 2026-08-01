<script setup lang="ts">
import { provideFormBuilderConfig } from '../composables/use-config'
import type { FormBuilderConfig } from '../types/env'
import { registerElements } from '../plugin/register-element'

interface Props {
  config: FormBuilderConfig
}

const props = defineProps<Props>()

// 配置式元素注册：挂载前打通 DSL 注册表 / FormKit input / 容器画布（幂等）
registerElements(props.config.elements)

provideFormBuilderConfig(props.config)
</script>

<template>
  <div class="form-builder-provider">
    <slot />
  </div>
</template>
