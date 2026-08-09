<script setup lang="ts">
import BindEditor from '../BindEditor.vue'
import OptionsTagsSection from '../common/OptionsTagsSection.vue'
import { useFormBuilderI18n } from '../../../../i18n/context'
import { NO_EVENTS } from '@/elements/definitions/bind-events'

const { t } = useFormBuilderI18n()
</script>

<template>
  <BindEditor :events="NO_EVENTS" />
  <OptionsTagsSection :label="t('edits.items')" />
</template>
