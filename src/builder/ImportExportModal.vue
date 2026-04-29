<script setup lang="ts">
import { ref, watch } from 'vue'
import { NModal, NInput, NButton, NSpace } from 'naive-ui'
import { formDsl } from '../utils/default-form-elements'
import { commitSchema } from '../composables/schema-history'
import { toast } from 'vue-sonner'
import { useFormBuilderI18n } from '../i18n/context'
import type { FormDslDocument } from '@/dsl/types'

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
      jsonContent.value = JSON.stringify(formDsl.value, null, 2)
    }
  },
)

const handleClose = () => {
  emit('update:show', false)
}

const handleSaveAndImport = () => {
  try {
    const parsed = JSON.parse(jsonContent.value) as FormDslDocument
    if (!parsed || typeof parsed !== 'object') throw new Error(t('importExport.failedParseJson', { message: 'Invalid JSON object' }))
    if (!parsed.formName || typeof parsed.formName !== 'string') throw new Error('formName is required')
    if (!parsed.meta || typeof parsed.meta !== 'object') throw new Error('meta is required')
    if (!Array.isArray(parsed.nodes)) throw new Error('nodes must be an array')
    commitSchema(parsed, { reason: 'import' })
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
    a.download = 'form-dsl.json'
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
            <span class="i-lucide-download w-4 h-4"></span>
          </template>
          {{ t('importExport.downloadJson') }}
        </n-button>
        <n-button type="primary" @click="handleSaveAndImport">
          <template #icon>
            <span class="i-lucide-save w-4 h-4"></span>
          </template>
          {{ t('importExport.saveAndImport') }}
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>
