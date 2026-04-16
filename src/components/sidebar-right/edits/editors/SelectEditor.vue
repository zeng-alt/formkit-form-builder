<script setup lang="ts">
import LabelHelpSection from '../common/LabelHelpSection.vue'
import OptionsTagsSection from '../common/OptionsTagsSection.vue'
import SelectSwitchesSection from '../common/SelectSwitchesSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
</script>

<template>
  <LabelHelpSection />
  <OptionsTagsSection />
  <SelectSwitchesSection />
  <NaiveBasicSection :size="true" :disabled="true" :clearable="true" />
</template>

