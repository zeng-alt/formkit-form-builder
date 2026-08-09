<script setup lang="ts">
import BindEditor from '../BindEditor.vue'
import OptionsTagsSection from '../common/OptionsTagsSection.vue'
import { NO_EVENTS } from '@/elements/definitions/bind-events'
</script>

<template>
  <BindEditor :events="NO_EVENTS" />
  <OptionsTagsSection label="Items" />
</template>
