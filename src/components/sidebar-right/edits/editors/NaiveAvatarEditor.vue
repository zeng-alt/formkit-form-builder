<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import TextInput from '../common/TextInput.vue'

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const avatarSrc = createPropsProp<string>('src', '')
const avatarFallbackText = createPropsProp<string>('fallbackText', 'A')
</script>

<template>
  <TextInput
    :label="t('edits.props.src')"
    placeholder="https://..."
    :value="avatarSrc"
    @update:value="(v) => (avatarSrc = v)"
  />
  <TextInput
    :label="t('edits.props.fallbackText')"
    placeholder="A"
    :value="avatarFallbackText"
    @update:value="(v) => (avatarFallbackText = v)"
  />
  <!-- NAvatar 没有 disabled 概念（纯展示组件，naive-ui 运行时也没有声明这个 prop），
       不给禁用开关——留着只会是个拨了也没有任何效果的死开关；round/bordered 复用
       NaiveBasicSection 的同名开关，不再单独写一遍 -->
  <NaiveBasicSection :size="true" :round="true" :bordered="true" />
</template>
