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
  <n-collapse :default-expanded-names="['customAttrs']" class="custom-attrs-section">
    <n-collapse-item name="customAttrs">
      <template #header>
        <span class="text-[11px]">{{ t('edits.customAttrs.title') }}</span>
      </template>
      <template #arrow="{ collapsed }">
        <span
          :class="collapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
          class="h-3 w-3 text-muted-foreground/70 transition-[transform] duration-150"
        ></span>
      </template>
      <div class="flex flex-col gap-1.5 pt-1">
        <div v-for="(row, idx) in rows" :key="idx" class="flex flex-row gap-1.5 items-center">
          <n-input
            size="small"
            class="flex-1 custom-attrs-input"
            :placeholder="t('edits.customAttrs.keyPlaceholder')"
            :value="row.key"
            @update:value="(v) => updateRow(idx, 'key', String(v))"
          />
          <n-input
            size="small"
            class="flex-1 custom-attrs-input"
            :placeholder="t('edits.customAttrs.valuePlaceholder')"
            :value="row.value"
            @update:value="(v) => updateRow(idx, 'value', String(v))"
          />
          <n-button type="error" text size="tiny" @click="removeRow(idx)" class="!px-1">
            <span class="i-lucide-trash-2 h-3.5 w-3.5"></span>
          </n-button>
        </div>
        <n-button type="success" size="tiny" secondary @click="addRow">
          {{ t('edits.customAttrs.add') }}
        </n-button>
      </div>
    </n-collapse-item>
  </n-collapse>
</template>

<style scoped>
.custom-attrs-section {
  --n-item-margin: 0;
  --n-title-padding: 2px 0;
}
.custom-attrs-section :deep(.custom-attrs-input) {
  --n-height: 22px;
  --n-font-size: 12px;
}
</style>
