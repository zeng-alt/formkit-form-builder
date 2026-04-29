<script setup lang="ts">
import type { DslCondition, DslOperator } from '@/dsl/types'
import { computed } from 'vue'
import { NDivider, NInput, NInputNumber, NSelect, NSwitch } from 'naive-ui'
import { useFormBuilderI18n } from '../../i18n/context'
import { useFormField } from '../../composables/form-fields'

const {
  hasField,
  selectedIsForm,
  formName,
  formLabelPosition,
  formLabelWidth,
  fieldName,
  label,
  placeholder,
  span,
  rules,
  visibleIf,
  disabledIf,
  availableFieldNames,
} = useFormField()

const { t } = useFormBuilderI18n()

const labelPositionOptions = [
  { label: 'top', value: 'top' },
  { label: 'left', value: 'left' },
]

const opOptions: { label: string; value: DslOperator }[] = [
  { label: 'eq', value: 'eq' },
  { label: 'neq', value: 'neq' },
  { label: 'gt', value: 'gt' },
  { label: 'gte', value: 'gte' },
  { label: 'lt', value: 'lt' },
  { label: 'lte', value: 'lte' },
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

const required = computed<boolean>({
  get: () => Boolean(rules.value.required),
  set: (val) => rules.value = { ...rules.value, required: val ? true : undefined },
})

const min = computed<number | null>({
  get: () => (typeof rules.value.min === 'number' ? rules.value.min : null),
  set: (val) => rules.value = { ...rules.value, min: typeof val === 'number' ? val : undefined },
})

const max = computed<number | null>({
  get: () => (typeof rules.value.max === 'number' ? rules.value.max : null),
  set: (val) => rules.value = { ...rules.value, max: typeof val === 'number' ? val : undefined },
})

const pattern = computed<string>({
  get: () => rules.value.pattern ?? '',
  set: (val) => rules.value = { ...rules.value, pattern: val.trim() || undefined },
})

const message = computed<string>({
  get: () => rules.value.message ?? '',
  set: (val) => rules.value = { ...rules.value, message: val.trim() || undefined },
})
</script>

<template>
  <div class="p-2">
    <div class="space-y-2 md:space-y-3">
      <template v-if="!hasField || selectedIsForm">
        <div class="space-y-2 p-3 border border-border rounded-md bg-muted/30">
          <div class="text-xs font-medium text-foreground">{{ t('formSettings.title') }}</div>
          <n-input v-model:value="formName" />
          <div class="grid grid-cols-2 gap-2">
            <n-select v-model:value="formLabelPosition" :options="labelPositionOptions" />
            <n-input-number v-model:value="formLabelWidth" :min="0" :max="2000" />
          </div>
        </div>
      </template>

      <template v-else>
        <div class="space-y-2 p-3 border border-border rounded-md bg-muted/30">
          <div class="text-xs font-medium text-foreground">{{ t('common.basic') }}</div>
          <n-input v-model:value="label" :placeholder="t('builder.label')" />
          <n-input v-model:value="fieldName" :placeholder="t('builder.name')" />
          <n-input v-model:value="placeholder" :placeholder="t('builder.placeholder')" />
          <n-input-number v-model:value="span" :min="1" :max="12" />
        </div>

        <div class="space-y-2 p-3 border border-border rounded-md bg-muted/30">
          <div class="flex items-center justify-between">
            <div class="text-xs font-medium text-foreground">visibleIf</div>
            <n-switch size="small" v-model:value="visibleEnabled" />
          </div>
          <div v-if="visibleEnabled" class="grid grid-cols-3 gap-2">
            <n-select
              :value="visibleCond.field"
              :options="fieldOptions"
              @update:value="(v) => visibleCond = { ...visibleCond, field: v }"
            />
            <n-select
              :value="visibleCond.operator"
              :options="opOptions"
              @update:value="(v) => visibleCond = { ...visibleCond, operator: v }"
            />
            <n-input
              :value="String(visibleCond.value ?? '')"
              @update:value="(v) => visibleCond = { ...visibleCond, value: v }"
            />
          </div>
        </div>

        <div class="space-y-2 p-3 border border-border rounded-md bg-muted/30">
          <div class="flex items-center justify-between">
            <div class="text-xs font-medium text-foreground">disabledIf</div>
            <n-switch size="small" v-model:value="disabledEnabled" />
          </div>
          <div v-if="disabledEnabled" class="grid grid-cols-3 gap-2">
            <n-select
              :value="disabledCond.field"
              :options="fieldOptions"
              @update:value="(v) => disabledCond = { ...disabledCond, field: v }"
            />
            <n-select
              :value="disabledCond.operator"
              :options="opOptions"
              @update:value="(v) => disabledCond = { ...disabledCond, operator: v }"
            />
            <n-input
              :value="String(disabledCond.value ?? '')"
              @update:value="(v) => disabledCond = { ...disabledCond, value: v }"
            />
          </div>
        </div>

        <n-divider />

        <div class="space-y-2 p-3 border border-border rounded-md bg-muted/30">
          <div class="text-xs font-medium text-foreground">rules</div>
          <div class="flex items-center justify-between">
            <div class="text-xs text-muted-foreground">required</div>
            <n-switch size="small" v-model:value="required" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <n-input-number v-model:value="min" :placeholder="'min'" />
            <n-input-number v-model:value="max" :placeholder="'max'" />
          </div>
          <n-input v-model:value="pattern" :placeholder="'pattern'" />
          <n-input v-model:value="message" :placeholder="'message'" />
        </div>
      </template>
    </div>
  </div>
</template>
