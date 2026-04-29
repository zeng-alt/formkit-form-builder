<script setup lang="ts">
import { computed } from 'vue'
import { useFormField } from '../../../../composables/form-fields'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import SwitchInput from '../common/SwitchInput.vue'
import TextInput from '../common/TextInput.vue'

const { createPropsProp } = useFormField()

const avatarSrc = createPropsProp<string>('src', '')
const avatarSizeRaw = createPropsProp<unknown>('avatarSize', 48)
const avatarSize = computed({
  get: () => {
    const value = avatarSizeRaw.value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'string') return value
    return '48'
  },
  set: (value: string) => {
    const parsed = Number(value)
    avatarSizeRaw.value = Number.isFinite(parsed) ? parsed : value
  },
})
const avatarRound = createPropsProp<boolean>('round', true)
const avatarBordered = createPropsProp<boolean>('bordered', false)
const avatarFallbackText = createPropsProp<string>('fallbackText', 'A')
</script>

<template>
  <LabelHelpSection />
  <TextInput label="src" placeholder="https://..." :value="avatarSrc" @update:value="(v) => (avatarSrc = v)" />
  <TextInput label="size" placeholder="48" :value="avatarSize" @update:value="(v) => (avatarSize = v)" />
  <TextInput
    label="fallback-text"
    placeholder="A"
    :value="avatarFallbackText"
    @update:value="(v) => (avatarFallbackText = v)"
  />
  <SwitchInput label="round" :value="avatarRound" @update:value="(v) => (avatarRound = v)" />
  <SwitchInput label="bordered" :value="avatarBordered" @update:value="(v) => (avatarBordered = v)" />
</template>
