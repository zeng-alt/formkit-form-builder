<script setup lang="ts">
import OptionsTagsSection from '../common/OptionsTagsSection.vue'
import { useFormBuilderI18n } from '../../../../i18n/context'

const { t } = useFormBuilderI18n()
</script>

<template>
  <OptionsTagsSection :label="t('edits.items')" />
</template>
