<script setup lang="ts">

import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/NaiveBasicSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import SwitchInput from '../common/SwitchInput.vue'
import TextInput from '../common/TextInput.vue'
import { DISPLAY_CLICK_EVENTS } from '@/elements/definitions/bind-events'

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const avatarSrc = createPropsProp<string>('src', '')

const avatarRound = createPropsProp<boolean>('round', true)
const avatarBordered = createPropsProp<boolean>('bordered', false)
const avatarFallbackText = createPropsProp<string>('fallbackText', 'A')
</script>

<template>
  <BindEditor :events="DISPLAY_CLICK_EVENTS" />
  <LabelHelpSection />
  <TextInput
    :label="t('edits.props.src')"
    placeholder="https://..."
    :value="avatarSrc"
    @update:value="(v) => (avatarSrc = v)"
  />
  <NaiveBasicSection :size="true" :disabled="true" />
  <TextInput
    :label="t('edits.props.fallbackText')"
    placeholder="A"
    :value="avatarFallbackText"
    @update:value="(v) => (avatarFallbackText = v)"
  />
  <SwitchInput
    :label="t('edits.props.round')"
    :value="avatarRound"
    @update:value="(v) => (avatarRound = v)"
  />
  <SwitchInput
    :label="t('edits.props.bordered')"
    :value="avatarBordered"
    @update:value="(v) => (avatarBordered = v)"
  />
</template>
