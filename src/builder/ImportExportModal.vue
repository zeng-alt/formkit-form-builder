<script setup lang="ts">
import { ref, watch } from 'vue'
import { NModal, NInput, NButton, NSpace } from 'naive-ui'
import { formMeta, formSchema } from '@/state/form-schema'
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

const exportSchema = (): FormKitSchemaFormKit[] => {
  return [
    {
      $formkit: 'form',
      name: formMeta.value.name,
      props: {
        labelPosition: formMeta.value.labelPosition,
        labelWidth: formMeta.value.labelWidth,
      },
      children: formSchema.value as any,
    } as any,
  ]
}

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      jsonContent.value = JSON.stringify(exportSchema(), null, 2)
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
    const first = parsed[0]
    if (
      parsed.length === 1 &&
      first &&
      typeof first === 'object' &&
      (first as any).$formkit === 'form' &&
      Array.isArray((first as any).children)
    ) {
      const rawName = (first as any).name
      const name = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : 'form'
      const labelPosition = (first as any)?.props?.labelPosition === 'left' ? 'left' : 'top'
      const labelWidthRaw = Number((first as any)?.props?.labelWidth)
      const labelWidth = Number.isFinite(labelWidthRaw) ? labelWidthRaw : 120
      formMeta.value = { name, labelPosition, labelWidth }
      commitSchema((first as any).children as FormKitSchemaFormKit[], { reason: 'import' })
    } else {
      commitSchema(parsed as FormKitSchemaFormKit[], { reason: 'import' })
    }
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

const indent = (code: string, spaces: number) => {
  const pad = ' '.repeat(spaces)
  return code
    .split('\n')
    .map((l) => (l.trim() ? `${pad}${l}` : l))
    .join('\n')
}

const safeVar = (value: unknown) => {
  const raw = String(value ?? '')
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '_')
  const start = cleaned.match(/^[a-zA-Z_]/) ? cleaned : `k_${cleaned}`
  return start || 'k_bind'
}

const cloneSchema = (schema: FormKitSchemaFormKit[]) => {
  try {
    return structuredClone(schema) as FormKitSchemaFormKit[]
  } catch {
    return JSON.parse(JSON.stringify(schema)) as FormKitSchemaFormKit[]
  }
}

const exportAsJs = () => {
  const schema = cloneSchema(exportSchema() as any)
  const bindVarMap: Record<string, Record<string, unknown>> = {}

  const visit = (nodes: any[]) => {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue
      const bind = node.__bind
      if (bind && typeof bind === 'object' && !Array.isArray(bind)) {
        const key = safeVar(node.__key || node.name || node.$formkit || node.$el)
        const varName = `bind_${key}`
        bindVarMap[varName] = bind as any
        node.bind = `$${varName}`
        delete node.__bind
      }
      if (Array.isArray(node.children)) visit(node.children)
    }
  }

  visit(schema as any[])

  const schemaStr = JSON.stringify(schema, null, 2)

  const bindEntries = Object.entries(bindVarMap).map(([varName, attrs]) => {
    const innerLines: string[] = []
    for (const [k, v] of Object.entries(attrs)) {
      if (typeof v === 'string') {
        innerLines.push(`${k}: async (event) => {\n${indent(v, 6)}\n    }`)
      } else if (v && typeof v === 'object' && typeof (v as any).__js === 'string') {
        innerLines.push(`${k}: async (event) => {\n${indent(String((v as any).__js), 6)}\n    }`)
      } else {
        innerLines.push(`${k}: ${JSON.stringify(v)}`)
      }
    }
    return `  ${varName}: {\n    ${innerLines.join(',\n    ')}\n  }`
  })

  const dataStr = `reactive({\n${bindEntries.join(',\n')}\n})`

  return [
    `import { reactive } from 'vue'`,
    `import axios from 'axios'`,
    ``,
    `export const schema = ${schemaStr}`,
    ``,
    `export const data = ${dataStr}`,
  ].join('\n')
}

const handleDownloadJs = () => {
  try {
    const js = exportAsJs()
    const blob = new Blob([js], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'form-schema.js'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(t('importExport.downloadedSuccess'))
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : t('importExport.unknownError')
    toast.error(t('importExport.failedParseJson', { message }))
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
        <n-button type="info" @click="handleDownloadJs">
          <template #icon>
            <span class="i-lucide-file-code-2 w-4 h-4"></span>
          </template>
          {{ t('importExport.downloadJs') }}
        </n-button>
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
