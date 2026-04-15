<script setup lang="ts">
import { ref, watch } from 'vue'
import { NModal, NInput, NButton, NSpace } from 'naive-ui'
import { Download, Save } from 'lucide-vue-next'
import { formSchema } from '../utils/default-form-elements'
import { commitSchema } from '../composables/schema-history'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { toast } from 'vue-sonner'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const jsonContent = ref('')

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      jsonContent.value = JSON.stringify(formSchema.value, null, 2)
    }
  }
)

const handleClose = () => {
  emit('update:show', false)
}

const handleSaveAndImport = () => {
  try {
    const parsed = JSON.parse(jsonContent.value)
    if (!Array.isArray(parsed)) {
      throw new Error('Schema must be an array')
    }
    commitSchema(parsed as FormKitSchemaFormKit[], { reason: 'import' })
    toast.success('Schema imported successfully')
    handleClose()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    toast.error(`Failed to parse JSON: ${message}`)
  }
}

const handleDownload = () => {
  try {
    // Validate JSON before downloading
    JSON.parse(jsonContent.value)

    const blob = new Blob([jsonContent.value], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'form-schema.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Schema downloaded successfully')
  } catch {
    toast.error(`Failed to generate download: Invalid JSON`)
  }
}
</script>

<template>
  <n-modal
    :show="show"
    @update:show="(val) => emit('update:show', val)"
    class="w-70%"
    preset="card"
    title="Import / Export Schema"
    :bordered="false"
    size="huge"
    :segmented="{
      content: 'soft',
      footer: 'soft'
    }"
  >
    <div class="py-4">
      <n-input
        v-model:value="jsonContent"
        type="textarea"
        :autosize="{ minRows: 15, maxRows: 25 }"
        placeholder="Paste your form schema JSON here..."
        class="font-mono text-sm"
      />
    </div>

    <template #footer>
      <n-space justify="end">
        <n-button @click="handleClose">Cancel</n-button>
        <n-button type="info" @click="handleDownload">
          <template #icon>
            <Download class="w-4 h-4" />
          </template>
          Download JSON
        </n-button>
        <n-button type="primary" @click="handleSaveAndImport">
          <template #icon>
            <Save class="w-4 h-4" />
          </template>
          Save & Import
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>
