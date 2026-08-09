<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import NumberInput from './NumberInput.vue'
import SelectInput from './SelectInput.vue'
import SwitchInput from './SwitchInput.vue'

const props = withDefaults(
  defineProps<{
    size?: boolean
    disabled?: boolean
    clearable?: boolean
    bordered?: boolean
    readonly?: boolean
    round?: boolean
    autofocus?: boolean
    showCount?: boolean
    showPasswordOn?: boolean
    maxlength?: boolean
    minlength?: boolean
    sizeOptions?: Array<{ label: string; value: string }>
  }>(),
  {
    sizeOptions: () => [
      { label: 'tiny', value: 'tiny' },
      { label: 'small', value: 'small' },
      { label: 'medium', value: 'medium' },
      { label: 'large', value: 'large' },
    ],
  },
)

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const naiveSize = createPropsProp<string>('size', 'medium')
const naiveDisabled = createPropsProp<boolean>('disabled', false)
const naiveClearable = createPropsProp<boolean>('clearable', true)
const naiveBordered = createPropsProp<boolean>('bordered', true)
const naiveReadonly = createPropsProp<boolean>('readonly', false)
const naiveRound = createPropsProp<boolean>('round', false)
const naiveAutofocus = createPropsProp<boolean>('autofocus', false)
const naiveShowCount = createPropsProp<boolean>('showCount', false)
const naiveShowPasswordOn = createPropsProp<string>('showPasswordOn', 'click')
const naiveMaxlength = createPropsProp<number | null>('maxlength', null)
const naiveMinlength = createPropsProp<number | null>('minlength', null)
</script>

<template>
  <SelectInput
    v-if="props.size"
    :label="t('edits.props.size')"
    :value="naiveSize"
    :options="props.sizeOptions"
    @update:value="(v) => (naiveSize = v)"
  />
  <SwitchInput
    v-if="props.disabled"
    :label="t('edits.props.disabled')"
    :value="naiveDisabled"
    @update:value="(v) => (naiveDisabled = v)"
  />
  <SwitchInput
    v-if="props.clearable"
    :label="t('edits.props.clearable')"
    :value="naiveClearable"
    @update:value="(v) => (naiveClearable = v)"
  />
  <SwitchInput
    v-if="props.bordered"
    :label="t('edits.props.bordered')"
    :value="naiveBordered"
    @update:value="(v) => (naiveBordered = v)"
  />
  <SwitchInput
    v-if="props.readonly"
    :label="t('edits.props.readonly')"
    :value="naiveReadonly"
    @update:value="(v) => (naiveReadonly = v)"
  />
  <SwitchInput
    v-if="props.round"
    :label="t('edits.props.round')"
    :value="naiveRound"
    @update:value="(v) => (naiveRound = v)"
  />
  <SwitchInput
    v-if="props.autofocus"
    :label="t('edits.props.autofocus')"
    :value="naiveAutofocus"
    @update:value="(v) => (naiveAutofocus = v)"
  />
  <SwitchInput
    v-if="props.showCount"
    :label="t('edits.props.showCount')"
    :value="naiveShowCount"
    @update:value="(v) => (naiveShowCount = v)"
  />
  <SelectInput
    v-if="props.showPasswordOn"
    :label="t('edits.props.showPasswordOn')"
    :value="naiveShowPasswordOn"
    :options="[
      { label: 'click', value: 'click' },
      { label: 'mousedown', value: 'mousedown' },
    ]"
    @update:value="(v) => (naiveShowPasswordOn = v)"
  />
  <NumberInput
    v-if="props.maxlength"
    :label="t('edits.props.maxlength')"
    placeholder="null"
    :value="naiveMaxlength"
    @update:value="(v) => (naiveMaxlength = v)"
  />
  <NumberInput
    v-if="props.minlength"
    :label="t('edits.props.minlength')"
    placeholder="null"
    :value="naiveMinlength"
    @update:value="(v) => (naiveMinlength = v)"
  />
</template>
