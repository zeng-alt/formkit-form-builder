<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NModal, NTag } from 'naive-ui'
import { useFormBuilderI18n } from '../../../../i18n/context'
import { useFormField } from '../../../../composables/form-fields'
import TextInput from '../common/TextInput.vue'
import SelectInput from '../common/SelectInput.vue'
import JsCodeEditor from '../common/JsCodeEditor.vue'

const { t } = useFormBuilderI18n()
const { formName, formId, formVersion, formLabelPosition, formLabelWidth, formSubmit, availableFieldNames } = useFormField()

const labelWidth = computed({
  get: () => String(formLabelWidth.value),
  set: (v: string) => {
    const n = Number(v)
    formLabelWidth.value = Number.isFinite(n) ? n : 120
  },
})

const version = computed({
  get: () => String(formVersion.value),
  set: (v: string) => {
    const n = Number(v)
    formVersion.value = Number.isFinite(n) ? n : formVersion.value
  },
})

const isOpen = ref(false)
const draft = ref('')

function openEditor() {
  draft.value = formSubmit.value
  isOpen.value = true
}

function save() {
  formSubmit.value = draft.value
  isOpen.value = false
}
</script>

<template>
  <TextInput
    :label="t('formSettings.name')"
    placeholder="form"
    :value="formName"
    @update:value="(v: string) => (formName = v)"
  />
  <TextInput
    :label="t('formSettings.id')"
    placeholder="demo-form"
    :value="formId"
    @update:value="(v: string) => (formId = v)"
  />
  <TextInput
    :label="t('formSettings.version')"
    placeholder="2"
    :value="version"
    @update:value="(v: string) => (version = v)"
  />
  <SelectInput
    :label="t('formSettings.labelPosition')"
    :value="formLabelPosition"
    :options="[
      { label: t('formSettings.positionTop'), value: 'top' },
      { label: t('formSettings.positionLeft'), value: 'left' },
    ]"
    @update:value="(v: string) => (formLabelPosition = v === 'left' ? 'left' : 'top')"
  />
  <TextInput
    :label="t('formSettings.labelWidth')"
    placeholder="120"
    :value="labelWidth"
    @update:value="(v: string) => (labelWidth = v)"
  />

  <div class="mt-4">
    <div class="text-[11px] font-medium text-foreground/80 mb-2">
      {{ t('formSettings.submit') }}
    </div>
    <n-button
      size="small"
      type="primary"
      @click="openEditor"
      class="w-full justify-start border border-dashed rounded-xl"
    >
      <template #icon>
        <span class="i-lucide-code-2 h-5 w-5"></span>
      </template>
      {{ formSubmit ? t('formSettings.editSubmit') + ' (✓)' : t('formSettings.editSubmit') }}
    </n-button>
  </div>

  <n-modal v-model:show="isOpen" preset="card" class="max-w-[860px]">
    <template #header>
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium">{{ t('formSettings.editSubmit') }}</span>
        <n-tag size="small" type="success" :bordered="false">onSubmit</n-tag>
      </div>
    </template>

    <div class="space-y-2">
      <div class="text-[11px] text-muted-foreground">
        {{ t('builder.bindHint') }}
      </div>
      <JsCodeEditor v-model:modelValue="draft" :height="360" :field-names="availableFieldNames" />
      <div class="flex justify-end gap-2">
        <n-button size="small" @click="isOpen = false">{{ t('common.cancel') }}</n-button>
        <n-button size="small" type="primary" @click="save">{{ t('common.save') }}</n-button>
      </div>
    </div>
  </n-modal>
</template>
