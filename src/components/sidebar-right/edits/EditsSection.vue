<script setup lang="ts">
import { computed } from 'vue'
import { useFormField } from '../../../composables/form-fields'
import { useI18n } from 'vue-i18n'
import NameInput from './common/NameInput.vue'
import CheckboxEditor from './editors/CheckboxEditor.vue'
import ColorEditor from './editors/ColorEditor.vue'
import DateLikeEditor from './editors/DateLikeEditor.vue'
import DateTimeEditor from './editors/DateTimeEditor.vue'
import FileEditor from './editors/FileEditor.vue'
import GroupEditor from './editors/GroupEditor.vue'
import NaiveAvatarEditor from './editors/NaiveAvatarEditor.vue'
import NaiveBlockquoteEditor from './editors/NaiveBlockquoteEditor.vue'
import NaiveButtonEditor from './editors/NaiveButtonEditor.vue'
import NaiveCascaderEditor from './editors/NaiveCascaderEditor.vue'
import NaiveCheckboxEditor from './editors/NaiveCheckboxEditor.vue'
import NaiveDividerEditor from './editors/NaiveDividerEditor.vue'
import NaiveH1Editor from './editors/NaiveH1Editor.vue'
import NaiveH2Editor from './editors/NaiveH2Editor.vue'
import NaiveH3Editor from './editors/NaiveH3Editor.vue'
import NaiveH4Editor from './editors/NaiveH4Editor.vue'
import NaiveH5Editor from './editors/NaiveH5Editor.vue'
import NaiveH6Editor from './editors/NaiveH6Editor.vue'
import NaiveLiEditor from './editors/NaiveLiEditor.vue'
import NaiveLinkEditor from './editors/NaiveLinkEditor.vue'
import NaiveMentionEditor from './editors/NaiveMentionEditor.vue'
import NaiveOlEditor from './editors/NaiveOlEditor.vue'
import NaiveParagraphEditor from './editors/NaiveParagraphEditor.vue'
import NaiveRateEditor from './editors/NaiveRateEditor.vue'
import NaiveSwitchEditor from './editors/NaiveSwitchEditor.vue'
import NaiveTextEditor from './editors/NaiveTextEditor.vue'
import NaiveTreeSelectEditor from './editors/NaiveTreeSelectEditor.vue'
import NaiveUlEditor from './editors/NaiveUlEditor.vue'
import NumberEditor from './editors/NumberEditor.vue'
import RadioEditor from './editors/RadioEditor.vue'
import RangeEditor from './editors/RangeEditor.vue'
import SelectEditor from './editors/SelectEditor.vue'
import SubmitEditor from './editors/SubmitEditor.vue'
import TextLikeEditor from './editors/TextLikeEditor.vue'

const { hasField, currentFieldType } = useFormField()
const { t } = useI18n()

const editorComponent = computed(() => {
  const type = currentFieldType.value
  if (!type) return null

  if (['text', 'textarea', 'email', 'password', 'url', 'tel'].includes(type)) return TextLikeEditor
  if (type === 'number') return NumberEditor
  if (type === 'file') return FileEditor
  if (type === 'range') return RangeEditor
  if (type === 'select') return SelectEditor
  if (type === 'radio') return RadioEditor
  if (type === 'checkbox') return CheckboxEditor
  if (type === 'color') return ColorEditor
  if (['date', 'datetime-local', 'time'].includes(type)) return DateLikeEditor
  if (type === 'date-time') return DateTimeEditor
  if (type === 'submit') return SubmitEditor

  if (type === 'naiveCascader') return NaiveCascaderEditor
  if (type === 'naiveTreeSelect') return NaiveTreeSelectEditor
  if (type === 'naiveMention') return NaiveMentionEditor
  if (type === 'naiveRate') return NaiveRateEditor
  if (type === 'naiveSwitch') return NaiveSwitchEditor
  if (type === 'naiveCheckbox') return NaiveCheckboxEditor
  if (type === 'naiveAvatar') return NaiveAvatarEditor
  if (type === 'naiveButton') return NaiveButtonEditor

  if (type === 'naiveText') return NaiveTextEditor
  if (type === 'naiveP') return NaiveParagraphEditor
  if (type === 'naiveA') return NaiveLinkEditor
  if (type === 'naiveBlockquote') return NaiveBlockquoteEditor
  if (type === 'naiveH1') return NaiveH1Editor
  if (type === 'naiveH2') return NaiveH2Editor
  if (type === 'naiveH3') return NaiveH3Editor
  if (type === 'naiveH4') return NaiveH4Editor
  if (type === 'naiveH5') return NaiveH5Editor
  if (type === 'naiveH6') return NaiveH6Editor
  if (type === 'naiveDivider') return NaiveDividerEditor
  if (type === 'naiveUl') return NaiveUlEditor
  if (type === 'naiveOl') return NaiveOlEditor
  if (type === 'naiveLi') return NaiveLiEditor

  if (type === 'group' || type === 'list') return GroupEditor

  return null
})
</script>

<template>
  <div v-if="!hasField" class="flex p-2 h-full text-[11px] md:text-xs text-muted-foreground">
    {{ t('common.selectFieldToEdit') }}
  </div>
  <template v-else>
    <div class="p-2">
      <div class="space-y-2 md:space-y-3">
        <NameInput />
        <component :is="editorComponent" v-if="editorComponent" />
      </div>
    </div>
  </template>
</template>
