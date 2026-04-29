<script setup lang="ts">
import type { DslCondition, DslOperator } from '@/dsl/types'
import { computed } from 'vue'
import { NDivider, NInput, NSelect, NSwitch } from 'naive-ui'
import { useFormField } from '@/composables/form-fields'
import FormEditor from './edits/editors/FormEditor.vue'
import EditsSection from './edits/EditsSection.vue'
import ValidationSection from './validations/ValidationSection.vue'

const { hasField, selectedIsForm, fieldName, visibleIf, disabledIf, availableFieldNames } = useFormField()

const opOptions: { label: string; value: DslOperator }[] = [
  { label: 'eq', value: 'eq' },
  { label: 'neq', value: 'neq' },
  { label: 'gt', value: 'gt' },
  { label: 'gte', value: 'gte' },
  { label: 'lt', value: 'lt' },
  { label: 'lte', value: 'lte' },
  { label: 'in', value: 'in' },
  { label: 'nin', value: 'nin' },
]

const normalizeSimpleCondition = (cond: DslCondition | undefined) => {
  if (!cond) return null
  if ('field' in cond) return cond
  return null
}

const fieldOptions = computed(() => {
  const cur = fieldName.value
  return availableFieldNames.value
    .filter((n) => n && n !== cur)
    .map((n) => ({ label: n, value: n }))
})

const visibleEnabled = computed<boolean>({
  get: () => Boolean(normalizeSimpleCondition(visibleIf.value)),
  set: (val) => {
    if (!val) visibleIf.value = undefined
    else {
      const first = fieldOptions.value[0]?.value ?? ''
      visibleIf.value = { field: first, operator: 'eq', value: '' }
    }
  },
})

const disabledEnabled = computed<boolean>({
  get: () => Boolean(normalizeSimpleCondition(disabledIf.value)),
  set: (val) => {
    if (!val) disabledIf.value = undefined
    else {
      const first = fieldOptions.value[0]?.value ?? ''
      disabledIf.value = { field: first, operator: 'eq', value: '' }
    }
  },
})

const visibleCond = computed({
  get: () => normalizeSimpleCondition(visibleIf.value) ?? { field: '', operator: 'eq' as const, value: '' },
  set: (next: { field: string; operator: DslOperator; value: unknown }) => {
    visibleIf.value = next.field ? next : undefined
  },
})

const disabledCond = computed({
  get: () => normalizeSimpleCondition(disabledIf.value) ?? { field: '', operator: 'eq' as const, value: '' },
  set: (next: { field: string; operator: DslOperator; value: unknown }) => {
    disabledIf.value = next.field ? next : undefined
  },
})
</script>

<template>
  <div class="p-2">
    <div class="space-y-2 md:space-y-3">
      <FormEditor v-if="!hasField || selectedIsForm" />
      <template v-else>
        <EditsSection />

        <div class="space-y-2 p-3 border border-border rounded-md bg-muted/30">
          <div class="text-xs font-medium text-foreground">logic</div>

          <div class="flex items-center justify-between">
            <div class="text-xs text-muted-foreground">visibleIf</div>
            <n-switch size="small" v-model:value="visibleEnabled" />
          </div>
          <div v-if="visibleEnabled" class="grid grid-cols-3 gap-2">
            <n-select
              :value="visibleCond.field"
              :options="fieldOptions"
              @update:value="(v) => (visibleCond = { ...visibleCond, field: v })"
            />
            <n-select
              :value="visibleCond.operator"
              :options="opOptions"
              @update:value="(v) => (visibleCond = { ...visibleCond, operator: v })"
            />
            <n-input
              :value="String(visibleCond.value ?? '')"
              @update:value="(v) => (visibleCond = { ...visibleCond, value: v })"
            />
          </div>

          <div class="flex items-center justify-between">
            <div class="text-xs text-muted-foreground">disabledIf</div>
            <n-switch size="small" v-model:value="disabledEnabled" />
          </div>
          <div v-if="disabledEnabled" class="grid grid-cols-3 gap-2">
            <n-select
              :value="disabledCond.field"
              :options="fieldOptions"
              @update:value="(v) => (disabledCond = { ...disabledCond, field: v })"
            />
            <n-select
              :value="disabledCond.operator"
              :options="opOptions"
              @update:value="(v) => (disabledCond = { ...disabledCond, operator: v })"
            />
            <n-input
              :value="String(disabledCond.value ?? '')"
              @update:value="(v) => (disabledCond = { ...disabledCond, value: v })"
            />
          </div>
        </div>

        <n-divider />
        <ValidationSection />
      </template>
    </div>
  </div>
</template>
