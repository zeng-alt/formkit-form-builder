<script setup lang="ts">
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import { NO_EVENTS } from '@/elements/definitions/bind-events'
</script>

<template>
  <BindEditor :events="NO_EVENTS" />
  <LabelHelpSection />
</template>
