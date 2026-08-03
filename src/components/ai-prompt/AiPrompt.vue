<script setup lang="ts">
import OpenAI from 'openai'
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
  const client = new OpenAI({
    apiKey: config.apiKey,
    dangerouslyAllowBrowser: true,
  })

  const defaultInstructions = t('ai.defaultInstructions')

  const response = await client.responses.create({
    model: 'gpt-4.1-mini',
    instructions: instructions || defaultInstructions,
    input: inputRef.value,
  })

  commitSchema(parseFormSchema(response.output_text) as FormKitSchemaFormKit[], { reason: 'ai' })
  isLoading.value = false
  inputRef.value = ''
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
