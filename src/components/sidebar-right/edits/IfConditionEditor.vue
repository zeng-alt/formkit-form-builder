<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NAlert, NInput, NSwitch } from 'naive-ui'
import { useFormBuilderI18n } from '../../../i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { evalExpression } from '../../../utils/expression-eval'
import { useFormField } from '../../../composables/form-fields'

// 所属 FormBuilder 实例状态：选中 token 绑定到各自实例。
const { selectedIndex, selectedKey } = useFormBuilderState()
const { availableFieldNames, ifExpression } = useFormField()
const { t } = useFormBuilderI18n()

const enabled = ref(false)
const draft = ref('')

const selectionToken = computed(() => selectedKey.value ?? String(selectedIndex.value))

watch(
  selectionToken,
  () => {
    enabled.value = Boolean(ifExpression.value)
    draft.value = ifExpression.value
  },
  { immediate: true },
)

watch(ifExpression, (v) => {
  if (!enabled.value) return
  if (draft.value !== v) draft.value = v
})

const handleSwitchChange = (val: boolean) => {
  enabled.value = val
  if (val) {
    if (!ifExpression.value) ifExpression.value = '$'
    draft.value = ifExpression.value
  } else {
    ifExpression.value = ''
    draft.value = ''
  }
}

const variableRegex = /\$([a-zA-Z0-9_]+)/g

const missingVariables = computed(() => {
  if (!enabled.value || !draft.value) return []
  const matches = [...draft.value.matchAll(variableRegex)]
  const variables = matches.map((m) => m[1]).filter(Boolean) as string[]
  return variables.filter((v) => !availableFieldNames.value.includes(v))
})

const expressionError = computed(() => {
  if (!enabled.value) return ''
  const expr = draft.value
  if (!expr.trim()) return ''
  const res = evalExpression(expr, {})
  if (res.ok) return ''
  return res.error
})
</script>

<template>
  <div class="space-y-2 mt-4 p-3 border border-border rounded-md bg-muted/30">
    <div class="flex items-center justify-between">
      <label class="text-xs font-medium text-foreground">{{ t('condition.useIf') }}</label>
      <n-switch size="small" :value="enabled" @update:value="handleSwitchChange" />
    </div>

    <div v-if="enabled" class="space-y-2">
      <n-input
        :value="draft"
        @update:value="
          (v) => {
            draft = v
            ifExpression = v
          }
        "
        type="textarea"
        :placeholder="t('condition.placeholder')"
        :autosize="{ minRows: 2, maxRows: 5 }"
      />
      <n-alert v-if="expressionError" type="error" :show-icon="true" class="mt-2 text-xs">
        {{ expressionError }}
      </n-alert>
      <n-alert
        v-if="missingVariables.length > 0"
        type="warning"
        :show-icon="true"
        class="mt-2 text-xs"
      >
        {{ t('expression.variablesNotFound', { vars: missingVariables.join(', ') }) }}
      </n-alert>
    </div>
  </div>
</template>
