<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import ToggleInput from '../common/ToggleInput.vue'

const { numOfFiles } = useFormField()
const { t } = useFormBuilderI18n()
</script>

<template>
  <ToggleInput
    :label="t('edits.file.numberOfFiles')"
    :item-label-one="t('edits.file.multiple')"
    :item-label-two="t('edits.file.single')"
    value-one="true"
    value-two="false"
    type="single"
    :value="numOfFiles"
    @update:value="(v) => (numOfFiles = v)"
  />
  <!-- NUpload 没有 clearable prop，开了也不会生效 -->
  <NaiveBasicSection :size="true" :disabled="true" />
</template>
