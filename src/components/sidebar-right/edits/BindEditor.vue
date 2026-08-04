<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NCard, NDivider, NModal, NTag } from 'naive-ui'
import { useFormField } from '../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../i18n/context'
import SwitchInput from './common/SwitchInput.vue'
import JsCodeEditor from './common/JsCodeEditor.vue'

type EventDef = {
  key: string
  title: string
  placeholder: string
}

const events: EventDef[] = [
  {
    key: 'onClick',
    title: 'Click',
    placeholder: `// 可用参数：event · form 表单数据 · id 表单ID · version 版本 · $value 当前值 · $node 节点 · $name 字段名 · $get(name) 取字段值 · $slots 插槽 · attrs 节点配置 · ctx 全量合并 · axios
console.log('event', event)
console.log('form', form)
console.log('id', id)
console.log('version', version)
console.log('$value', $value)
console.log('$node', $node)
console.log('$name', $name)
console.log('$get', $get)
console.log('$slots', $slots)
console.log('attrs', attrs)
console.log('ctx', ctx)
await axios.get('/api/ping')`,
  },
  {
    key: 'onChange',
    title: 'Change',
    placeholder: `console.log('change', event)`,
  },
  {
    key: 'onInput',
    title: 'Input',
    placeholder: `console.log('input', event)`,
  },
  {
    key: 'onFocus',
    title: 'Focus',
    placeholder: `console.log('focus', event)`,
  },
  {
    key: 'onBlur',
    title: 'Blur',
    placeholder: `console.log('blur', event)`,
  },
]

const { hasField, bindEvents: bindRef } = useFormField()
const { t } = useFormBuilderI18n()

const isOpen = ref(false)
const activeEventKey = ref<string>('onClick')
const draft = ref('')

const bindObj = computed<Record<string, unknown>>({
  get: () => {
    const current = bindRef.value
    if (!current || typeof current !== 'object') return {}
    return current as Record<string, unknown>
  },
  set: (next) => {
    bindRef.value = next
  },
})

const enabledEvents = computed(() => {
  return events.filter((e) => Boolean(bindObj.value[e.key]))
})

function isEventEnabled(key: string): boolean {
  return Boolean(bindObj.value[key])
}

function setEventEnabled(key: string, enabled: boolean) {
  const next = { ...bindObj.value }
  if (!enabled) {
    delete next[key]
    bindObj.value = next
    return
  }
  const existing = next[key] as any
  if (typeof existing === 'string') {
    bindObj.value = next
    return
  }
  if (existing && typeof existing === 'object' && typeof existing.__js === 'string') {
    next[key] = existing.__js
    bindObj.value = next
    return
  }
  const def = events.find((e) => e.key === key)
  next[key] = def?.placeholder ?? ''
  bindObj.value = next
}

function openEditor(key: string) {
  activeEventKey.value = key
  const cur = bindObj.value[key] as any
  if (typeof cur === 'string') draft.value = cur
  else if (cur && typeof cur === 'object' && typeof cur.__js === 'string') draft.value = cur.__js
  else draft.value = ''
  isOpen.value = true
}

function save() {
  const key = activeEventKey.value
  const next = { ...bindObj.value }
  next[key] = draft.value
  bindObj.value = next
  isOpen.value = false
}
</script>

<template>
  <div v-if="hasField" class="space-y-2">
    <n-card size="small" class="rounded-xl border border-border/50">
      <div class="flex items-start gap-3">
        <div class="w-28 shrink-0">
          <div class="text-[11px] font-medium text-foreground/80 mb-2">
            {{ t('builder.bindEvents') }}
          </div>
          <div class="flex flex-col gap-1.5">
            <n-button
              v-for="ev in enabledEvents"
              :key="ev.key"
              size="tiny"
              quaternary
              class="justify-start"
              @click="openEditor(ev.key)"
            >
              {{ ev.title }}
            </n-button>
            <div v-if="enabledEvents.length === 0" class="text-[11px] text-muted-foreground">
              {{ t('builder.noEvents') }}
            </div>
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <div class="text-xs font-medium text-foreground/80">{{ t('builder.bindTitle') }}</div>
            <n-tag size="small" type="info" :bordered="false">axios</n-tag>
          </div>
          <n-divider class="!my-2" />
          <div class="space-y-1">
            <SwitchInput
              v-for="ev in events"
              :key="ev.key"
              :label="ev.title"
              :value="isEventEnabled(ev.key)"
              @update:value="(v) => setEventEnabled(ev.key, v)"
            />
          </div>
        </div>
      </div>
    </n-card>

    <n-modal v-model:show="isOpen" preset="card" class="max-w-[860px]">
      <template #header>
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">{{ t('builder.editEvent') }}</span>
          <n-tag size="small" type="success" :bordered="false">{{ activeEventKey }}</n-tag>
        </div>
      </template>

      <div class="space-y-2">
        <div class="text-[11px] text-muted-foreground">
          {{ t('builder.bindHint') }}
        </div>
        <JsCodeEditor v-model:modelValue="draft" :height="360" />
        <div class="flex justify-end gap-2">
          <n-button size="small" @click="isOpen = false">{{ t('common.cancel') }}</n-button>
          <n-button size="small" type="primary" @click="save">{{ t('common.save') }}</n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>
