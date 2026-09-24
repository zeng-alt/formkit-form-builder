<script setup lang="ts">
import { NColorPicker } from 'naive-ui'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import EditorSection from '../common/EditorSection.vue'
import NumberInput from '../common/NumberInput.vue'
import SwitchInput from '../common/SwitchInput.vue'

// 任务 C 的约定：不放 BindEditor / LabelHelpSection / NameInput，外层统一渲染。
const { createPropsProp, createDisabledProp } = useFormField()
const { t } = useFormBuilderI18n()

const height = createPropsProp<number>('height', 180)
const strokeColor = createPropsProp<string>('strokeColor', '#111111')
const strokeWidth = createPropsProp<number>('strokeWidth', 2)

const disabled = createDisabledProp()
const readonly = createPropsProp<boolean>('readonly', false)
</script>

<template>
  <EditorSection :title="t('edits.sections.appearance')">
    <NumberInput
      :label="t('edits.signature.heightLabel')"
      placeholder="180"
      :value="height"
      @update:value="(v) => (height = v ?? 180)"
    />
    <div>
      <label class="text-xs font-medium tracking-wide text-foreground/80 block mb-1">
        {{ t('edits.signature.strokeColorLabel') }}
      </label>
      <n-color-picker
        :show-alpha="false"
        :modes="['hex']"
        :value="strokeColor"
        @update:value="(v: string) => (strokeColor = v)"
      />
    </div>
    <NumberInput
      :label="t('edits.signature.strokeWidthLabel')"
      placeholder="2"
      :value="strokeWidth"
      @update:value="(v) => (strokeWidth = v ?? 2)"
    />
  </EditorSection>

  <EditorSection :title="t('edits.sections.behavior')">
    <SwitchInput
      :label="t('edits.props.disabled')"
      :value="disabled"
      @update:value="(v) => (disabled = v)"
    />
    <SwitchInput
      :label="t('edits.props.readonly')"
      :value="readonly"
      @update:value="(v) => (readonly = v)"
    />
  </EditorSection>
</template>
