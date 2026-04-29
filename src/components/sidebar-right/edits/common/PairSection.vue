<script setup lang="ts">
import { computed } from 'vue'
import { useFormBuilderI18n } from '../../../../i18n/context'
import { useFormField } from '../../../../composables/form-fields'
import SwitchInput from './SwitchInput.vue'
import TextInput from './TextInput.vue'

const { t } = useFormBuilderI18n()
const { createPropsProp } = useFormField()

const pair = createPropsProp<boolean>('pair', false)
const separator = createPropsProp<string>('separator', '-')

const showSeparator = computed(() => Boolean(pair.value))
</script>

<template>
  <SwitchInput
    :label="t('edits.pair.label')"
    :value="pair"
    @update:value="(v) => (pair = v)"
  />
  <TextInput
    v-if="showSeparator"
    :label="t('edits.pair.separatorLabel')"
    :placeholder="t('edits.pair.separatorPlaceholder')"
    :value="separator"
    @update:value="(v) => (separator = v)"
  />
</template>

