<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton, NInput, NInputGroup, NTabPane, NTabs } from 'naive-ui'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useFormField } from '../../../../composables/form-fields'
import { parseDynamicSource, useDictionary } from '../../../../composables/use-dictionary'
import type { DynamicSource } from '../../../../composables/use-dictionary'
import { useFormBuilderI18n } from '../../../../i18n/context'
import EditsLayout from './EditsLayout.vue'
import JsonTextarea from './JsonTextarea.vue'
import DictionaryPickerModal from './DictionaryPickerModal.vue'
import TreeDictionaryPickerModal from './TreeDictionaryPickerModal.vue'
import TagsInput from './TagsInput.vue'
import type { DictionaryDefinition, DictionaryOption, TreeDictionaryOption, TreeDictionaryDefinition } from '@/types/env'

type SourceType = 'label' | 'pair' | 'json' | 'dynamicDict' | 'dynamicTreeDict'
type PairRow = { label: string; value: string }

const props = defineProps<{
  /** 模式：'flat' 普通下拉/单选/多选 使用 dynamicDict，'tree' 树选择/级联选择 使用 dynamicTreeDict */
  mode?: 'flat' | 'tree'
}>()

// 所属 FormBuilder 实例状态：选中 token 绑定到各自实例。
const { selectedIndex, selectedKey } = useFormBuilderState()
const { optionsRaw } = useFormField()
const { t } = useFormBuilderI18n()

const selectionToken = computed(() => selectedKey.value ?? String(selectedIndex.value))

// 根据 mode 自动推断默认标签页
const allowedTabs = computed<SourceType[]>(() => {
  const baseTabs: SourceType[] = ['label', 'pair', 'json']
  if (props.mode === 'tree') {
    return [...baseTabs, 'dynamicTreeDict']
  }
  return [...baseTabs, 'dynamicDict']
})

const active = ref<SourceType>('json')

const labels = ref<string[]>([])
const pairs = ref<PairRow[]>([{ label: '', value: '' }])
const jsonDraft = ref('')
const jsonError = ref('')
// 扁平动态字典：code + label（字典定义），表达式 optionsRaw = { dynamic:true, code, label? }
const dictCode = ref('')
const dictLabel = ref('')
const pickerShow = ref(false)
// 树型动态字典：code + label（树型字典定义）
const treeDictCode = ref('')
const treeDictLabel = ref('')
const treePickerShow = ref(false)

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

const rawToLabels = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return []
  if (raw.every((v) => typeof v === 'string' || typeof v === 'number')) return raw.map(String)
  return raw
    .map((v) => {
      if (v && typeof v === 'object') return String((v as Record<string, unknown>).value ?? '')
      return ''
    })
    .filter((s) => s !== '')
}

const rawToPairs = (raw: unknown): PairRow[] => {
  if (!Array.isArray(raw)) return [{ label: '', value: '' }]
  if (raw.length === 0) return [{ label: '', value: '' }]
  return raw.map((v) => {
    if (typeof v === 'string' || typeof v === 'number') return { label: String(v), value: String(v) }
    if (v && typeof v === 'object') {
      const obj = v as Record<string, unknown>
      return { label: String(obj.label ?? obj.value ?? ''), value: String(obj.value ?? obj.label ?? '') }
    }
    return { label: '', value: '' }
  })
}

const rawToJson = (raw: unknown): string => {
  if (!Array.isArray(raw)) return ''
  const list = raw.every((v) => typeof v === 'string' || typeof v === 'number')
    ? raw.map((v) => ({ label: String(v), value: String(v) }))
    : raw
  return JSON.stringify(list, null, 2)
}

const syncDictionary = (raw: unknown) => {
  const src = parseDynamicSource(raw)
  dictCode.value = src?.code ?? ''
  dictLabel.value = src?.label ?? ''
}

const syncTreeDictionary = (raw: unknown) => {
  const src = parseDynamicSource(raw)
  treeDictCode.value = src?.code ?? ''
  treeDictLabel.value = src?.label ?? ''
}

const commitLabel = (next: string[]) => {
  labels.value = next
  optionsRaw.value = [...next]
}

const commitPairs = (next: PairRow[]) => {
  pairs.value = next
  optionsRaw.value = next
    .map((r) => ({ label: r.label.trim(), value: parsePrimitive(r.value) }))
    .filter((r) => r.label && String(r.value).trim() !== '')
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

const commitDynamicDict = (next: string) => {
  dictCode.value = next
  const code = next.trim()
  if (!code) {
    optionsRaw.value = []
    return
  }
  optionsRaw.value = { dynamic: true, code, ...(dictLabel.value ? { label: dictLabel.value } : {}) }
}

const commitDynamicTreeDict = (next: string) => {
  treeDictCode.value = next
  const code = next.trim()
  if (!code) {
    optionsRaw.value = []
    return
  }
  optionsRaw.value = { dynamic: true, code, ...(treeDictLabel.value ? { label: treeDictLabel.value } : {}) }
}

const pickDictionary = (row: DictionaryDefinition) => {
  dictCode.value = row.code
  dictLabel.value = row.label ?? ''
  optionsRaw.value = { dynamic: true, code: row.code, ...(row.label ? { label: row.label } : {}) }
}

const pickTreeDictionary = (row: TreeDictionaryDefinition) => {
  treeDictCode.value = row.value
  treeDictLabel.value = row.label ?? ''
  optionsRaw.value = { dynamic: true, code: row.value, ...(row.label ? { label: row.label } : {}) }
}

const { fetchDictionary, fetchTreeDictionary } = useDictionary()

// 拉取动态字典的选项数据；未配置或失败时返回空数组，由调用方清空兜底
const resolveDictionary = async (src: DynamicSource): Promise<DictionaryOption[]> => {
  if (!fetchDictionary) return []
  try {
    return await fetchDictionary(src.code)
  } catch {
    return []
  }
}

// 拉取树型字典定义列表（分页）
const resolveTreeDictionary = async (src: DynamicSource): Promise<TreeDictionaryOption[]> => {
  if (!fetchTreeDictionary) return []
  try {
    return await fetchTreeDictionary(src.code)
  } catch {
    return []
  }
}

const inferSource = (raw: unknown): SourceType => {
  if (parseDynamicSource(raw)) {
    // 根据 mode 返回对应的动态字典类型
    return props.mode === 'tree' ? 'dynamicTreeDict' : 'dynamicDict'
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
    // 如果推断出的类型不在允许的标签页中，使用第一个允许的标签页
    active.value = allowedTabs.value.includes(next) ? next : (allowedTabs.value[0] || 'json')
    jsonError.value = ''
    if (next === 'label') {
      labels.value = Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : []
    } else if (next === 'pair') {
      pairs.value = Array.isArray(raw) ? toPairs(raw) : [{ label: '', value: '' }]
    } else if (next === 'json') {
      jsonDraft.value = JSON.stringify(Array.isArray(raw) ? raw : [], null, 2)
    } else if (next === 'dynamicDict') {
      syncDictionary(raw)
    } else if (next === 'dynamicTreeDict') {
      syncTreeDictionary(raw)
    }
  },
  { immediate: true },
)

const switchTab = async (name: string) => {
  const next = name as SourceType
  jsonError.value = ''
  const raw = optionsRaw.value
  // 从动态字典切走：拉取字典数据拷入目标标签作为可编辑静态选项，清空动态字典，
  // 之后即使用目标标签的值（用户可继续增删改）
  if (next !== 'dynamicDict' && next !== 'dynamicTreeDict') {

    const src = parseDynamicSource(raw)
    if (src) {
      let resolved: DictionaryOption[] | TreeDictionaryOption[] = [] as any
      if (active.value === 'dynamicDict') {
        resolved = await resolveDictionary(src)
      } else if (active.value === 'dynamicTreeDict') {
        resolved = await resolveTreeDictionary(src)
      }
      optionsRaw.value = []
      if (next === 'label') commitLabel(resolved.map((o) => String(o.label)))
      else if (next === 'pair')
        commitPairs(resolved.map((o) => ({ label: String(o.label), value: String(o.value) })))
      else commitJson(JSON.stringify(resolved, null, 2))
      return
    }
  }

  active.value = next
  if (next === 'label') commitLabel(rawToLabels(raw))
  else if (next === 'pair') commitPairs(rawToPairs(raw))
  else if (next === 'json') commitJson(rawToJson(raw))
  else if (next === 'dynamicDict') syncDictionary(raw)
  else if (next === 'dynamicTreeDict') syncTreeDictionary(raw)
}

const addPairRow = () => {
  pairs.value = [...pairs.value, { label: '', value: '' }]
}

const removePairRow = (idx: number) => {
  const next = pairs.value.filter((_, i) => i !== idx)
  pairs.value = next.length ? next : [{ label: '', value: '' }]
  commitPairs(pairs.value)
}
</script>

<template>
  <EditsLayout>
    <label class="text-xs font-medium tracking-wide text-foreground/80 block mb-1">
      {{ t('edits.optionsSource.title') }}
    </label>
    <n-tabs type="segment" size="small" :value="active" @update:value="(v) => switchTab(String(v))">
      <n-tab-pane v-if="allowedTabs.includes('label')" name="label" :tab="t('edits.optionsSource.tabs.label')">
        <TagsInput
          :label="t('edits.optionsSource.labelList')"
          :placeholder="t('edits.placeholder.addItems')"
          :value="labels"
          @update:value="(v) => commitLabel(v)"
        />
      </n-tab-pane>
      <n-tab-pane v-if="allowedTabs.includes('pair')" name="pair" :tab="t('edits.optionsSource.tabs.pair')">
        <div class="flex flex-col gap-2">
          <div v-for="(r, idx) in pairs" :key="idx" class="flex flex-row gap-2 items-center">
            <n-input
              size="small"
              class="flex-1"
              :placeholder="t('edits.optionsSource.pairLabelPlaceholder')"
              :value="r.label"
              @update:value="
                (v) => {
                  pairs[idx] = { ...r, label: v }
                  commitPairs(pairs)
                }
              "
            />
            <n-input
              size="small"
              class="flex-1"
              :placeholder="t('edits.optionsSource.pairValuePlaceholder')"
              :value="r.value"
              @update:value="
                (v) => {
                  pairs[idx] = { ...r, value: v }
                  commitPairs(pairs)
                }
              "
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
      <n-tab-pane v-if="allowedTabs.includes('json')" name="json" :tab="t('edits.optionsSource.tabs.json')">
        <JsonTextarea
          label="Options (JSON)"
          placeholder='[{"label":"Option 1","value":"1"}]'
          :value="jsonDraft"
          :error="jsonError"
          @update:value="(v) => commitJson(v)"
        />
      </n-tab-pane>
      <n-tab-pane v-if="allowedTabs.includes('dynamicDict')" name="dynamicDict" :tab="t('edits.optionsSource.tabs.dynamicDict')">
        <div class="flex flex-col gap-2">
          <n-input-group>
            <n-input
              size="small"
              :placeholder="t('edits.optionsSource.dictInputPlaceholder')"
              :value="dictCode"
              @update:value="(v) => commitDynamicDict(String(v))"
            />
            <n-button size="small" type="primary" secondary @click="pickerShow = true">
              {{ t('edits.optionsSource.dictBrowse') }}
            </n-button>
          </n-input-group>
          <div v-if="dictLabel" class="text-[11px] text-muted-foreground">
            {{ dictLabel }}
          </div>
          <DictionaryPickerModal
            :show="pickerShow"
            @update:show="(v) => (pickerShow = v)"
            @select="pickDictionary"
          />
        </div>
      </n-tab-pane>
      <n-tab-pane v-if="allowedTabs.includes('dynamicTreeDict')" name="dynamicTreeDict" :tab="t('edits.optionsSource.tabs.dynamicTreeDict')">
        <div class="flex flex-col gap-2">
          <n-input-group>
            <n-input
              size="small"
              :placeholder="t('edits.optionsSource.dictInputPlaceholder')"
              :value="treeDictCode"
              @update:value="(v) => commitDynamicTreeDict(String(v))"
            />
            <n-button size="small" type="primary" secondary @click="treePickerShow = true">
              {{ t('edits.optionsSource.dictBrowse') }}
            </n-button>
          </n-input-group>
          <div v-if="treeDictLabel" class="text-[11px] text-muted-foreground">
            {{ treeDictLabel }}
          </div>
          <TreeDictionaryPickerModal
            :show="treePickerShow"
            @update:show="(v) => (treePickerShow = v)"
            @select="pickTreeDictionary"
          />
        </div>
      </n-tab-pane>
    </n-tabs>
  </EditsLayout>
</template>
