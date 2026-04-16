<script setup lang="ts">
import { ref, watch } from 'vue'
import { NModal, NInput, NButton, NSpace } from 'naive-ui'
import { Download, Save } from 'lucide-vue-next'
import { formSchema } from '../utils/default-form-elements'
import { commitSchema } from '../composables/schema-history'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { toast } from 'vue-sonner'
import { useFormBuilderI18n } from '../i18n/context'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const { t } = useFormBuilderI18n()

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
      throw new Error(t('importExport.schemaMustBeArray'))
    }
    commitSchema(parsed as FormKitSchemaFormKit[], { reason: 'import' })
    toast.success(t('importExport.importSuccess'))
    handleClose()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : t('importExport.unknownError')
    toast.error(t('importExport.failedParseJson', { message }))
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
    toast.success(t('importExport.downloadedSuccess'))
  } catch {
    toast.error(t('importExport.failedGenerateDownload'))
  }
}
</script>

<template>
  <n-modal
    :show="show"
    @update:show="(val) => emit('update:show', val)"
    class="w-70%"
    preset="card"
    :title="t('importExport.title')"
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
        :placeholder="t('importExport.placeholder')"
        class="font-mono text-sm"
      />
    </div>

    <template #footer>
      <n-space justify="end">
        <n-button @click="handleClose">{{ t('common.cancel') }}</n-button>
        <n-button type="info" @click="handleDownload">
          <template #icon>
            <Download class="w-4 h-4" />
          </template>
          {{ t('importExport.downloadJson') }}
        </n-button>
        <n-button type="primary" @click="handleSaveAndImport">
          <template #icon>
            <Save class="w-4 h-4" />
          </template>
          {{ t('importExport.saveAndImport') }}
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>
