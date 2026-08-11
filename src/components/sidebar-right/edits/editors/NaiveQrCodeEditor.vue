<script setup lang="ts">
import { NColorPicker } from 'naive-ui'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import BindEditor from '../BindEditor.vue'
import SelectInput from '../common/SelectInput.vue'
import NumberInput from '../common/NumberInput.vue'
import EditsLayout from '../common/EditsLayout.vue'
import { NO_EVENTS } from '@/elements/definitions/bind-events'

// 二维码内容（value）由统一"内容"编辑区块（StaticContentSection）编辑
const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const qrSize = createPropsProp<number>('size', 128)
const qrPadding = createPropsProp<number>('padding', 10)
const qrColor = createPropsProp<string>('color', '#000000')
const qrBackgroundColor = createPropsProp<string>('backgroundColor', '#ffffff')
const qrErrorCorrectionLevel = createPropsProp<string>('errorCorrectionLevel', 'M')

const levelOptions = [
  { label: 'L', value: 'L' },
  { label: 'M', value: 'M' },
  { label: 'Q', value: 'Q' },
  { label: 'H', value: 'H' },
]
</script>

<template>
  <BindEditor :events="NO_EVENTS" />
  <NumberInput
    :label="t('edits.props.size')"
    :value="qrSize"
    placeholder="128"
    @update:value="(v) => (qrSize = v ?? 128)"
  />
  <SelectInput
    :label="t('edits.props.errorCorrectionLevel')"
    :value="qrErrorCorrectionLevel"
    :options="levelOptions"
    @update:value="(v) => (qrErrorCorrectionLevel = v)"
  />
  <EditsLayout>
    <label class="text-xs font-medium tracking-wide text-foreground/80 block mb-1">{{
      t('edits.props.color')
    }}</label>
    <n-color-picker
      size="small"
      :value="qrColor || null"
      :show-alpha="false"
      @update:value="(v) => (qrColor = (v as string) ?? '#000000')"
    />
  </EditsLayout>
  <EditsLayout>
    <label class="text-xs font-medium tracking-wide text-foreground/80 block mb-1">{{
      t('edits.props.backgroundColor')
    }}</label>
    <n-color-picker
      size="small"
      :value="qrBackgroundColor || null"
      :show-alpha="false"
      @update:value="(v) => (qrBackgroundColor = (v as string) ?? '#ffffff')"
    />
  </EditsLayout>
  <NumberInput
    :label="t('edits.props.padding')"
    :value="qrPadding"
    placeholder="10"
    @update:value="(v) => (qrPadding = v ?? 10)"
  />
</template>
