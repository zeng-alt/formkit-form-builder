<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { UploadCustomRequestOptions, UploadFileInfo } from 'naive-ui'
import { NUpload } from 'naive-ui'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  context: FormKitFrameworkContext
}>()

const naiveProps = computed<Record<string, unknown>>(() => {
  const ctx = props.context as unknown as { naiveProps?: Record<string, unknown> }
  const nodeProps = props.context.node.props as Record<string, unknown>
  return (ctx.naiveProps ?? (nodeProps.naiveProps as Record<string, unknown> | undefined) ?? {}) as Record<
    string,
    unknown
  >
})

const size = computed(() => (naiveProps.value.size as string | undefined) ?? 'medium')
const disabled = computed<boolean>(() =>
  Boolean((naiveProps.value.disabled as boolean | undefined) ?? props.context.disabled ?? false),
)

const accept = computed(() => props.context.accept as string | undefined)
const multiple = computed(() => {
  const raw = props.context.multiple as unknown
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
  () => props.context._value as unknown,
  (raw) => {
    fileList.value = normalizeValue(raw)
  },
  { immediate: true, deep: true },
)

function handleUpdateFileList(next: UploadFileInfo[]) {
  fileList.value = next
  const files = next
    .map((f) => f.file)
    .filter((f): f is File => f instanceof File)
  props.context.node.input(multiple.value ? files : files[0] ? [files[0]] : [])
}

function customRequest(options: UploadCustomRequestOptions) {
  options.onFinish()
}
</script>

<template>
  <NUpload
    v-model:file-list="fileList"
    :disabled="disabled"
    :accept="accept"
    :multiple="multiple"
    :custom-request="customRequest"
    :show-download-button="false"
    :show-preview-button="false"
    :file-list-style="{ width: '100%' }"
    :list-type="'text'"
    :abstract="false"
    :class="size === 'small' ? 'text-xs' : ''"
    @update:file-list="handleUpdateFileList"
  />
</template>
