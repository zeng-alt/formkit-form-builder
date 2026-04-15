<script setup lang="ts">
import { computed } from 'vue'
import { NButton } from 'naive-ui'

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
}>()

const buttonProps = computed(() => props.context?.node?.props?.buttonProps || {})

const type = computed(() => {
  const configuredType = buttonProps.value?.type
  if (configuredType) return configuredType
  const formkitType = props.context.node.props.type
  return formkitType === 'submit' ? 'primary' : 'default'
})

const attrType = computed(() => {
  const formkitType = props.context.node.props.type
  return formkitType === 'submit' ? 'submit' : 'button'
})

const size = computed(() => buttonProps.value?.size || 'medium')

const align = computed(() => buttonProps.value?.align || 'left')

const booleans = computed(() => ({
  block: !!buttonProps.value?.block,
  bordered: buttonProps.value?.bordered ?? true,
  circle: !!buttonProps.value?.circle,
  dashed: !!buttonProps.value?.dashed,
  disabled: buttonProps.value?.disabled ?? props.context?.disabled ?? false,
  focusable: buttonProps.value?.focusable ?? true,
  fullWidth: !!buttonProps.value?.fullWidth,
  ghost: !!buttonProps.value?.ghost,
  round: !!buttonProps.value?.round,
  secondary: !!buttonProps.value?.secondary,
}))

function handleClick(e: MouseEvent) {
  props.context?.handlers?.click?.(e)
}
</script>

<template>
  <div :class="['flex', booleans.fullWidth ? 'w-full' : '', `justify-${align === 'center' ? 'center' : align === 'right' ? 'end' : 'start'}`]">
    <NButton
      :class="[booleans.fullWidth ? 'w-full' : '']"
      :type="type"
      :size="size"
      :attr-type="attrType"
      :block="booleans.block"
      :bordered="booleans.bordered"
      :circle="booleans.circle"
      :dashed="booleans.dashed"
      :disabled="booleans.disabled"
      :focusable="booleans.focusable"
      :ghost="booleans.ghost"
      :round="booleans.round"
      :secondary="booleans.secondary"
      @click="handleClick"
    >
      {{ context.label }}
    </NButton>
  </div>
</template>
