<script setup lang="ts">
import { cn } from '../../../utils/utils'
import type { HTMLAttributes } from 'vue'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div :class="cn('py-2 rounded-lg flex flex-col justify-center gap-2', props.class)">
    <slot />
  </div>
</template>
