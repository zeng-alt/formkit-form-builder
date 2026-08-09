<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import BindEditor from '../BindEditor.vue'
import SelectInput from '../common/SelectInput.vue'
import SwitchInput from '../common/SwitchInput.vue'
import { NO_EVENTS } from '@/elements/definitions/bind-events'

// 按钮组容器：无 label/help（纯展示容器），仅提供企业常用配置。
const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const groupSize = createPropsProp<string>('size', 'medium')
const groupVertical = createPropsProp<boolean>('vertical', false)
const groupDisabled = createPropsProp<boolean>('disabled', false)
</script>

<template>
  <BindEditor :events="NO_EVENTS" />
  <SelectInput
    :label="t('edits.props.size')"
    :value="groupSize"
    :options="[
      { label: 'tiny', value: 'tiny' },
      { label: 'small', value: 'small' },
      { label: 'medium', value: 'medium' },
      { label: 'large', value: 'large' },
    ]"
    @update:value="(v) => (groupSize = v)"
  />
  <SwitchInput
    :label="t('edits.props.vertical')"
    :value="groupVertical"
    @update:value="(v) => (groupVertical = v)"
  />
  <SwitchInput
    :label="t('edits.props.disabled')"
    :value="groupDisabled"
    @update:value="(v) => (groupDisabled = v)"
  />
</template>
