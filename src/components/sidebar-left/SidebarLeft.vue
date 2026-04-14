<script setup lang="ts">
import { provide, ref } from 'vue'
import { NLayoutSider, NInput } from 'naive-ui'
import NavMain from './NavMain.vue'

const searchInput = ref('')
provide('searchInput', searchInput)
</script>

<template>
  <n-layout-sider bordered collapse-mode="width" :collapsed-width="64" :width="240" show-trigger>
    <div class="p-4">
      <n-input placeholder="Search..." v-model:value="searchInput" />
    </div>
    <NavMain />
  </n-layout-sider>
</template>
