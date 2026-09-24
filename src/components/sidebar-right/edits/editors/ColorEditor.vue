<script setup lang="ts">
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
</script>

<template>
  <!-- NColorPicker 没有 clearable prop，开了也不会生效；size 它确实声明了，打开 -->
  <NaiveBasicSection :size="true" :disabled="true" />
</template>
