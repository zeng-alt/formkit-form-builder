<script setup lang="ts">
import type { DslCondition, DslOperator } from '@/dsl/types'
import { computed } from 'vue'
import { NDivider, NInput, NInputNumber, NSelect, NSwitch } from 'naive-ui'
import { useFormBuilderI18n } from '../../i18n/context'
import { useFormField } from '../../composables/form-fields'

const {
  hasField,
  selectedIsForm,
  currentFieldType,
  formName,
  formLabelPosition,
  formLabelWidth,
  fieldName,
  label,
  placeholder,
  help,
  span,
  rules,
  visibleIf,
  disabledIf,
  availableFieldNames,
  rawProps,
  rawPropsJson,
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

const email = computed<boolean>({
  get: () => Boolean(rules.value.email),
  set: (val) => rules.value = { ...rules.value, email: val ? true : undefined },
})

const url = computed<boolean>({
  get: () => Boolean(rules.value.url),
  set: (val) => rules.value = { ...rules.value, url: val ? true : undefined },
})

const number = computed<boolean>({
  get: () => Boolean(rules.value.number),
  set: (val) => rules.value = { ...rules.value, number: val ? true : undefined },
})

const alphanumeric = computed<boolean>({
  get: () => Boolean(rules.value.alphanumeric),
  set: (val) => rules.value = { ...rules.value, alphanumeric: val ? true : undefined },
})

const containsAlphanumeric = computed<boolean>({
  get: () => Boolean(rules.value.contains_alphanumeric),
  set: (val) => rules.value = { ...rules.value, contains_alphanumeric: val ? true : undefined },
})

const containsNumeric = computed<boolean>({
  get: () => Boolean(rules.value.contains_numeric),
  set: (val) => rules.value = { ...rules.value, contains_numeric: val ? true : undefined },
})

const min = computed<number | null>({
  get: () => (typeof rules.value.min === 'number' ? rules.value.min : null),
  set: (val) => rules.value = { ...rules.value, min: typeof val === 'number' ? val : undefined },
})

const max = computed<number | null>({
  get: () => (typeof rules.value.max === 'number' ? rules.value.max : null),
  set: (val) => rules.value = { ...rules.value, max: typeof val === 'number' ? val : undefined },
})

const betweenMin = computed<number | null>({
  get: () => (typeof rules.value.between?.min === 'number' ? rules.value.between!.min : null),
  set: (val) => {
    if (typeof val !== 'number') {
      rules.value = { ...rules.value, between: undefined }
      return
    }
    const curMax = rules.value.between?.max
    rules.value = { ...rules.value, between: { min: val, max: typeof curMax === 'number' ? curMax : val } }
  },
})

const betweenMax = computed<number | null>({
  get: () => (typeof rules.value.between?.max === 'number' ? rules.value.between!.max : null),
  set: (val) => {
    if (typeof val !== 'number') {
      rules.value = { ...rules.value, between: undefined }
      return
    }
    const curMin = rules.value.between?.min
    rules.value = { ...rules.value, between: { min: typeof curMin === 'number' ? curMin : val, max: val } }
  },
})

const lengthMin = computed<number | null>({
  get: () => (typeof rules.value.length?.min === 'number' ? rules.value.length!.min : null),
  set: (val) => {
    const curMax = rules.value.length?.max
    const nextMin = typeof val === 'number' ? val : undefined
    const next =
      nextMin !== undefined || typeof curMax === 'number'
        ? { min: nextMin, max: typeof curMax === 'number' ? curMax : undefined }
        : undefined
    rules.value = { ...rules.value, length: next }
  },
})

const lengthMax = computed<number | null>({
  get: () => (typeof rules.value.length?.max === 'number' ? rules.value.length!.max : null),
  set: (val) => {
    const curMin = rules.value.length?.min
    const nextMax = typeof val === 'number' ? val : undefined
    const next =
      typeof curMin === 'number' || nextMax !== undefined
        ? { min: typeof curMin === 'number' ? curMin : undefined, max: nextMax }
        : undefined
    rules.value = { ...rules.value, length: next }
  },
})

const matches = computed<string>({
  get: () => rules.value.matches ?? rules.value.pattern ?? '',
  set: (val) => rules.value = { ...rules.value, matches: val.trim() || undefined, pattern: undefined },
})

const message = computed<string>({
  get: () => rules.value.message ?? '',
  set: (val) => rules.value = { ...rules.value, message: val.trim() || undefined },
})

const optionTypes = new Set([
  'select',
  'checkbox',
  'radio',
  'naiveMention',
  'naiveCascader',
  'naiveTreeSelect',
  'naiveUl',
  'naiveOl',
])

const hasOptions = computed(() => optionTypes.has(String(currentFieldType.value ?? '')))

const optionsJson = computed<string>({
  get: () => JSON.stringify((rawProps.value as any)?.options ?? [], null, 2),
  set: (value: string) => {
    try {
      const parsed = JSON.parse(value)
      rawProps.value = { ...rawProps.value, options: parsed }
    } catch {
      return
    }
  },
})

const accept = computed<string>({
  get: () => String((rawProps.value as any)?.accept ?? ''),
  set: (v) => {
    rawProps.value = { ...rawProps.value, accept: v.trim() || undefined }
  },
})

const multiple = computed<boolean>({
  get: () => Boolean((rawProps.value as any)?.multiple ?? false),
  set: (v) => {
    rawProps.value = { ...rawProps.value, multiple: v ? true : undefined }
  },
})

const minProp = computed<number | null>({
  get: () => (typeof (rawProps.value as any)?.min === 'number' ? ((rawProps.value as any).min as number) : null),
  set: (v) => rawProps.value = { ...rawProps.value, min: typeof v === 'number' ? v : undefined },
})

const maxProp = computed<number | null>({
  get: () => (typeof (rawProps.value as any)?.max === 'number' ? ((rawProps.value as any).max as number) : null),
  set: (v) => rawProps.value = { ...rawProps.value, max: typeof v === 'number' ? v : undefined },
})

const stepProp = computed<number | null>({
  get: () => {
    const raw = (rawProps.value as any)?.step
    if (typeof raw === 'number') return raw
    if (typeof raw === 'string') {
      const n = Number(raw)
      return Number.isFinite(n) ? n : null
    }
    return null
  },
  set: (v) => rawProps.value = { ...rawProps.value, step: typeof v === 'number' ? v : undefined },
})

const isButtonLike = computed(() => ['naiveButton', 'submit', 'reset'].includes(String(currentFieldType.value ?? '')))

const buttonText = computed<string>({
  get: () => String((rawProps.value as any)?.buttonText ?? ''),
  set: (v) => rawProps.value = { ...rawProps.value, buttonText: v },
})

const buttonPropsJson = computed<string>({
  get: () => JSON.stringify((rawProps.value as any)?.buttonProps ?? {}, null, 2),
  set: (value: string) => {
    try {
      const parsed = JSON.parse(value)
      rawProps.value = { ...rawProps.value, buttonProps: parsed }
    } catch {
      return
    }
  },
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
          <n-input v-model:value="help" :placeholder="t('elements.common.help')" />
          <n-input-number v-model:value="span" :min="1" :max="12" />
        </div>

        <div v-if="hasOptions" class="space-y-2 p-3 border border-border rounded-md bg-muted/30">
          <div class="text-xs font-medium text-foreground">options</div>
          <n-input
            v-model:value="optionsJson"
            type="textarea"
            :autosize="{ minRows: 4, maxRows: 12 }"
            class="font-mono text-xs"
          />
        </div>

        <div v-if="String(currentFieldType) === 'file'" class="space-y-2 p-3 border border-border rounded-md bg-muted/30">
          <div class="text-xs font-medium text-foreground">file</div>
          <n-input v-model:value="accept" placeholder="accept" />
          <div class="flex items-center justify-between">
            <div class="text-xs text-muted-foreground">multiple</div>
            <n-switch size="small" v-model:value="multiple" />
          </div>
        </div>

        <div
          v-if="['number', 'range'].includes(String(currentFieldType))"
          class="space-y-2 p-3 border border-border rounded-md bg-muted/30"
        >
          <div class="text-xs font-medium text-foreground">number</div>
          <div class="grid grid-cols-3 gap-2">
            <n-input-number v-model:value="minProp" :placeholder="'min'" />
            <n-input-number v-model:value="maxProp" :placeholder="'max'" />
            <n-input-number v-model:value="stepProp" :placeholder="'step'" />
          </div>
        </div>

        <div v-if="isButtonLike" class="space-y-2 p-3 border border-border rounded-md bg-muted/30">
          <div class="text-xs font-medium text-foreground">button</div>
          <n-input v-model:value="buttonText" placeholder="buttonText" />
          <n-input
            v-model:value="buttonPropsJson"
            type="textarea"
            :autosize="{ minRows: 4, maxRows: 10 }"
            class="font-mono text-xs"
          />
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
            <div class="flex items-center justify-between">
              <div class="text-xs text-muted-foreground">email</div>
              <n-switch size="small" v-model:value="email" />
            </div>
            <div class="flex items-center justify-between">
              <div class="text-xs text-muted-foreground">url</div>
              <n-switch size="small" v-model:value="url" />
            </div>
            <div class="flex items-center justify-between">
              <div class="text-xs text-muted-foreground">number</div>
              <n-switch size="small" v-model:value="number" />
            </div>
            <div class="flex items-center justify-between">
              <div class="text-xs text-muted-foreground">alphanumeric</div>
              <n-switch size="small" v-model:value="alphanumeric" />
            </div>
            <div class="flex items-center justify-between">
              <div class="text-xs text-muted-foreground">contains_alphanumeric</div>
              <n-switch size="small" v-model:value="containsAlphanumeric" />
            </div>
            <div class="flex items-center justify-between">
              <div class="text-xs text-muted-foreground">contains_numeric</div>
              <n-switch size="small" v-model:value="containsNumeric" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <n-input-number v-model:value="min" :placeholder="'min'" />
            <n-input-number v-model:value="max" :placeholder="'max'" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <n-input-number v-model:value="betweenMin" :placeholder="'between.min'" />
            <n-input-number v-model:value="betweenMax" :placeholder="'between.max'" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <n-input-number v-model:value="lengthMin" :placeholder="'length.min'" />
            <n-input-number v-model:value="lengthMax" :placeholder="'length.max'" />
          </div>
          <n-input v-model:value="matches" :placeholder="'matches (regex)'" />
          <n-input v-model:value="message" :placeholder="'message'" />
        </div>

        <n-divider />

        <div class="space-y-2 p-3 border border-border rounded-md bg-muted/30">
          <div class="text-xs font-medium text-foreground">props (raw)</div>
          <n-input
            v-model:value="rawPropsJson"
            type="textarea"
            :autosize="{ minRows: 6, maxRows: 18 }"
            class="font-mono text-xs"
          />
        </div>
      </template>
    </div>
  </div>
</template>
