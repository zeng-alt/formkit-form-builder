<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { UploadCustomRequestOptions, UploadFileInfo } from 'naive-ui'
import { NUpload } from 'naive-ui'
import { computed, ref, watch } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useBindEvents } from '@/composables/use-bind-events'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// size 只用于拖拽区字号 class，不作为 NUpload 属性传入
const { config, props, bind } = useSchemaAttrs(context, { omit: ['size'] })
const { runEvent } = useBindEvents(context, bind)

const size = computed(() => (config.size as string | undefined) ?? 'medium')
const multiple = computed(() => {
  const raw = config.multiple as unknown
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'string') return raw === 'true'
  return false
})

function normalizeValue(raw: unknown): UploadFileInfo[] {
  if (!raw) return []
  const list = Array.isArray(raw) ? raw : [raw]
  return list
    .map((item, index) => {
      if (item instanceof File) {
        return {
          id: `${index}-${item.name}-${item.size}`,
          name: item.name,
          status: 'finished',
          file: item,
        } as UploadFileInfo
      }
      if (item && typeof item === 'object') {
        const maybeFile = (item as Record<string, unknown>).file
        if (maybeFile instanceof File) {
          return {
            id: `${index}-${maybeFile.name}-${maybeFile.size}`,
            name: maybeFile.name,
            status: 'finished',
            file: maybeFile,
          } as UploadFileInfo
        }
      }
      return null
    })
    .filter((v): v is UploadFileInfo => v !== null)
}

const fileList = ref<UploadFileInfo[]>([])

watch(
  () => context._value as unknown,
  (raw) => {
    fileList.value = normalizeValue(raw)
  },
  { immediate: true, deep: true },
)

async function handleUpdateFileList(next: UploadFileInfo[]) {
  fileList.value = next
  const files = next.map((f) => f.file).filter((f): f is File => f instanceof File)
  context.node.input(multiple.value ? files : files[0] ? [files[0]] : [])
  await runEvent('onInput', next)
  await runEvent('onChange', next)
}

function customRequest(options: UploadCustomRequestOptions) {
  options.onFinish()
}
</script>

<template>
  <NUpload
    v-bind="props"
    v-model:file-list="fileList"
    :custom-request="customRequest"
    :show-download-button="false"
    :show-preview-button="false"
    :class="size === 'small' ? 'text-xs' : ''"
    @update:file-list="handleUpdateFileList"
  >
    <n-upload-dragger>
      <div class="flex justify-center mb-3">
        <span class="i-lucide-upload text-muted-foreground"></span>
      </div>
      <n-text style="font-size: 16px"> 点击或者拖动文件到该区域来上传 </n-text>
      <n-p depth="3" style="margin: 8px 0 0 0">
        请不要上传敏感数据，比如你的银行卡号和密码，信用卡号有效期和安全码
      </n-p>
    </n-upload-dragger>
  </NUpload>
</template>
