<script setup lang="ts">
import { NColorPicker } from 'naive-ui'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import BindEditor from '../BindEditor.vue'
import SelectInput from '../common/SelectInput.vue'
import NumberInput from '../common/NumberInput.vue'
import SwitchInput from '../common/SwitchInput.vue'
import EditsLayout from '../common/EditsLayout.vue'
import { NO_EVENTS } from '@/elements/definitions/bind-events'

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const progressPercentage = createPropsProp<number>('percentage', 60)
const progressType = createPropsProp<string>('progressType', 'line')
const progressStatus = createPropsProp<string>('status', 'default')
const progressProcessing = createPropsProp<boolean>('processing', false)
const progressShowIndicator = createPropsProp<boolean>('showIndicator', true)
const progressHeight = createPropsProp<number>('height', 8)
const progressStrokeWidth = createPropsProp<number>('strokeWidth', 6)
const progressColor = createPropsProp<string | undefined>('color', undefined)
const progressRailColor = createPropsProp<string | undefined>('railColor', undefined)
</script>

<template>
  <BindEditor :events="NO_EVENTS" />
  <NumberInput
    :label="t('edits.props.percentage')"
    :value="progressPercentage"
    placeholder="60"
    @update:value="(v) => (progressPercentage = v ?? 0)"
  />
  <SelectInput
    :label="t('edits.props.type')"
    :value="progressType"
    :options="[
      { label: 'line', value: 'line' },
      { label: 'circle', value: 'circle' },
      { label: 'dashboard', value: 'dashboard' },
    ]"
    @update:value="(v) => (progressType = v)"
  />
  <SelectInput
    :label="t('edits.props.status')"
    :value="progressStatus"
    :options="[
      { label: 'default', value: 'default' },
      { label: 'success', value: 'success' },
      { label: 'info', value: 'info' },
      { label: 'warning', value: 'warning' },
      { label: 'error', value: 'error' },
    ]"
    @update:value="(v) => (progressStatus = v)"
  />
  <SwitchInput
    :label="t('edits.props.processing')"
    :value="progressProcessing"
    @update:value="(v) => (progressProcessing = v)"
  />
  <SwitchInput
    :label="t('edits.props.showIndicator')"
    :value="progressShowIndicator"
    @update:value="(v) => (progressShowIndicator = v)"
  />
  <NumberInput
    v-if="progressType === 'line'"
    :label="t('edits.props.height')"
    :value="progressHeight"
    placeholder="8"
    @update:value="(v) => (progressHeight = v ?? 0)"
  />
  <NumberInput
    v-else
    :label="t('edits.props.strokeWidth')"
    :value="progressStrokeWidth"
    placeholder="6"
    @update:value="(v) => (progressStrokeWidth = v ?? 0)"
  />
  <EditsLayout>
    <label class="text-xs font-medium tracking-wide text-foreground/80 block mb-1">{{
      t('edits.props.color')
    }}</label>
    <n-color-picker
      size="small"
      :value="progressColor || null"
      :show-alpha="false"
      @update:value="(v) => (progressColor = (v as string) ?? undefined)"
    />
  </EditsLayout>
  <EditsLayout>
    <label class="text-xs font-medium tracking-wide text-foreground/80 block mb-1">{{
      t('edits.props.railColor')
    }}</label>
    <n-color-picker
      size="small"
      :value="progressRailColor || null"
      :show-alpha="false"
      @update:value="(v) => (progressRailColor = (v as string) ?? undefined)"
    />
  </EditsLayout>
</template>