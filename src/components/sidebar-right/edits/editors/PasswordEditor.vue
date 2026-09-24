<script setup lang="ts">
import PlaceholderSection from '../common/PlaceholderSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
</script>

<template>
  <PlaceholderSection />
  <NaiveBasicSection
    :size="true"
    :disabled="true"
    :clearable="true"
    :bordered="true"
    :readonly="true"
    :round="true"
    :autofocus="true"
    :show-count="true"
    :show-password-on="true"
    :maxlength="true"
    :minlength="true"
    :prefix="true"
    :suffix="true"
  />
</template>
