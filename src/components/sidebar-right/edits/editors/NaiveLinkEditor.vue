<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import EditorSection from '../common/EditorSection.vue'
import TextInput from '../common/TextInput.vue'
import SelectInput from '../common/SelectInput.vue'

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const linkHref = createPropsProp<string>('href', 'https://www.example.com')
const linkTarget = createPropsProp<string>('target', '_blank')
</script>

<template>
  <TextInput
    :label="t('edits.props.href')"
    placeholder="https://..."
    :value="linkHref"
    @update:value="(v) => (linkHref = v)"
  />
  <EditorSection :title="t('edits.sections.appearance')">
    <SelectInput
      :label="t('edits.props.target')"
      :value="linkTarget"
      :options="[
        { label: '_blank', value: '_blank' },
        { label: '_self', value: '_self' },
      ]"
      @update:value="(v) => (linkTarget = v)"
    />
  </EditorSection>
</template>
