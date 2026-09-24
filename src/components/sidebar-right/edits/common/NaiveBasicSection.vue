<script setup lang="ts">
import { computed } from 'vue'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import EditorSection from './EditorSection.vue'
import NumberInput from './NumberInput.vue'
import SelectInput from './SelectInput.vue'
import SwitchInput from './SwitchInput.vue'
import TextInput from './TextInput.vue'

// 各类 naive-ui 字段共用的通用开关集合：右侧面板按「外观 / 行为」两组渲染
// （见任务 C 的分组约定），哪些开关出现由父编辑器按控件实际支持的 prop 传入。
const props = withDefaults(
  defineProps<{
    size?: boolean
    disabled?: boolean
    clearable?: boolean
    bordered?: boolean
    readonly?: boolean
    round?: boolean
    autofocus?: boolean
    showCount?: boolean
    showPasswordOn?: boolean
    maxlength?: boolean
    minlength?: boolean
    /** 选项类字段（下拉/级联/树选择）的可搜索开关 */
    filterable?: boolean
    /** 选项类字段的多选开关 */
    multiple?: boolean
    /** 文本类字段的前缀（原 PrefixSuffixSection，并入同一个「外观」分组，避免相邻
     *  两个"外观"标题重复出现） */
    prefix?: boolean
    /** 同上，后缀 */
    suffix?: boolean
    sizeOptions?: Array<{ label: string; value: string }>
  }>(),
  {
    sizeOptions: () => [
      { label: 'tiny', value: 'tiny' },
      { label: 'small', value: 'small' },
      { label: 'medium', value: 'medium' },
      { label: 'large', value: 'large' },
    ],
  },
)

const { createPropsProp, createDisabledProp } = useFormField()
const { t } = useFormBuilderI18n()

const naivePrefix = createPropsProp<string>('prefix', '')
const naiveSuffix = createPropsProp<string>('suffix', '')
const naiveSize = createPropsProp<string>('size', 'medium')
// disabled 关闭时必须删键而非写 false，否则该字段会锁死、不再响应整表单/分组级联
// 禁用——见 form-fields.ts 的 createDisabledProp 注释
const naiveDisabled = createDisabledProp()
const naiveClearable = createPropsProp<boolean>('clearable', true)
const naiveBordered = createPropsProp<boolean>('bordered', true)
const naiveReadonly = createPropsProp<boolean>('readonly', false)
const naiveRound = createPropsProp<boolean>('round', false)
const naiveAutofocus = createPropsProp<boolean>('autofocus', false)
const naiveShowCount = createPropsProp<boolean>('showCount', false)
const naiveShowPasswordOn = createPropsProp<string>('showPasswordOn', 'click')
const naiveMaxlength = createPropsProp<number | null>('maxlength', null)
const naiveMinlength = createPropsProp<number | null>('minlength', null)
const naiveFilterable = createPropsProp<boolean>('filterable', false)
const naiveMultiple = createPropsProp<boolean>('multiple', false)

const hasAppearance = computed(
  () =>
    Boolean(props.prefix) ||
    Boolean(props.suffix) ||
    Boolean(props.size) ||
    Boolean(props.bordered) ||
    Boolean(props.round),
)
const hasBehavior = computed(
  () =>
    Boolean(props.disabled) ||
    Boolean(props.clearable) ||
    Boolean(props.readonly) ||
    Boolean(props.filterable) ||
    Boolean(props.multiple) ||
    Boolean(props.autofocus) ||
    Boolean(props.showCount) ||
    Boolean(props.showPasswordOn) ||
    Boolean(props.maxlength) ||
    Boolean(props.minlength),
)
</script>

<template>
  <EditorSection v-if="hasAppearance" :title="t('edits.sections.appearance')">
    <TextInput
      v-if="props.prefix"
      :label="t('edits.props.prefix')"
      :placeholder="t('edits.placeholder.prefix')"
      :value="naivePrefix"
      @update:value="(v) => (naivePrefix = v)"
    />
    <TextInput
      v-if="props.suffix"
      :label="t('edits.props.suffix')"
      :placeholder="t('edits.placeholder.suffix')"
      :value="naiveSuffix"
      @update:value="(v) => (naiveSuffix = v)"
    />
    <SelectInput
      v-if="props.size"
      :label="t('edits.props.size')"
      :value="naiveSize"
      :options="props.sizeOptions"
      @update:value="(v) => (naiveSize = v)"
    />
    <SwitchInput
      v-if="props.bordered"
      :label="t('edits.props.bordered')"
      :value="naiveBordered"
      @update:value="(v) => (naiveBordered = v)"
    />
    <SwitchInput
      v-if="props.round"
      :label="t('edits.props.round')"
      :value="naiveRound"
      @update:value="(v) => (naiveRound = v)"
    />
  </EditorSection>

  <EditorSection v-if="hasBehavior" :title="t('edits.sections.behavior')">
    <SwitchInput
      v-if="props.disabled"
      :label="t('edits.props.disabled')"
      :value="naiveDisabled"
      @update:value="(v) => (naiveDisabled = v)"
    />
    <SwitchInput
      v-if="props.clearable"
      :label="t('edits.props.clearable')"
      :value="naiveClearable"
      @update:value="(v) => (naiveClearable = v)"
    />
    <SwitchInput
      v-if="props.readonly"
      :label="t('edits.props.readonly')"
      :value="naiveReadonly"
      @update:value="(v) => (naiveReadonly = v)"
    />
    <SwitchInput
      v-if="props.filterable"
      :label="t('edits.props.filterable')"
      :value="naiveFilterable"
      @update:value="(v) => (naiveFilterable = v)"
    />
    <SwitchInput
      v-if="props.multiple"
      :label="t('edits.props.multiple')"
      :value="naiveMultiple"
      @update:value="(v) => (naiveMultiple = v)"
    />
    <SwitchInput
      v-if="props.autofocus"
      :label="t('edits.props.autofocus')"
      :value="naiveAutofocus"
      @update:value="(v) => (naiveAutofocus = v)"
    />
    <SwitchInput
      v-if="props.showCount"
      :label="t('edits.props.showCount')"
      :value="naiveShowCount"
      @update:value="(v) => (naiveShowCount = v)"
    />
    <SelectInput
      v-if="props.showPasswordOn"
      :label="t('edits.props.showPasswordOn')"
      :value="naiveShowPasswordOn"
      :options="[
        { label: 'click', value: 'click' },
        { label: 'mousedown', value: 'mousedown' },
      ]"
      @update:value="(v) => (naiveShowPasswordOn = v)"
    />
    <NumberInput
      v-if="props.maxlength"
      :label="t('edits.props.maxlength')"
      placeholder="null"
      :value="naiveMaxlength"
      @update:value="(v) => (naiveMaxlength = v)"
    />
    <NumberInput
      v-if="props.minlength"
      :label="t('edits.props.minlength')"
      placeholder="null"
      :value="naiveMinlength"
      @update:value="(v) => (naiveMinlength = v)"
    />
  </EditorSection>
</template>
