<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton, NCollapse, NCollapseItem, NInput } from 'naive-ui'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'

type AttrRow = { key: string; value: string }

const { customAttrs } = useFormField()
const { t } = useFormBuilderI18n()

// 选中 token：切换选中节点时从真源重新同步行
const { selectedIndex, selectedKey } = useFormBuilderState()
const selectionToken = computed(() => selectedKey.value ?? String(selectedIndex.value))

const rows = ref<AttrRow[]>([])

function syncRows() {
  const map = customAttrs.value ?? {}
  const entries = Object.entries(map)
  rows.value = entries.length
    ? entries.map(([key, value]) => ({ key, value }))
    : [{ key: '', value: '' }]
}

watch(selectionToken, syncRows, { immediate: true })

function commit() {
  const next: Record<string, string> = {}
  for (const row of rows.value) {
    const key = row.key.trim()
    if (!key) continue
    next[key] = row.value
  }
  customAttrs.value = next
}

function updateRow(idx: number, field: 'key' | 'value', value: string) {
  rows.value[idx] = { ...rows.value[idx]!, [field]: value }
  commit()
}

function addRow() {
  rows.value = [...rows.value, { key: '', value: '' }]
}

function removeRow(idx: number) {
  rows.value = rows.value.filter((_, i) => i !== idx)
  commit()
}
</script>

<template>
  <n-collapse :default-expanded-names="['customAttrs']" size="small" class="custom-attrs-section">
    <n-collapse-item name="customAttrs" :title="t('edits.customAttrs.title')">
      <div class="flex flex-col gap-2 pt-1">
        <div v-for="(row, idx) in rows" :key="idx" class="flex flex-row gap-2 items-center">
          <n-input
            size="small"
            class="flex-1"
            :placeholder="t('edits.customAttrs.keyPlaceholder')"
            :value="row.key"
            @update:value="(v) => updateRow(idx, 'key', String(v))"
          />
          <n-input
            size="small"
            class="flex-1"
            :placeholder="t('edits.customAttrs.valuePlaceholder')"
            :value="row.value"
            @update:value="(v) => updateRow(idx, 'value', String(v))"
          />
          <n-button quaternary size="small" @click="removeRow(idx)" class="!px-2">
            <span class="i-lucide-trash-2 h-4 w-4"></span>
          </n-button>
        </div>
        <n-button size="small" secondary @click="addRow">
          {{ t('edits.customAttrs.add') }}
        </n-button>
      </div>
    </n-collapse-item>
  </n-collapse>
</template>

<style scoped>
.custom-attrs-section {
  --n-title-font-size: 13px;
  --n-item-margin: 0;
  --n-title-padding: 4px 0;
}
</style>
