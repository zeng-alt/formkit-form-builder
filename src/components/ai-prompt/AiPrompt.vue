<script setup lang="ts">
import { BotMessageSquare, SendHorizonal } from 'lucide-vue-next'
import OpenAI from 'openai'
import instructions from './Instructions.txt?raw'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { formSchema } from '../../utils/default-form-elements'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { isLoading } from '../../composables/form-fields'
import { cn } from '../../utils/utils'
import { NButton, NInput, NPopover, NTooltip } from 'naive-ui'
import { useFormBuilderConfig } from '../../composables/use-config'
import { useMediaQuery } from '@vueuse/core'

const isMobile = useMediaQuery('(max-width: 768px)')

const config = useFormBuilderConfig()
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
    toast('Empty chat prompt!', {
      description: 'Please enter a prompt to generate a form.',
      action: {
        label: 'Close',
      },
    })
    return
  }

  isLoading.value = true
  const client = new OpenAI({
    apiKey: config.apiKey,
    dangerouslyAllowBrowser: true,
  })

  const defaultInstructions = "Generate a FormKit schema based on the user's description"

  const response = await client.responses.create({
    model: 'gpt-4.1-mini',
    instructions: instructions || defaultInstructions,
    input: inputRef.value,
  })

  formSchema.value = parseFormSchema(response.output_text) as FormKitSchemaFormKit[]
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
        'flex rounded-lg max-md:w-[80%] !w-[50%] card relative items-center justify-center',
        'bg-gradient-to-br from-secondary to-emerald-100/80 dark:from-secondary dark:to-emerald-800/80 dark:border-ring/5',
        isFocusedVal
          ? 'ring-2 ring-ring transition-all duration-300'
          : 'border border-ring/20 dark:border-ring/10 transition-all duration-300',
        isLoading ? 'bg-primary/5 shadow-inner animate-pulse transition-colors duration-300' : '',
      )
    "
  >
    <span class="start-0 inset-y-0 flex items-center justify-center px-2">
      <BotMessageSquare :class="cn('size-6 text-muted-foreground')" />
    </span>
    <n-input
      type="textarea"
      @focus="isFocused"
      @blur="isFocused"
      class="border-none shadow-none bg-transparent"
      :autosize="{ minRows: 1, maxRows: 4 }"
      placeholder="AI Assistant"
      v-model:value="inputRef"
    />
    <n-button
      quaternary
      class="hover:bg-green-500 dark:hover:bg-green-500/30 hover:text-white w-7 h-7 mr-2"
      @click="handleClick()"
      :disabled="isLoading"
    >
      <template #icon>
        <SendHorizonal />
      </template>
    </n-button>
  </div>

  <n-popover v-model:show="isOpen" trigger="click" :show-arrow="false" placement="bottom">
    <template #trigger>
      <n-tooltip v-if="isMobile" trigger="hover">
        <template #trigger>
          <n-button
            id="form-dialog-portal"
            secondary
            circle
            class="h-6 w-6 !p-3"
            @click="isOpen = !isOpen"
          >
            <template #icon>
              <BotMessageSquare />
            </template>
          </n-button>
        </template>
        AI Assistant
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
        <BotMessageSquare :class="cn('size-6 text-muted-foreground')" />
      </span>
      <n-input
        type="textarea"
        @focus="isFocused"
        @blur="isFocused"
        class="border-none shadow-none bg-transparent"
        :autosize="{ minRows: 1, maxRows: 4 }"
        placeholder="Prompt AI"
        v-model:value="inputRef"
      />
      <n-button
        quaternary
        class="hover:bg-green-500 dark:hover:bg-green-500 hover:text-white dark:hover:text-black w-7 h-7 mr-2"
        @click="handleClick()"
        :disabled="isLoading"
      >
        <template #icon>
          <SendHorizonal />
        </template>
      </n-button>
    </div>
  </n-popover>
</template>
