<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NModal, NTag } from 'naive-ui'
import { useFormBuilderI18n } from '../../../../i18n/context'
import { useFormField } from '../../../../composables/form-fields'
import { DEFAULT_LABEL_WIDTH } from '../../../../utils/form-layout'
import EditorSection from '../common/EditorSection.vue'
import TextInput from '../common/TextInput.vue'
import SelectInput from '../common/SelectInput.vue'
import SwitchInput from '../common/SwitchInput.vue'
import JsCodeEditor from '../common/JsCodeEditor.vue'

const { t } = useFormBuilderI18n()
const {
  formName,
  formId,
  formVersion,
  formLabelPosition,
  formLabelWidth,
  formSize,
  formDisabled,
  formReadonly,
  formSubmit,
  formSuccessMessage,
  formSuccessRedirect,
  formShowReset,
  formSubmitText,
  formResetText,
  availableFieldNames,
} = useFormField()

const labelWidth = computed({
  get: () => String(formLabelWidth.value),
  set: (v: string) => {
    const n = Number(v)
    formLabelWidth.value = Number.isFinite(n) ? n : DEFAULT_LABEL_WIDTH
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
  <EditorSection :title="t('formSettings.sections.basic')">
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
  </EditorSection>

  <EditorSection :title="t('formSettings.sections.layout')">
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
    <SelectInput
      :label="t('formSettings.size')"
      :value="formSize ?? ''"
      :options="[
        { label: t('formSettings.sizeDefault'), value: '' },
        { label: t('formSettings.sizeSmall'), value: 'small' },
        { label: t('formSettings.sizeMedium'), value: 'medium' },
        { label: t('formSettings.sizeLarge'), value: 'large' },
      ]"
      @update:value="
        (v: string) => (formSize = v === 'small' || v === 'medium' || v === 'large' ? v : undefined)
      "
    />
  </EditorSection>

  <EditorSection :title="t('formSettings.sections.status')">
    <SwitchInput
      :label="t('formSettings.disabled')"
      :value="formDisabled"
      @update:value="(v: boolean) => (formDisabled = v)"
    />
    <SwitchInput
      :label="t('formSettings.readonly')"
      :value="formReadonly"
      @update:value="(v: boolean) => (formReadonly = v)"
    />
  </EditorSection>

  <EditorSection :title="t('formSettings.sections.submit')">
    <div>
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

    <TextInput
      :label="t('formSettings.successMessage')"
      :placeholder="t('formSettings.successMessagePlaceholder')"
      :value="formSuccessMessage"
      @update:value="(v: string) => (formSuccessMessage = v)"
    />
    <TextInput
      :label="t('formSettings.successRedirect')"
      :placeholder="t('formSettings.successRedirectPlaceholder')"
      :value="formSuccessRedirect"
      @update:value="(v: string) => (formSuccessRedirect = v)"
    />
    <TextInput
      :label="t('formSettings.submitText')"
      :placeholder="t('elements.submit.label')"
      :value="formSubmitText"
      @update:value="(v: string) => (formSubmitText = v)"
    />
    <SwitchInput
      :label="t('formSettings.showReset')"
      :value="formShowReset"
      @update:value="(v: boolean) => (formShowReset = v)"
    />
    <TextInput
      v-if="formShowReset"
      :label="t('formSettings.resetText')"
      :placeholder="t('elements.reset.label')"
      :value="formResetText"
      @update:value="(v: string) => (formResetText = v)"
    />
  </EditorSection>

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
      <JsCodeEditor
        v-model:modelValue="draft"
        :height="360"
        :field-names="availableFieldNames"
        :quick-vars="['form', '$form', 'ctx', 'axios']"
      />
      <div class="flex justify-end gap-2">
        <n-button size="small" @click="isOpen = false">{{ t('common.cancel') }}</n-button>
        <n-button size="small" type="primary" @click="save">{{ t('common.save') }}</n-button>
      </div>
    </div>
  </n-modal>
</template>
