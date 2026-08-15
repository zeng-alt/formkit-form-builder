<script setup lang="ts">
import instructions from './Instructions.txt?raw'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { cn } from '../../utils/utils'
import { NButton, NInput, NPopover, NTooltip } from 'naive-ui'
import { useFormBuilderConfig } from '../../composables/use-config'
import { useFormBuilderI18n } from '../../i18n/context'
import { useMediaQuery } from '@vueuse/core'
import { useFormBuilderState } from '@/state/create-form-builder-state'

// 所属 FormBuilder 实例状态：AI 生成写回各自实例的 schema / 加载态。
const { isLoading, commitSchema } = useFormBuilderState()

const isMobile = useMediaQuery('(max-width: 768px)')

const config = useFormBuilderConfig()
const { t } = useFormBuilderI18n()
const inputRef = ref('')
const isFocusedVal = ref(false)
const isOpen = ref(false)

const parseFormSchema = (jsonString: string): FormKitSchemaFormKit[] => {
  try {
    // Parse JSON string into a JavaScript array
    return JSON.parse(jsonString) as FormKitSchemaFormKit[]
  } catch (error) {
    console.error('Error parsing form schema JSON:', error)
    return []
  }
}

// 从 AI 回复中提取 JSON 数组：兼容 ```json 代码块或直接以 [ 开头的纯 JSON
const extractJson = (text: string): string => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]?.trim()) return fenced[1].trim()
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start !== -1 && end > start) return text.slice(start, end + 1)
  return text.trim()
}

const handleClick = async () => {
  if (inputRef.value === '') {
    toast(t('ai.emptyPrompt'), {
      description: t('ai.emptyPromptDescription'),
      action: {
        label: t('ai.close'),
      },
    })
    return
  }

  isLoading.value = true
  try {
    // OpenAI 兼容 Chat Completions 接口（零依赖，直接用 fetch）
    const baseUrl = (config.aiBaseUrl || 'https://api.deepseek.com').replace(/\/+$/, '')
    const model = config.aiModel || 'deepseek-chat'
    const systemPrompt = config.aiSystemPrompt || instructions || t('ai.defaultInstructions')

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: inputRef.value },
        ],
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(t('ai.requestFailed') + ` (${response.status}) ${detail}`)
    }

    const data = await response.json()
    const content: string = data?.choices?.[0]?.message?.content ?? ''

    const schema = parseFormSchema(extractJson(content))
    if (!Array.isArray(schema) || schema.length === 0) {
      throw new Error(t('ai.parseFailed'))
    }

    commitSchema(schema as FormKitSchemaFormKit[], { reason: 'ai' })
    inputRef.value = ''
  } catch (err: any) {
    console.error('AI generate schema failed:', err)
    toast(t('ai.requestFailed'), {
      description: err?.message || String(err),
    })
  } finally {
    isLoading.value = false
  }
}

const isFocused = () => {
  isFocusedVal.value = !isFocusedVal.value
}
</script>

<template>
  <div
    v-if="!isMobile"
    :class="
      cn(
        'flex w-full min-w-0 rounded-lg card relative items-center justify-center',
        'bg-gradient-to-br from-secondary to-emerald-100/80 dark:from-secondary dark:to-emerald-800/80 dark:border-ring/5',
        isFocusedVal
          ? 'ring-2 ring-ring transition-all duration-300'
          : 'border border-ring/20 dark:border-ring/10 transition-all duration-300',
        isLoading ? 'bg-primary/5 shadow-inner animate-pulse transition-colors duration-300' : '',
      )
    "
  >
    <span class="start-0 inset-y-0 flex items-center justify-center px-2">
      <span :class="cn('i-lucide-bot-message-square size-6 text-muted-foreground')"></span>
    </span>
    <n-input
      type="textarea"
      @focus="isFocused"
      @blur="isFocused"
      status="warning"
      class="border-none shadow-none bg-transparent flex-1"
      :autosize="{ minRows: 1, maxRows: 4 }"
      :placeholder="t('ai.placeholder')"
      v-model:value="inputRef"
    />
    <n-button
      quaternary
      size="medium"
      class="hover:bg-green-500 dark:hover:bg-green-500/30 hover:text-white h-6 w-6 mr-2"
      @click="handleClick()"
      :disabled="isLoading"
    >
      <template #icon>
        <span class="i-lucide-send-horizontal h-4 w-4"></span>
      </template>
    </n-button>
  </div>

  <n-popover
    v-if="isMobile"
    v-model:show="isOpen"
    trigger="click"
    :show-arrow="false"
    placement="bottom"
  >
    <template #trigger>
      <n-tooltip trigger="hover">
        <template #trigger>
          <n-button
            id="form-dialog-portal"
            secondary
            circle
            size="small"
            class="h-5 w-5 !p-2"
            @click="isOpen = !isOpen"
          >
            <template #icon>
              <span class="i-lucide-bot-message-square h-4 w-4"></span>
            </template>
          </n-button>
        </template>
        {{ t('ai.tooltip') }}
      </n-tooltip>
    </template>

    <div
      :class="
        cn(
          'flex rounded-lg w-[80vw] max-w-[400px] card relative items-center justify-center',
          'bg-gradient-to-br from-secondary to-emerald-100/50 dark:from-secondary dark:to-emerald-800/30',
          isFocusedVal ? 'border ring ring-ring' : 'border border-primary/10',
          isLoading ? 'bg-primary/5 shadow-inner animate-pulse transition-colors duration-300' : '',
        )
      "
    >
      <span class="start-0 inset-y-0 flex items-center justify-center px-2">
        <span :class="cn('i-lucide-bot-message-square size-6 text-muted-foreground')"></span>
      </span>
      <n-input
        type="textarea"
        @focus="isFocused"
        @blur="isFocused"
        class="border-none shadow-none bg-transparent flex-1"
        :autosize="{ minRows: 1, maxRows: 4 }"
        :placeholder="t('ai.promptPlaceholder')"
        v-model:value="inputRef"
      />
      <n-button
        quaternary
        circle
        size="small"
        class="hover:bg-green-500 dark:hover:bg-green-500 hover:text-white dark:hover:text-black h-6 w-6 mr-2"
        @click="handleClick()"
        :disabled="isLoading"
      >
        <template #icon>
          <span class="i-lucide-send-horizontal h-4 w-4"></span>
        </template>
      </n-button>
    </div>
  </n-popover>
</template>
