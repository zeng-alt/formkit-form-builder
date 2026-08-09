<script setup lang="ts">
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import PlaceholderSection from '../common/PlaceholderSection.vue'
import OptionsTagsSection from '../common/OptionsTagsSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import { INPUT_FULL_EVENTS } from '@/elements/definitions/bind-events'
</script>

<template>
  <BindEditor :events="INPUT_FULL_EVENTS" />
  <LabelHelpSection />
  <PlaceholderSection />
  <OptionsTagsSection />
  <NaiveBasicSection :size="true" :disabled="true" />
</template>
