<script setup lang="ts">
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import OptionsSourceTabs from '../common/OptionsSourceTabs.vue'
import OptionsLayoutSection from '../common/OptionsLayoutSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import { INPUT_BASIC_EVENTS } from '@/elements/definitions/bind-events'
</script>

<template>
  <BindEditor :events="INPUT_BASIC_EVENTS" />
  <LabelHelpSection />
  <OptionsSourceTabs />
  <OptionsLayoutSection />
  <NaiveBasicSection :size="true" :disabled="true" />
</template>
