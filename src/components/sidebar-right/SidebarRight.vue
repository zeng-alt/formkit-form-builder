<script setup lang="ts">
import { NLayoutSider } from 'naive-ui'
import FormEditMain from './FormEditMain.vue'
import { fieldProps } from '../../utils/field-props'
import { useFormField } from '../../composables/form-fields'

const { currentFieldType } = useFormField()
</script>

<template>
  <n-layout-sider bordered width="300" show-trigger="bar" collapse-mode="transform">
    <div class="p-4 border-b">
      <div class="flex items-center w-fit gap-2 rounded-lg backdrop-blur-2xl">
        <component
          :is="fieldProps.find((prop) => prop.name === currentFieldType)?.icon"
          class="!h-8 !w-8 rounded-md text-green-700 dark:text-white/70 bg-ring/20 p-1.5"
        />
      </div>
    </div>
    <div class="p-4 overflow-y-auto">
      <FormEditMain />
    </div>
  </n-layout-sider>
</template>
