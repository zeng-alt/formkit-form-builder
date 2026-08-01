<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NLi } from 'naive-ui'
import { computed } from 'vue'
import InlineEditableText from '../formkit/InlineEditableText.vue'

const props = defineProps<{
  context: FormKitFrameworkContext
}>()

const text = computed(() => String(props.context._value ?? ''))
</script>

<template>
  <NLi>
    <InlineEditableText :context="props.context" prop-key="value" :value="text" />
  </NLi>
</template>
