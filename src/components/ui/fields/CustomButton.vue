<script setup lang="ts">
import { computed } from 'vue'
import { NButton } from 'naive-ui'
import { createSchemaRuntimeContext, runBindCode } from '@/utils/bind-runtime'
import InlineEditableText from '../formkit/InlineEditableText.vue'

const props = defineProps<{
  context: any
}>()

// 按钮配置已展平进 node.props（原 buttonProps 嵌套已废除）
const flat = computed(() => {
  return (
    props.context?.node?.props ||
    props.context?.attrs ||
    props.context?.buttonProps ||
    {}
  )
})

const text = computed(() => {
  return (
    flat.value?.text ??
    flat.value?.buttonText ??
    flat.value?.label ??
    props.context?.label ??
    ''
  )
})

const type = computed(() => {
  const configuredType = flat.value?.type
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

const size = computed(() => flat.value?.size || 'medium')

const align = computed(() => flat.value?.align || 'left')

const booleans = computed(() => ({
  block: !!flat.value?.block,
  bordered: flat.value?.bordered ?? true,
  circle: !!flat.value?.circle,
  dashed: !!flat.value?.dashed,
  disabled: flat.value?.disabled ?? props.context?.disabled ?? false,
  focusable: flat.value?.focusable ?? true,
  fullWidth: !!flat.value?.fullWidth,
  ghost: !!flat.value?.ghost,
  round: !!flat.value?.round,
  secondary: !!flat.value?.secondary,
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
      <InlineEditableText :context="props.context" prop-key="text" :value="text" />
    </NButton>
  </div>
</template>
