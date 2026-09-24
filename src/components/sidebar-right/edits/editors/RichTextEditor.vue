<script setup lang="ts">
import { computed } from 'vue'
import { NCheckbox, NCheckboxGroup } from 'naive-ui'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import EditorSection from '../common/EditorSection.vue'
import NumberInput from '../common/NumberInput.vue'
import SwitchInput from '../common/SwitchInput.vue'
import TextInput from '../common/TextInput.vue'
import {
  RICH_TEXT_TOOLBAR_ITEMS,
  RICH_TEXT_TOOLBAR_META,
  type RichTextToolbarItem,
} from '@/components/ui/fields/rich-text-toolbar'

// 任务 C 的约定：不在这里放 BindEditor / LabelHelpSection / NameInput，外层统一渲染，
// 本编辑器只负责 richText 自己的「外观」「行为」分组。
const { createPropsProp, createDisabledProp } = useFormField()
const { t } = useFormBuilderI18n()

const placeholder = createPropsProp<string>('placeholder', '')
const minHeight = createPropsProp<number>('minHeight', 160)
const maxLength = createPropsProp<number | null>('maxLength', null)
const toolbarRaw = createPropsProp<RichTextToolbarItem[]>('toolbar', [...RICH_TEXT_TOOLBAR_ITEMS])
const toolbar = computed<string[]>({
  get: () => (Array.isArray(toolbarRaw.value) ? toolbarRaw.value : [...RICH_TEXT_TOOLBAR_ITEMS]),
  set: (v) => (toolbarRaw.value = v as RichTextToolbarItem[]),
})

// disabled 关闭时需删键而非写 false（级联禁用语义，见 form-fields.ts 注释）
const disabled = createDisabledProp()
const readonly = createPropsProp<boolean>('readonly', false)
</script>

<template>
  <EditorSection :title="t('edits.sections.appearance')">
    <TextInput
      :label="t('edits.placeholderLabel')"
      :placeholder="t('edits.placeholder.placeholder')"
      :value="placeholder"
      @update:value="(v) => (placeholder = v)"
    />
    <NumberInput
      :label="t('edits.richText.minHeightLabel')"
      placeholder="160"
      :value="minHeight"
      @update:value="(v) => (minHeight = v ?? 160)"
    />
    <div>
      <label class="text-xs font-medium tracking-wide text-foreground/80 block mb-1.5">
        {{ t('edits.richText.toolbarLabel') }}
      </label>
      <n-checkbox-group v-model:value="toolbar">
        <div class="grid grid-cols-2 gap-1.5">
          <n-checkbox v-for="item in RICH_TEXT_TOOLBAR_ITEMS" :key="item" :value="item">
            <span class="inline-flex items-center gap-1 text-xs">
              <span :class="[RICH_TEXT_TOOLBAR_META[item].icon, 'h-3 w-3']"></span>
              {{ t(`edits.richText.toolbar.${item}`) }}
            </span>
          </n-checkbox>
        </div>
      </n-checkbox-group>
    </div>
  </EditorSection>

  <EditorSection :title="t('edits.sections.behavior')">
    <NumberInput
      :label="t('edits.richText.maxLengthLabel')"
      :placeholder="t('edits.richText.maxLengthPlaceholder')"
      :value="maxLength"
      @update:value="(v) => (maxLength = v)"
    />
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
