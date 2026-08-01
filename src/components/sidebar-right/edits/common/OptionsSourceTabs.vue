<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton, NInput, NTabPane, NTabs } from 'naive-ui'
import { selectedIndex, selectedKey } from '@/state/form-schema'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import EditsLayout from './EditsLayout.vue'
import JsonTextarea from './JsonTextarea.vue'
import TagsInput from './TagsInput.vue'

type SourceType = 'label' | 'pair' | 'json' | 'endpoint'
type PairRow = { label: string; value: string }

const { optionsRaw } = useFormField()
const { t } = useFormBuilderI18n()

const selectionToken = computed(() => selectedKey.value ?? String(selectedIndex.value))

const active = ref<SourceType>('label')

const labels = ref<string[]>([])
const pairs = ref<PairRow[]>([{ label: '', value: '' }])
const jsonDraft = ref('')
const jsonError = ref('')
const endpoint = ref('')

const isPairArray = (arr: unknown[]): boolean => {
  if (arr.length === 0) return false
  return arr.every((v) => {
    if (!v || typeof v !== 'object') return false
    const obj = v as Record<string, unknown>
    if (!('label' in obj) || !('value' in obj)) return false
    const keys = Object.keys(obj)
    return keys.every((k) => k === 'label' || k === 'value' || k === 'disabled')
  })
}

const toPairs = (arr: unknown[]): PairRow[] => {
  if (arr.length === 0) return [{ label: '', value: '' }]
  return arr.map((v) => {
    if (!v || typeof v !== 'object') return { label: String(v ?? ''), value: String(v ?? '') }
    const obj = v as Record<string, unknown>
    return { label: String(obj.label ?? ''), value: String(obj.value ?? '') }
  })
}

const parsePrimitive = (raw: string): string | number => {
  const v = raw.trim()
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  return v
}

const commitLabel = (next: string[]) => {
  labels.value = next
  optionsRaw.value = [...next]
}

const commitPairs = () => {
  const next = pairs.value
    .map((r) => ({ label: r.label.trim(), value: parsePrimitive(r.value) }))
    .filter((r) => r.label && (String(r.value).trim() !== ''))
  optionsRaw.value = next
}

const commitJson = (value: string) => {
  jsonDraft.value = value
  if (!value.trim()) {
    optionsRaw.value = []
    jsonError.value = ''
    return
  }
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) {
      jsonError.value = t('edits.optionsSource.jsonArrayError')
      return
    }
    optionsRaw.value = parsed
    jsonError.value = ''
  } catch {
    jsonError.value = t('edits.optionsSource.jsonParseError')
  }
}

const commitEndpoint = (next: string) => {
  endpoint.value = next
  const url = next.trim()
  if (!url) {
    optionsRaw.value = []
    return
  }
  optionsRaw.value = { endpoint: url }
}

const inferSource = (raw: unknown): SourceType => {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const endpoint = (raw as any).endpoint
    if (typeof endpoint === 'string' && endpoint.trim()) return 'endpoint'
  }
  if (Array.isArray(raw)) {
    if (raw.every((v) => typeof v === 'string' || typeof v === 'number')) return 'label'
    if (isPairArray(raw)) return 'pair'
    return 'json'
  }
  return 'label'
}

watch(
  selectionToken,
  () => {
    const raw = optionsRaw.value
    const next = inferSource(raw)
    active.value = next
    jsonError.value = ''
    if (next === 'label') {
      labels.value = Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : []
    } else if (next === 'pair') {
      pairs.value = Array.isArray(raw) ? toPairs(raw) : [{ label: '', value: '' }]
    } else if (next === 'json') {
      jsonDraft.value = JSON.stringify(Array.isArray(raw) ? raw : [], null, 2)
    } else if (next === 'endpoint') {
      endpoint.value = typeof (raw as any)?.endpoint === 'string' ? String((raw as any).endpoint) : ''
    }
  },
  { immediate: true },
)

const switchTab = (name: string) => {
  const next = name as SourceType
  active.value = next
  jsonError.value = ''
  if (next === 'label') commitLabel(labels.value)
  else if (next === 'pair') commitPairs()
  else if (next === 'json') commitJson(jsonDraft.value)
  else if (next === 'endpoint') commitEndpoint(endpoint.value)
}

const addPairRow = () => {
  pairs.value = [...pairs.value, { label: '', value: '' }]
}

const removePairRow = (idx: number) => {
  const next = pairs.value.filter((_, i) => i !== idx)
  pairs.value = next.length ? next : [{ label: '', value: '' }]
  commitPairs()
}
</script>

<template>
  <EditsLayout>
    <label class="text-xs font-medium tracking-wide text-foreground/80 block mb-1">
      {{ t('edits.optionsSource.title') }}
    </label>
    <n-tabs type="segment" size="small" :value="active" @update:value="(v) => switchTab(String(v))">
      <n-tab-pane name="label" :tab="t('edits.optionsSource.tabs.label')">
        <TagsInput
          :label="t('edits.optionsSource.labelList')"
          :placeholder="t('edits.placeholder.addItems')"
          :value="labels"
          @update:value="(v) => commitLabel(v)"
        />
      </n-tab-pane>
      <n-tab-pane name="pair" :tab="t('edits.optionsSource.tabs.pair')">
        <div class="flex flex-col gap-2">
          <div v-for="(r, idx) in pairs" :key="idx" class="flex flex-row gap-2 items-center">
            <n-input
              size="small"
              class="flex-1"
              :placeholder="t('edits.optionsSource.pairLabelPlaceholder')"
              :value="r.label"
              @update:value="(v) => { pairs[idx] = { ...r, label: v }; commitPairs() }"
            />
            <n-input
              size="small"
              class="flex-1"
              :placeholder="t('edits.optionsSource.pairValuePlaceholder')"
              :value="r.value"
              @update:value="(v) => { pairs[idx] = { ...r, value: v }; commitPairs() }"
            />
            <n-button quaternary size="small" @click="removePairRow(idx)" class="!px-2">
              <span class="i-lucide-trash-2 h-4 w-4"></span>
            </n-button>
          </div>
          <n-button size="small" secondary @click="addPairRow">
            {{ t('edits.optionsSource.addPairRow') }}
          </n-button>
        </div>
      </n-tab-pane>
      <n-tab-pane name="json" :tab="t('edits.optionsSource.tabs.json')">
        <JsonTextarea
          label="Options (JSON)"
          placeholder='[{"label":"Option 1","value":"1"}]'
          :value="jsonDraft"
          :error="jsonError"
          @update:value="(v) => commitJson(v)"
        />
      </n-tab-pane>
      <n-tab-pane name="endpoint" :tab="t('edits.optionsSource.tabs.endpoint')">
        <n-input
          size="small"
          :placeholder="t('edits.optionsSource.endpointPlaceholder')"
          :value="endpoint"
          @update:value="(v) => commitEndpoint(v)"
        />
      </n-tab-pane>
    </n-tabs>
  </EditsLayout>
</template>
