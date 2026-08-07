<script setup lang="ts">
import { provide, ref } from 'vue'
import { NLayoutSider } from 'naive-ui'
import NavMain from './NavMain.vue'

const searchInput = ref('')
provide('searchInput', searchInput)
const collapsed = ref(false)
provide('sidebarCollapsed', collapsed)
</script>

<template>
  <n-layout-sider
    v-model:collapsed="collapsed"
    bordered
    collapse-mode="width"
    :collapsed-width="64"
    :width="240"
    show-trigger
    :native-scrollbar="false"
    content-style="display: flex; flex-direction: column; height: 100%;"
    class="sidebar-sider"
  >
    <div class="flex-1 overflow-hidden">
      <NavMain />
    </div>
  </n-layout-sider>
</template>
