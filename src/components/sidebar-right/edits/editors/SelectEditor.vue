<script setup lang="ts">
import LabelHelpSection from '../common/LabelHelpSection.vue'
import OptionsSourceTabs from '../common/OptionsSourceTabs.vue'
import SelectSwitchesSection from '../common/SelectSwitchesSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
</script>

<template>
  <LabelHelpSection />
  <OptionsSourceTabs />
  <SelectSwitchesSection />
  <NaiveBasicSection :size="true" :disabled="true" :clearable="true" />
</template>
