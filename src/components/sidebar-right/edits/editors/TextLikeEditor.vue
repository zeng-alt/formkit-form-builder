<script setup lang="ts">
import PlaceholderSection from '../common/PlaceholderSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import PairSection from '../common/PairSection.vue'
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
    :maxlength="true"
    :minlength="true"
    :prefix="true"
    :suffix="true"
  />
  <PairSection />
</template>
