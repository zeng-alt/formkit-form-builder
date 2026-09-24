<script setup lang="ts">
import EditorSection from '../common/EditorSection.vue'
import SwitchInput from '../common/SwitchInput.vue'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const listBordered = createPropsProp<boolean>('bordered', true)
</script>

<template>
  <EditorSection :title="t('edits.sections.appearance')">
    <SwitchInput
      :label="t('edits.props.bordered')"
      :value="listBordered"
      @update:value="(v) => (listBordered = v)"
    />
  </EditorSection>
</template>
