<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import BindEditor from '../BindEditor.vue'
import TextInput from '../common/TextInput.vue'
import SelectInput from '../common/SelectInput.vue'
import { NO_EVENTS } from '@/elements/definitions/bind-events'

const { createPropsProp } = useFormField()

const linkHref = createPropsProp<string>('href', 'https://www.example.com')
const linkTarget = createPropsProp<string>('target', '_blank')
</script>

<template>
  <BindEditor :events="NO_EVENTS" />
  <TextInput
    label="href"
    placeholder="https://..."
    :value="linkHref"
    @update:value="(v) => (linkHref = v)"
  />
  <SelectInput
    label="target"
    :value="linkTarget"
    :options="[
      { label: '_blank', value: '_blank' },
      { label: '_self', value: '_self' },
    ]"
    @update:value="(v) => (linkTarget = v)"
  />
</template>
