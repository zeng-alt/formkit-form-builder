<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton, NInput, NSwitch } from 'naive-ui'
import { useFormBuilderI18n } from '../../../i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useFormField } from '../../../composables/form-fields'
import ExprEditModal from './common/ExprEditModal.vue'

const { selectedIndex, selectedKey } = useFormBuilderState()
const { availableFields, ifExpression } = useFormField()
const { t } = useFormBuilderI18n()

const enabled = ref(false)
const draft = ref('')
const modalOpen = ref(false)

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
  if (!val) {
    ifExpression.value = ''
    draft.value = ''
  }
}

function openModal() {
  modalOpen.value = true
}

function handleSave(value: string) {
  draft.value = value
  ifExpression.value = value
  modalOpen.value = false
}
</script>

<template>
  <div class="space-y-2 mt-4 p-3 border border-border rounded-md bg-muted/30">
    <div class="flex items-center justify-between">
      <label class="text-xs font-medium text-foreground">{{ t('condition.useIf') }}</label>
      <n-switch size="small" :value="enabled" @update:value="handleSwitchChange" />
    </div>

    <div v-if="enabled" class="flex items-center gap-2">
      <n-input
        :value="draft"
        readonly
        size="small"
        class="flex-1"
        :placeholder="t('condition.placeholder')"
      />
      <n-button size="tiny" @click="openModal">
        <span class="i-lucide-pencil h-3.5 w-3.5" />
      </n-button>
    </div>

    <ExprEditModal
      :show="modalOpen"
      :model-value="draft"
      :field-names="availableFields"
      :title="t('condition.useIf')"
      @update:show="(v) => (modalOpen = v)"
      @save="handleSave"
    />
  </div>
</template>
