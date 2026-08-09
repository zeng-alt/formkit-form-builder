<script setup lang="ts">
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import PlaceholderSection from '../common/PlaceholderSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import PrefixSuffixSection from '../common/PrefixSuffixSection.vue'
import { INPUT_FULL_EVENTS } from '@/elements/definitions/bind-events'
</script>

<template>
  <BindEditor :events="INPUT_FULL_EVENTS" />
  <LabelHelpSection />
  <PlaceholderSection />
  <PrefixSuffixSection />
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
  />
</template>
