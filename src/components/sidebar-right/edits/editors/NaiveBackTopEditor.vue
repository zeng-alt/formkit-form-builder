<script setup lang="ts">
import { computed } from 'vue'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import BindEditor from '../BindEditor.vue'
import TextInput from '../common/TextInput.vue'
import SwitchInput from '../common/SwitchInput.vue'
import { NO_EVENTS } from '@/elements/definitions/bind-events'

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const show = createPropsProp<boolean | undefined>('show', true)
const rightRaw = createPropsProp<unknown>('right', 40)
const bottomRaw = createPropsProp<unknown>('bottom', 40)
const visibilityHeightRaw = createPropsProp<unknown>('visibilityHeight', 0)

const normalizeLength = (raw: unknown): string => {
  if (raw === null || raw === undefined) return ''
  return String(raw)
}

const toNumberOrString = (raw: string): number | string => {
  const v = raw.trim()
  if (!v) return ''
  const n = Number(v)
  return Number.isFinite(n) ? n : v
}

const right = computed({
  get: () => normalizeLength(rightRaw.value),
  set: (v: string) => {
    rightRaw.value = toNumberOrString(v)
  },
})

const bottom = computed({
  get: () => normalizeLength(bottomRaw.value),
  set: (v: string) => {
    bottomRaw.value = toNumberOrString(v)
  },
})

const visibilityHeight = computed({
  get: () => normalizeLength(visibilityHeightRaw.value),
  set: (v: string) => {
    const n = Number(v)
    visibilityHeightRaw.value = Number.isFinite(n) ? n : 0
  },
})
</script>

<template>
  <BindEditor :events="NO_EVENTS" />
  <SwitchInput :label="t('edits.props.show')" :value="show" @update:value="(v) => (show = v)" />
  <TextInput
    :label="t('edits.props.right')"
    placeholder="40"
    :value="right"
    @update:value="(v) => (right = v)"
  />
  <TextInput
    :label="t('edits.props.bottom')"
    placeholder="40"
    :value="bottom"
    @update:value="(v) => (bottom = v)"
  />
  <TextInput
    :label="t('edits.props.visibilityHeight')"
    placeholder="0"
    :value="visibilityHeight"
    @update:value="(v) => (visibilityHeight = v)"
  />
</template>
