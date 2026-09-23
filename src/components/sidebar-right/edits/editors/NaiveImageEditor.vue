<script setup lang="ts">
import { computed } from 'vue'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import NumberInput from '../common/NumberInput.vue'
import RowSpanSection from '../common/RowSpanSection.vue'
import SelectInput from '../common/SelectInput.vue'
import SwitchInput from '../common/SwitchInput.vue'
import TextInput from '../common/TextInput.vue'
import { DISPLAY_CLICK_EVENTS } from '@/elements/definitions/bind-events'

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const src = createPropsProp<string>('src', '')
const alt = createPropsProp<string>('alt', '')

// K2：尺寸模式放在最前，按模式切换显示对应的专属配置（比例 / 最小高度 / 固定宽高）
const sizeMode = createPropsProp<string>('sizeMode', 'ratio')
const aspectRatio = createPropsProp<string>('aspectRatio', '16/9')

const minHeightRaw = createPropsProp<unknown>('minHeight', 120)
const minHeight = computed<number | null>({
  get: () => {
    const value = minHeightRaw.value
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(parsed) ? parsed : 120
  },
  set: (value: number | null) => {
    minHeightRaw.value = value ?? 120
  },
})

const widthRaw = createPropsProp<unknown>('width', 240)
const width = computed({
  get: () => {
    const value = widthRaw.value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'string') return value
    return '240'
  },
  set: (value: string) => {
    const parsed = Number(value)
    widthRaw.value = Number.isFinite(parsed) ? parsed : value
  },
})

const heightRaw = createPropsProp<unknown>('height', 160)
const height = computed({
  get: () => {
    const value = heightRaw.value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'string') return value
    return '160'
  },
  set: (value: string) => {
    const parsed = Number(value)
    heightRaw.value = Number.isFinite(parsed) ? parsed : value
  },
})

const objectFit = createPropsProp<string>('objectFit', 'cover')
const previewDisabled = createPropsProp<boolean>('previewDisabled', false)
const lazy = createPropsProp<boolean>('lazy', false)
</script>

<template>
  <BindEditor :events="DISPLAY_CLICK_EVENTS" />
  <LabelHelpSection />
  <SelectInput
    :label="t('edits.image.sizeModeLabel')"
    :value="sizeMode"
    :options="[
      { label: t('edits.image.sizeModeRatio'), value: 'ratio' },
      { label: t('edits.image.sizeModeFill'), value: 'fill' },
      { label: t('edits.image.sizeModeFixed'), value: 'fixed' },
    ]"
    @update:value="(v) => (sizeMode = v)"
  />
  <SelectInput
    v-if="sizeMode === 'ratio'"
    :label="t('edits.image.aspectRatioLabel')"
    :value="aspectRatio"
    :options="[
      { label: '16:9', value: '16/9' },
      { label: '4:3', value: '4/3' },
      { label: '3:2', value: '3/2' },
      { label: '1:1', value: '1/1' },
      { label: t('edits.image.aspectRatioOriginal'), value: 'original' },
    ]"
    @update:value="(v) => (aspectRatio = v)"
  />
  <NumberInput
    v-if="sizeMode === 'fill'"
    :label="t('edits.image.minHeightLabel')"
    :placeholder="t('edits.image.minHeightPlaceholder')"
    :value="minHeight"
    @update:value="(v) => (minHeight = v)"
  />
  <TextInput
    v-if="sizeMode === 'fixed'"
    :label="t('edits.image.widthLabel')"
    :placeholder="t('edits.image.widthPlaceholder')"
    :value="width"
    @update:value="(v) => (width = v)"
  />
  <TextInput
    v-if="sizeMode === 'fixed'"
    :label="t('edits.image.heightLabel')"
    :placeholder="t('edits.image.heightPlaceholder')"
    :value="height"
    @update:value="(v) => (height = v)"
  />
  <RowSpanSection />
  <!-- fill 模式下高度由占用行数撑开：同一行没有其它更高的字段时，靠上面的
       minHeight 兜底，这里提示一句，避免用户改了占用行数却不知道为什么高度没变 -->
  <div v-if="sizeMode === 'fill'" class="text-[11px] text-muted-foreground -mt-2">
    {{ t('edits.image.fillRowSpanHint') }}
  </div>
  <TextInput
    :label="t('edits.image.srcLabel')"
    :placeholder="t('edits.image.srcPlaceholder')"
    :value="src"
    @update:value="(v) => (src = v)"
  />
  <TextInput
    :label="t('edits.image.altLabel')"
    :placeholder="t('edits.image.altPlaceholder')"
    :value="alt"
    @update:value="(v) => (alt = v)"
  />
  <SelectInput
    :label="t('edits.image.objectFitLabel')"
    :value="objectFit"
    :options="[
      { label: 'fill', value: 'fill' },
      { label: 'contain', value: 'contain' },
      { label: 'cover', value: 'cover' },
      { label: 'none', value: 'none' },
      { label: 'scale-down', value: 'scale-down' },
    ]"
    @update:value="(v) => (objectFit = v)"
  />
  <SwitchInput
    :label="t('edits.image.previewDisabledLabel')"
    :value="previewDisabled"
    @update:value="(v) => (previewDisabled = v)"
  />
  <SwitchInput
    :label="t('edits.image.lazyLabel')"
    :value="lazy"
    @update:value="(v) => (lazy = v)"
  />
</template>
