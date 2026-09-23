<script setup lang="ts">
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import { INPUT_BASIC_EVENTS } from '@/elements/definitions/bind-events'
</script>

<template>
  <BindEditor :events="INPUT_BASIC_EVENTS" />
  <LabelHelpSection />
  <!-- NColorPicker 没有 clearable prop，开了也不会生效；size 它确实声明了，打开 -->
  <NaiveBasicSection :size="true" :disabled="true" />
</template>
