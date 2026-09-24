<script setup lang="ts">
import OptionsSourceTabs from '../common/OptionsSourceTabs.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
</script>

<template>
  <OptionsSourceTabs mode="flat" />
  <NaiveBasicSection :size="true" :disabled="true" :filterable="true" />
</template>
