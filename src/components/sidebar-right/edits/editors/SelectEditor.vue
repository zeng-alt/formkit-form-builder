<script setup lang="ts">
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import OptionsSourceTabs from '../common/OptionsSourceTabs.vue'
import SelectSwitchesSection from '../common/SelectSwitchesSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import { INPUT_FULL_EVENTS } from '@/elements/definitions/bind-events'
</script>

<template>
  <BindEditor :events="INPUT_FULL_EVENTS" />
  <LabelHelpSection />
  <OptionsSourceTabs />
  <SelectSwitchesSection />
  <NaiveBasicSection :size="true" :disabled="true" :clearable="true" />
</template>
