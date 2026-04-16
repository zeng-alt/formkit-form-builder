<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NSwitch, NInput, NAlert } from 'naive-ui'
import { useFormField } from '../../../composables/form-fields'
import { selectedIndex } from '../../../utils/default-form-elements'
import { evalExpression } from '../../../utils/expression-eval'

const { availableFieldNames, useExpressionValue, valueExpression, fieldValue } = useFormField()

const isExpression = ref(false)

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
  },
  { immediate: true }
)

const handleSwitchChange = (val: boolean) => {
  isExpression.value = val
  if (val) {
    useExpressionValue.value = true
    if (!valueExpression.value) valueExpression.value = '$'
  } else {
    useExpressionValue.value = false
    valueExpression.value = ''
    if (fieldValue.value.trim().startsWith('$')) fieldValue.value = ''
  }
}

// Regex to extract variables
const variableRegex = /\$([a-zA-Z0-9_]+)/g


const missingVariables = computed(() => {
  if (!isExpression.value || !valueExpression.value) return []
  
  const matches = [...valueExpression.value.matchAll(variableRegex)]
  const variables = matches.map(match => match[1]).filter(Boolean) as string[]
  
  const missing = variables.filter(v => !availableFieldNames.value.includes(v))
  return missing
})

const expressionError = computed(() => {
  if (!isExpression.value) return ''
  const expr = valueExpression.value
  if (!expr.trim()) return ''
  const res = evalExpression(expr, {})
  if (res.ok) return ''
  return res.error
})
</script>

<template>
  <div class="space-y-2 mt-4 p-3 border border-border rounded-md bg-muted/30">
    <div class="flex items-center justify-between">
      <label class="text-xs font-medium text-foreground">Use expression value</label>
      <n-switch size="small" :value="isExpression" @update:value="handleSwitchChange" />
    </div>
    
    <div v-if="isExpression" class="space-y-2">
      <n-input
        v-model:value="valueExpression"
        type="textarea"
        placeholder="e.g. $my_variable + 1"
        :autosize="{ minRows: 2, maxRows: 5 }"
      />
      <n-alert v-if="expressionError" type="error" :show-icon="true" class="mt-2 text-xs">
        {{ expressionError }}
      </n-alert>
      <n-alert v-if="missingVariables.length > 0" type="warning" :show-icon="true" class="mt-2 text-xs">
        Variables not found: {{ missingVariables.join(', ') }}
      </n-alert>
    </div>
  </div>
</template>
