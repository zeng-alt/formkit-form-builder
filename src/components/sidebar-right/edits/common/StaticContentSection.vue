<script setup lang="ts">
import { computed } from 'vue'
import { useFormField } from '@/composables/form-fields'
import { useFormBuilderI18n } from '@/i18n/context'
import { getStaticContentFields } from './static-content-props'
import EditsLayout from './EditsLayout.vue'
import { NInput } from 'naive-ui'

// 静态元素（h1 / text / p / divider / alert ...）的统一"内容"编辑区块。
// 这些元素没有 value/label 语义，内容统一存在各自 props 上（text / title / content / value），
// 由这里的 createPropsProp 按类型驱动渲染输入框。
const { currentFieldType, createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const sections = computed(() =>
  getStaticContentFields(currentFieldType.value).map((field) => ({
    ...field,
    model: createPropsProp<string>(field.key, ''),
  })),
)
</script>

<template>
  <EditsLayout v-for="section in sections" :key="section.key" class="mt-2">
    <label class="text-xs font-medium tracking-wide text-foreground/80 block mb-1">{{
      t(section.labelKey)
    }}</label>
    <n-input
      v-if="section.multiline"
      size="small"
      type="textarea"
      :autosize="{ minRows: 2, maxRows: 6 }"
      :placeholder="t('edits.placeholder.text')"
      :value="section.model.value"
      @update:value="(v: string) => (section.model.value = v)"
    />
    <n-input
      v-else
      size="small"
      :placeholder="t('edits.placeholder.text')"
      :value="section.model.value"
      @update:value="(v: string) => (section.model.value = v)"
    />
  </EditsLayout>
</template>
