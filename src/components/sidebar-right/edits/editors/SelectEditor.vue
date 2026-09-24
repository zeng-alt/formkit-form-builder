<script setup lang="ts">
import OptionsSourceTabs from '../common/OptionsSourceTabs.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
</script>

<template>
  <OptionsSourceTabs />
  <NaiveBasicSection
    :size="true"
    :disabled="true"
    :clearable="true"
    :filterable="true"
    :multiple="true"
  />
</template>
