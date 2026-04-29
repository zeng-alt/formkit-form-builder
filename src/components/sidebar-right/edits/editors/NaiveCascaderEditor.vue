<script setup lang="ts">
import LabelHelpSection from '../common/LabelHelpSection.vue'
import PlaceholderSection from '../common/PlaceholderSection.vue'
import TreeOptionsJsonSection from '../common/TreeOptionsJsonSection.vue'
import SelectSwitchesSection from '../common/SelectSwitchesSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
</script>

<template>
  <LabelHelpSection />
  <PlaceholderSection />
  <TreeOptionsJsonSection />
  <SelectSwitchesSection />
  <NaiveBasicSection :size="true" :disabled="true" :clearable="true" />
</template>

