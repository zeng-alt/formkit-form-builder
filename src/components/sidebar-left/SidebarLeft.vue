<script setup lang="ts">
import { provide, ref } from 'vue'
import { NLayoutSider, NInput } from 'naive-ui'
import NavMain from './NavMain.vue'

const searchInput = ref('')
provide('searchInput', searchInput)
</script>

<template>
  <n-layout-sider bordered collapse-mode="width" :collapsed-width="64" :width="240" show-trigger :native-scrollbar="false" content-style="display: flex; flex-direction: column; height: 100%;">
    <div class="p-4 shrink-0">
      <n-input placeholder="Search..." v-model:value="searchInput" />
    </div>
    <div class="flex-1 overflow-hidden">
      <NavMain />
    </div>
  </n-layout-sider>
</template>
