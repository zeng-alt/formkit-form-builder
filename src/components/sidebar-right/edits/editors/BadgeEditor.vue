<script setup lang="ts">
import { computed } from 'vue'
import { NColorPicker } from 'naive-ui'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import SelectInput from '../common/SelectInput.vue'
import SwitchInput from '../common/SwitchInput.vue'
import NumberInput from '../common/NumberInput.vue'
import TextInput from '../common/TextInput.vue'
import EditsLayout from '../common/EditsLayout.vue'
import { NO_EVENTS } from '@/elements/definitions/bind-events'

// 徽标容器（NBadge）：角标展示配置 + label/help 编辑。
// value 支持文本 / 数字 / 表达式（含 $ 的字符串，如 $count）。
const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const badgeValue = createPropsProp<string | number>('value', 0)
const badgeValueText = computed({
  get: () => String(badgeValue.value ?? ''),
  set: (text: string) => {
    const trimmed = text.trim()
    // 纯数字转 number，其余（文本 / 表达式）保留原字符串
    if (trimmed !== '' && /^-?\d+(\.\d+)?$/.test(trimmed)) badgeValue.value = Number(trimmed)
    else badgeValue.value = text
  },
})
const badgeMax = createPropsProp<number>('max', 99)
const badgeDot = createPropsProp<boolean>('dot', false)
const badgeShow = createPropsProp<boolean>('show', true)
const badgeShowZero = createPropsProp<boolean>('showZero', false)
const badgeProcessing = createPropsProp<boolean>('processing', false)
const badgeType = createPropsProp<string>('type', 'error')
const badgeColor = createPropsProp<string>('color', '')

// offset: [x, y]
const badgeOffset = createPropsProp<Array<string | number>>('offset', [])
const offsetX = computed({
  get: () => badgeOffset.value?.[0] ?? 0,
  set: (v: number) => {
    badgeOffset.value = [v, badgeOffset.value?.[1] ?? 0]
  },
})
const offsetY = computed({
  get: () => badgeOffset.value?.[1] ?? 0,
  set: (v: number) => {
    badgeOffset.value = [badgeOffset.value?.[0] ?? 0, v]
  },
})

const badgeTypeOptions = [
  { label: 'default', value: 'default' },
  { label: 'error', value: 'error' },
  { label: 'info', value: 'info' },
  { label: 'success', value: 'success' },
  { label: 'warning', value: 'warning' },
]
</script>

<template>
  <BindEditor :events="NO_EVENTS" />
  <LabelHelpSection />
  <TextInput
    :label="t('edits.props.value')"
    :value="badgeValueText"
    :placeholder="t('edits.props.valuePlaceholder')"
    @update:value="(v) => (badgeValueText = v)"
  />
  <NumberInput
    :label="t('edits.props.max')"
    :value="badgeMax"
    :placeholder="'99'"
    @update:value="(v) => (badgeMax = v ?? 99)"
  />
  <SelectInput
    :label="t('edits.props.type')"
    :value="badgeType"
    :options="badgeTypeOptions"
    @update:value="(v) => (badgeType = v)"
  />
  <EditsLayout>
    <label class="text-xs font-medium tracking-wide text-foreground/80 block mb-1">{{
      t('edits.props.color')
    }}</label>
    <n-color-picker
      size="small"
      :value="badgeColor || null"
      :show-alpha="false"
      @update:value="(v) => (badgeColor = (v as string) ?? '')"
    />
  </EditsLayout>
  <SwitchInput
    :label="t('edits.props.show')"
    :value="badgeShow"
    @update:value="(v) => (badgeShow = v)"
  />
  <SwitchInput
    :label="t('edits.props.showZero')"
    :value="badgeShowZero"
    @update:value="(v) => (badgeShowZero = v)"
  />
  <SwitchInput
    :label="t('edits.props.dot')"
    :value="badgeDot"
    @update:value="(v) => (badgeDot = v)"
  />
  <SwitchInput
    :label="t('edits.props.processing')"
    :value="badgeProcessing"
    @update:value="(v) => (badgeProcessing = v)"
  />
  <NumberInput
    :label="t('edits.props.offsetX')"
    :value="offsetX as number"
    :placeholder="'0'"
    @update:value="(v) => (offsetX = v ?? 0)"
  />
  <NumberInput
    :label="t('edits.props.offsetY')"
    :value="offsetY as number"
    :placeholder="'0'"
    @update:value="(v) => (offsetY = v ?? 0)"
  />
</template>
