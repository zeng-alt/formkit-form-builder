<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NCard, NInput, NSpace } from 'naive-ui'
import type { FormBuilderConfig } from '@/types/env'
import { BuilderProvider, FormBuilder } from '@/index'
import { toast } from 'vue-sonner'
import { formDsl } from '@/utils/default-form-elements'
import { loadForm, saveForm } from './api/forms'

const formBuilderConfig = computed<FormBuilderConfig>(() => ({
  apiKey: 'xxxxxxx',
}))

const baseURL = ref('http://localhost:3000')
const token = ref('')
const formId = ref('demo')

const onLoad = async () => {
  try {
    const res = await loadForm({ baseURL: baseURL.value, token: token.value, formId: formId.value })
    formDsl.value = { ...res.dsl, formId: res.formId, formName: res.formName }
    toast.success('Loaded')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    toast.error(msg)
  }
}

const onSave = async () => {
  try {
    await saveForm({
      baseURL: baseURL.value,
      token: token.value,
      formId: formId.value,
      formName: formDsl.value.formName,
      dsl: formDsl.value,
    })
    toast.success('Saved')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    toast.error(msg)
  }
}
</script>

<template>
  <BuilderProvider :config="formBuilderConfig">
    <div class="p-4 space-y-3">
      <n-card size="small" content-style="padding: 12px">
        <n-space align="center" :wrap="true">
          <n-input v-model:value="baseURL" placeholder="baseURL" style="width: 240px" />
          <n-input v-model:value="token" placeholder="Bearer token" style="width: 240px" />
          <n-input v-model:value="formId" placeholder="formId" style="width: 160px" />
          <n-button type="primary" @click="onLoad">Load</n-button>
          <n-button type="info" @click="onSave">Save</n-button>
        </n-space>
      </n-card>
      <FormBuilder />
    </div>
  </BuilderProvider>
</template>
