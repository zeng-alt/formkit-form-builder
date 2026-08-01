<script setup lang="ts">
import { computed } from 'vue'
import { NButton } from 'naive-ui'
import { createSchemaRuntimeContext, runBindCode } from '@/utils/bind-runtime'

const props = defineProps<{
  context: any
}>()

const buttonProps = computed(() => {
  return (
    props.context?.attrs?.buttonProps ||
    props.context?.node?.props?.buttonProps ||
    props.context?.buttonProps ||
    {}
  )
})

const text = computed(() => {
  return (
    buttonProps.value?.text ??
    props.context?.attrs?.buttonText ??
    props.context?.node?.props?.buttonText ??
    props.context?.buttonText ??
    props.context?.attrs?.label ??
    props.context?.node?.props?.label ??
    props.context?.label ??
    ''
  )
})

const type = computed(() => {
  const configuredType = buttonProps.value?.type
  if (configuredType && configuredType !== 'submit' && configuredType !== 'button')
    return configuredType
  const formkitType = props.context.node.props.type
  return formkitType === 'submit' ? 'primary' : 'default'
})

const attrType = computed(() => {
  const formkitType = props.context.node.props.type
  if (formkitType === 'submit') return 'submit'
  return 'button'
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

async function handleClick(e: MouseEvent) {
  const formkitType = props.context.node.props.type
  if (formkitType === 'reset') {
    e.preventDefault()
    props.context?.node?.root?.reset?.()
    return
  }
  const bind = props.context?.node?.props?.__bind
  const onClick = bind && typeof bind === 'object' ? (bind as any).onClick : undefined
  if (typeof onClick === 'string' && onClick.trim()) {
    const $ = createSchemaRuntimeContext(props.context, e)
    await runBindCode(onClick, {
      event: e,
      data: props.context?.node?.root?.value,
      attrs: props.context?.attrs,
      $,
    })
  }
  props.context?.handlers?.click?.(e)
}
</script>

<template>
  <div
    :class="[
      'flex',
      booleans.fullWidth ? 'w-full' : '',
      align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start',
    ]"
  >
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
      {{ text }}
    </NButton>
  </div>
</template>
