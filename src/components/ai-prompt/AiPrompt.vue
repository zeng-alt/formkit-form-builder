<script setup lang="ts">
import instructions from './Instructions.txt?raw'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { cn } from '../../utils/utils'
import { NButton, NInput, NPopover, NTooltip, useNotification } from 'naive-ui'
import { useFormBuilderConfig } from '../../composables/use-config'
import { useFormBuilderI18n } from '../../i18n/context'
import { useMediaQuery } from '@vueuse/core'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useAiPromptFocusRegistry } from '@/builder/composables/use-ai-prompt-focus'

// 所属 FormBuilder 实例状态：AI 生成写回各自实例的 schema / 加载态。
const { isLoading, commitSchema } = useFormBuilderState()

// H4：顶部工具栏在窄宽度下会挤压这个输入框（1024×768 时只剩 "AI" 两个字可见，
// 1280×800 正常）。这里复用原本只给手机布局用的"收起为图标按钮，点击展开气泡"
// 方案，把断点从 768px 提到 1100px——工具栏是三栏等分布局，中间栏在 1024px
// 视口宽度下实际可用空间不够放下完整输入框，但仍比手机宽，继续叫 isMobile
// 不准确，改名 isCompact。
const isCompact = useMediaQuery('(max-width: 1100px)')

const config = useFormBuilderConfig()
const { t } = useFormBuilderI18n()
const notification = useNotification()
const promptText = ref('')
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
  if (promptText.value === '') {
    // 空输入：提醒用户先填提示词，不是错误，用 warning
    notification.warning({
      title: t('ai.emptyPrompt'),
      content: t('ai.emptyPromptDescription'),
      duration: 4500,
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
          { role: 'user', content: promptText.value },
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
    promptText.value = ''
  } catch (err: any) {
    console.error('AI generate schema failed:', err)
    // 请求/解析失败：真正的错误，用 error；不设 duration（不自动关闭），
    // 因为 content 里可能带接口返回的详细错误信息，需要用户看完自行关闭
    notification.error({
      title: t('ai.requestFailed'),
      content: err?.message || String(err),
    })
  } finally {
    isLoading.value = false
  }
}

const isFocused = () => {
  isFocusedVal.value = !isFocusedVal.value
}

// B3：空画布引导「用 AI 生成」入口点击后聚焦到这里——非紧凑布局直接聚焦输入框；
// 紧凑布局（气泡收起态）先展开气泡，等它渲染出来再聚焦里面的输入框。
type FocusableInput = { focus: () => void }
const inputRef = ref<FocusableInput | null>(null)
const compactInputRef = ref<FocusableInput | null>(null)

function focus() {
  if (isCompact.value) {
    isOpen.value = true
    nextTick(() => compactInputRef.value?.focus())
    return
  }
  inputRef.value?.focus()
}

const focusRegistry = useAiPromptFocusRegistry()
onMounted(() => {
  if (focusRegistry) focusRegistry.value = focus
})
onBeforeUnmount(() => {
  if (focusRegistry && focusRegistry.value === focus) focusRegistry.value = null
})

defineExpose({ focus })
</script>

<template>
  <div
    v-if="!isCompact"
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
      ref="inputRef"
      type="textarea"
      @focus="isFocused"
      @blur="isFocused"
      status="warning"
      class="border-none shadow-none bg-transparent flex-1"
      :autosize="{ minRows: 1, maxRows: 4 }"
      :placeholder="t('ai.placeholder')"
      v-model:value="promptText"
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
    v-if="isCompact"
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
        ref="compactInputRef"
        type="textarea"
        @focus="isFocused"
        @blur="isFocused"
        class="border-none shadow-none bg-transparent flex-1"
        :autosize="{ minRows: 1, maxRows: 4 }"
        :placeholder="t('ai.promptPlaceholder')"
        v-model:value="promptText"
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
