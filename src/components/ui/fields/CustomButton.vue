<script setup lang="ts">
import { computed } from 'vue'
import { NButton, type ButtonProps } from 'naive-ui'
import { runBindCode } from '@/utils/bind-runtime'
import type { FormKitFrameworkContext } from "@formkit/core";
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import InlineEditableText from '../formkit/InlineEditableText.vue'
import { useFormDefinition } from '@/composables/form-fields'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { formId, formVersion } = useFormDefinition()

// buttonType/buttonText/text/fullWidth/align 不是 NButton 属性（需单独映射或走插槽/外层 div），
// 其余配置（block/bordered/circle/dashed/focusable/ghost/round/secondary/size）与 NButton 原生
// 属性一一对应，且默认值一致，直接经 props v-bind 透传。
const { config, props, bind } = useSchemaAttrs(context, {
  omit: ['buttonText', 'buttonType', 'text', 'fullWidth', 'align'],
})

const disabled = computed<boolean>(() => Boolean(context?.disabled ?? false))

const text = computed(() => {
  // 优先 buttonText（编辑面板统一写入该键）；text 兼容旧数据（画布内联编辑遗留）；
  // context.label 兜底（默认 submit/reset 无 buttonText 时显示默认文案）
  return (
    (config.buttonText as string | undefined) ??
    (config.text as string | undefined) ??
    context?.label ??
    ''
  )
})

const type = computed<ButtonProps['type']>(() => {
  return (config.buttonType as ButtonProps['type'] | undefined) ?? 'primary'
})

const attrType = computed(() => {
  const formkitType = context.node.props.type
  if (formkitType === 'submit') return 'submit'
  if (formkitType === 'reset') return 'reset'
  return 'button'
})

const align = computed(() => (config.align as string | undefined) || 'left')

const fullWidth = computed<boolean>(() => !!config.fullWidth)

async function handleClick(e: MouseEvent) {
  const formkitType = context.node.props.type
  if (formkitType === 'reset') {
    e.preventDefault()
    context?.node?.root?.reset?.()
    return
  }
  const onClick = bind.value.onClick
  if (typeof onClick === 'string' && onClick.trim()) {
    await runBindCode(onClick, e, context, formId.value, formVersion.value)
  }
  context?.handlers?.click?.(e)
}
</script>

<template>
  <div
    :class="[
      'flex',
      fullWidth ? 'w-full' : '',
      align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start',
    ]"
  >
    <NButton
      v-bind="props"
      :class="[fullWidth ? 'w-full' : '']"
      :type="type"
      :attr-type="attrType"
      :disabled="disabled"
      @click="handleClick"
    >
      <InlineEditableText :context="context" prop-key="buttonText" :value="text" />
    </NButton>
  </div>
</template>
