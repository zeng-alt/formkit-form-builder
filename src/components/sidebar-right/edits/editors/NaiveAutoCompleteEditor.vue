<script setup lang="ts">
import { computed, ref } from 'vue'
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import PlaceholderSection from '../common/PlaceholderSection.vue'
import OptionsTagsSection from '../common/OptionsTagsSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import SwitchInput from '../common/SwitchInput.vue'
import SelectInput from '../common/SelectInput.vue'
import JsCodeEditor from '../common/JsCodeEditor.vue'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormField } from '../../../../composables/form-fields'
import { NButton, NModal } from 'naive-ui'
import { INPUT_FULL_EVENTS } from '@/elements/definitions/bind-events'

const { t } = useFormBuilderI18n()
const { createPropsProp, availableFieldNames } = useFormField()

const append = createPropsProp<boolean>('append', false)

// status：'default' 对应未设置（''），存 undefined 以从 DSL props 中清除
const statusRaw = createPropsProp<string | undefined>('status', undefined)
const status = computed<string>({
  get: () => statusRaw.value ?? '',
  set: (v: string) => {
    statusRaw.value = v || undefined
  },
})

const statusOptions = computed(() => [
  { label: 'default', value: '' },
  { label: 'success', value: 'success' },
  { label: 'warning', value: 'warning' },
  { label: 'error', value: 'error' },
])

// getShow 是函数类型，编辑器用 JS 代码承载（返回布尔值），DSL 存字符串
const getShowCode = createPropsProp<string>('getShow', '')
const codeOpen = ref(false)
const codeDraft = ref('')

function openCode() {
  codeDraft.value = getShowCode.value
  codeOpen.value = true
}

function saveCode() {
  getShowCode.value = codeDraft.value.trim()
  codeOpen.value = false
}
</script>

<template>
  <BindEditor :events="INPUT_FULL_EVENTS" />
  <LabelHelpSection />
  <PlaceholderSection />
  <OptionsTagsSection />
  <NaiveBasicSection :size="true" :disabled="true" :clearable="true" />

  <SwitchInput
    :label="t('edits.props.append')"
    :value="append"
    @update:value="(v) => (append = v)"
  />

  <SelectInput
    :label="t('edits.props.status')"
    :value="status"
    :options="statusOptions"
    @update:value="(v) => (status = v)"
  />

  <!-- getShow：聚焦时按输入值决定是否显示菜单（函数代码） -->
  <div class="flex items-center justify-between py-1">
    <label class="text-xs font-medium text-foreground/80">
      {{ t('edits.props.getShow') }}
    </label>
    <n-button text type="primary" size="tiny" :title="t('edits.props.getShow')" @click="openCode">
      <template #icon><span class="i-lucide-code-2 h-3.5 w-3.5" /></template>
    </n-button>
  </div>

  <n-modal v-model:show="codeOpen" preset="card" class="max-w-[860px]">
    <template #header>
      <span class="text-sm font-medium">{{ t('edits.props.getShow') }}</span>
    </template>
    <div class="space-y-2">
      <div class="text-[11px] text-muted-foreground whitespace-pre-wrap">
        {{ t('edits.props.getShowHint') }}
      </div>
      <JsCodeEditor
        v-model:modelValue="codeDraft"
        :height="220"
        :field-names="availableFieldNames"
        :quick-vars="['form', '$form', '$get', 'ctx', 'axios']"
      />
      <div class="flex justify-end gap-2">
        <n-button size="small" @click="codeOpen = false">
          {{ t('common.cancel') }}
        </n-button>
        <n-button size="small" type="primary" @click="saveCode">
          {{ t('common.save') }}
        </n-button>
      </div>
    </div>
  </n-modal>
</template>
