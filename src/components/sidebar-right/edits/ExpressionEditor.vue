<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NSwitch, NInput, NAlert } from 'naive-ui'
import { useFormField } from '../../../composables/form-fields'
import { selectedIndex } from '../../../utils/default-form-elements'

const { fieldValue, availableFieldNames } = useFormField()

// Determine if the current value is an expression.
const isExpression = ref(false)

// Reset switch state when selecting a different field
watch(
  selectedIndex,
  () => {
    const val = fieldValue.value
    if (val && typeof val === 'string' && val.startsWith('$')) {
      isExpression.value = true
    } else {
      isExpression.value = false
    }
  },
  { immediate: true }
)

const handleSwitchChange = (val: boolean) => {
  isExpression.value = val
  if (!val) {
    if (fieldValue.value.startsWith('$')) {
      fieldValue.value = ''
    }
  } else {
    if (!fieldValue.value) {
      fieldValue.value = '$'
    }
  }
}

// Regex to extract variables
const variableRegex = /\$([a-zA-Z0-9_]+)/g


const missingVariables = computed(() => {
  if (!isExpression.value || !fieldValue.value) return []
  
  const matches = [...fieldValue.value.matchAll(variableRegex)]
  const variables = matches.map(match => match[1]).filter(Boolean) as string[]
  
  const missing = variables.filter(v => !availableFieldNames.value.includes(v))
  return missing
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
        v-model:value="fieldValue"
        type="textarea"
        placeholder="e.g. $my_variable + 1"
        :autosize="{ minRows: 2, maxRows: 5 }"
      />
      <n-alert v-if="missingVariables.length > 0" type="warning" :show-icon="true" class="mt-2 text-xs">
        Variables not found: {{ missingVariables.join(', ') }}
      </n-alert>
    </div>
  </div>
</template>
