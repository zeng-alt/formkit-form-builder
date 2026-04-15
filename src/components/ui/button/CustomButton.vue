<script setup lang="ts">
import { computed } from 'vue'
import { NButton } from 'naive-ui'

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
}>()

const type = computed(() => {
  const formkitType = props.context.node.props.type
  return formkitType === 'submit' ? 'primary' : 'default'
})

const attrType = computed(() => {
  const formkitType = props.context.node.props.type
  return formkitType === 'submit' ? 'submit' : 'button'
})
</script>

<template>
  <NButton
    :type="type"
    :attr-type="attrType"
  >
    {{ context.label }}
  </NButton>
</template>
