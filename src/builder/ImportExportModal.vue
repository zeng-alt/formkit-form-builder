<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NModal, NInput, NButton, NSpace, NTabs, NTabPane } from 'naive-ui'
import { dslToSchema } from '@/dsl'
import { generateKey } from '@/utils/dnd/schema'
import type { FormKitSchemaFormKit } from '@formkit/core'
import type { FormDefinition } from '@/types/dsl'
import { toast } from 'vue-sonner'
import { useFormBuilderI18n } from '../i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const { t } = useFormBuilderI18n()

const { formDefinition, commitFormDefinition, commitSchema } = useFormBuilderState()

const tab = ref<'dsl' | 'formkit'>('dsl')
const jsonContent = ref('')

const formkitSchemaContent = computed(() => {
  return JSON.stringify(dslToSchema(formDefinition.value), null, 2)
})

const exportSchema = (): FormKitSchemaFormKit[] => {
  return dslToSchema(formDefinition.value) as FormKitSchemaFormKit[]
}

const isDslDefinition = (value: unknown): value is FormDefinition => {
  const v = value as any
  return (
    v !== null &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    typeof v.version === 'number' &&
    v.root !== null &&
    typeof v.root === 'object' &&
    Array.isArray(v.root.children)
  )
}

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      tab.value = 'dsl'
      jsonContent.value = JSON.stringify(formDefinition.value, null, 2)
    }
  },
)

const handleClose = () => {
  emit('update:show', false)
}

const handleSaveAndImport = () => {
  try {
    const parsed = JSON.parse(jsonContent.value)
    // 规范 DSL 导入：FormDefinition 整体提交（name / settings 一并并入状态）
    if (isDslDefinition(parsed)) {
      const nextDef: FormDefinition = parsed.id ? parsed : { ...parsed, id: generateKey() }
      commitFormDefinition(nextDef, { reason: 'import' })
      toast.success(t('importExport.importSuccess'))
      handleClose()
      return
    }
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
      commitSchema((first as any).children as FormKitSchemaFormKit[], {
        reason: 'import',
        name,
        settings: { layout: 'vertical', labelAlign: labelPosition, labelWidth },
      })
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

const currentTabContent = computed(() => {
  return tab.value === 'formkit' ? formkitSchemaContent.value : jsonContent.value
})

const handleDownload = () => {
  try {
    const content = currentTabContent.value
    JSON.parse(content)

    const blob = new Blob([content], { type: 'application/json' })
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
    size="small"
    :segmented="{
      content: 'soft',
      footer: 'soft',
    }"
  >
    <n-tabs v-model:value="tab" type="segment" size="small">
      <n-tab-pane name="dsl" :tab="t('importExport.tabDsl')">
        <n-input
          v-model:value="jsonContent"
          type="textarea"
          :autosize="{ minRows: 15, maxRows: 25 }"
          :placeholder="t('importExport.placeholder')"
          class="font-mono text-sm"
        />
      </n-tab-pane>
      <n-tab-pane name="formkit" :tab="t('importExport.tabFormkit')">
        <n-input
          :value="formkitSchemaContent"
          type="textarea"
          readonly
          :autosize="{ minRows: 15, maxRows: 25 }"
          :placeholder="t('importExport.placeholder')"
          class="font-mono text-sm"
        />
      </n-tab-pane>
    </n-tabs>

    <template #footer>
      <n-space justify="end">
        <n-button size="small" @click="handleClose">{{ t('common.cancel') }}</n-button>
        <n-button size="small" type="info" @click="handleDownloadJs">
          <template #icon>
            <span class="i-lucide-file-code-2 w-4 h-4"></span>
          </template>
          {{ t('importExport.downloadJs') }}
        </n-button>
        <n-button size="small" type="info" @click="handleDownload">
          <template #icon>
            <span class="i-lucide-download w-4 h-4"></span>
          </template>
          {{ t('importExport.downloadJson') }}
        </n-button>
        <n-button v-if="tab === 'dsl'" size="small" type="primary" @click="handleSaveAndImport">
          <template #icon>
            <span class="i-lucide-save w-4 h-4"></span>
          </template>
          {{ t('importExport.saveAndImport') }}
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>
