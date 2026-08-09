<script setup lang="ts">
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import SelectInput from '../common/SelectInput.vue'
import SwitchInput from '../common/SwitchInput.vue'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import { NO_EVENTS } from '@/elements/definitions/bind-events'

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const type = createPropsProp<string>('type', 'line')
const placement = createPropsProp<string>('placement', 'top')
const size = createPropsProp<string>('size', 'medium')
const animated = createPropsProp<boolean>('animated', true)
const closable = createPropsProp<boolean>('closable', false)
</script>

<template>
  <BindEditor :events="NO_EVENTS" />
  <LabelHelpSection />
  <SelectInput
    :label="t('edits.props.type')"
    :value="type"
    :options="[
      { label: 'line', value: 'line' },
      { label: 'bar', value: 'bar' },
      { label: 'segment', value: 'segment' },
      { label: 'card', value: 'card' },
    ]"
    @update:value="(v) => (type = v)"
  />
  <SelectInput
    :label="t('edits.props.placement')"
    :value="placement"
    :options="[
      { label: 'top', value: 'top' },
      { label: 'bottom', value: 'bottom' },
      { label: 'left', value: 'left' },
      { label: 'right', value: 'right' },
    ]"
    @update:value="(v) => (placement = v)"
  />
  <SelectInput
    :label="t('edits.props.size')"
    :value="size"
    :options="[
      { label: 'small', value: 'small' },
      { label: 'medium', value: 'medium' },
      { label: 'large', value: 'large' },
    ]"
    @update:value="(v) => (size = v)"
  />
  <SwitchInput
    :label="t('edits.props.animated')"
    :value="animated"
    @update:value="(v) => (animated = v)"
  />
  <SwitchInput
    :label="t('edits.props.closable')"
    :value="closable"
    @update:value="(v) => (closable = v)"
  />
</template>
