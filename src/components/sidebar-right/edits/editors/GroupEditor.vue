<script setup lang="ts">
// group 容器为纯数据结构容器，不展示/编辑 label、help（name 由 EditsSection 统一编辑）。
import BindEditor from '../BindEditor.vue'
import { NO_EVENTS } from '@/elements/definitions/bind-events'
</script>

<template>
  <BindEditor :events="NO_EVENTS" />
  <div></div>
</template>
