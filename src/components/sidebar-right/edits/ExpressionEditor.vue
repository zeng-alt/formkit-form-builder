<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NSwitch, NInput, NAlert } from 'naive-ui'
import { useFormField } from '../../../composables/form-fields'
import { selectedIndex } from '../../../utils/default-form-elements'
import { evalExpression } from '../../../utils/expression-eval'
import { useFormBuilderI18n } from '../../../i18n/context'

const { availableFieldNames, useExpressionValue, valueExpression, fieldValue } = useFormField()
const { t } = useFormBuilderI18n()

const isExpression = ref(false)
const expressionDraft = ref('')

// Reset switch state when selecting a different field
watch(
  selectedIndex,
  () => {
    const legacy = fieldValue.value.trim()
    if (!useExpressionValue.value && !valueExpression.value && legacy.startsWith('$')) {
      useExpressionValue.value = true
      valueExpression.value = legacy
      fieldValue.value = ''
    }
    isExpression.value = Boolean(useExpressionValue.value)
    expressionDraft.value = valueExpression.value
  },
  { immediate: true }
)

watch(valueExpression, (v) => {
  if (!isExpression.value) return
  if (expressionDraft.value !== v) expressionDraft.value = v
})

const handleSwitchChange = (val: boolean) => {
  isExpression.value = val
  if (val) {
    useExpressionValue.value = true
    if (!valueExpression.value) valueExpression.value = '$'
    expressionDraft.value = valueExpression.value
  } else {
    useExpressionValue.value = false
    valueExpression.value = ''
    expressionDraft.value = ''
    if (fieldValue.value.trim().startsWith('$')) fieldValue.value = ''
  }
}

// Regex to extract variables
const variableRegex = /\$([a-zA-Z0-9_]+)/g


const missingVariables = computed(() => {
  if (!isExpression.value || !expressionDraft.value) return []
  
  const matches = [...expressionDraft.value.matchAll(variableRegex)]
  const variables = matches.map(match => match[1]).filter(Boolean) as string[]
  
  const missing = variables.filter(v => !availableFieldNames.value.includes(v))
  return missing
})

const expressionError = computed(() => {
  if (!isExpression.value) return ''
  const expr = expressionDraft.value
  if (!expr.trim()) return ''
  const res = evalExpression(expr, {})
  if (res.ok) return ''
  return res.error
})
</script>

<template>
  <div class="space-y-2 mt-4 p-3 border border-border rounded-md bg-muted/30">
    <div class="flex items-center justify-between">
      <label class="text-xs font-medium text-foreground">{{ t('expression.useExpressionValue') }}</label>
      <n-switch size="small" :value="isExpression" @update:value="handleSwitchChange" />
    </div>
    
    <div v-if="isExpression" class="space-y-2">
      <n-input
        :value="expressionDraft"
        @update:value="(v) => { expressionDraft = v; valueExpression = v }"
        type="textarea"
        :placeholder="t('expression.placeholder')"
        :autosize="{ minRows: 2, maxRows: 5 }"
      />
      <n-alert v-if="expressionError" type="error" :show-icon="true" class="mt-2 text-xs">
        {{ expressionError }}
      </n-alert>
      <n-alert v-if="missingVariables.length > 0" type="warning" :show-icon="true" class="mt-2 text-xs">
        {{ t('expression.variablesNotFound', { vars: missingVariables.join(', ') }) }}
      </n-alert>
    </div>
  </div>
</template>
