<script setup lang="ts">
// 标题内容由统一"内容"编辑区块（StaticContentSection）编辑
import BindEditor from '../BindEditor.vue'
import { NO_EVENTS } from '@/elements/definitions/bind-events'
</script>

<!-- 标题内容由统一"内容"编辑区块（StaticContentSection）编辑 -->
<template>
  <BindEditor :events="NO_EVENTS" />
  <div class="hidden"></div>
</template>
