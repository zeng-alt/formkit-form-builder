<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
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
  <!-- NAvatar 没有 disabled 概念（纯展示组件，naive-ui 运行时也没有声明这个 prop），
       不给禁用开关——留着只会是个拨了也没有任何效果的死开关 -->
  <NaiveBasicSection :size="true" />
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
