<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NImage } from 'naive-ui'
import { computed } from 'vue'
import { getSchemaProps } from './schema-props'

const props = defineProps<{
  context: FormKitFrameworkContext
}>()

const uiProps = computed<Record<string, unknown>>(() => getSchemaProps(props.context))

const src = computed(() => uiProps.value.src as string | undefined)
const alt = computed(() => uiProps.value.alt as string | undefined)

const width = computed(() => uiProps.value.width as any)
const height = computed(() => uiProps.value.height as any)
const objectFit = computed(() => uiProps.value.objectFit as any)
const previewDisabled = computed<boolean>(() =>
  Boolean((uiProps.value.previewDisabled as boolean | undefined) ?? false),
)
const lazy = computed<boolean>(() => Boolean((uiProps.value.lazy as boolean | undefined) ?? false))
</script>

<template>
  <div class="w-full py-2">
    <NImage
      :src="src"
      :alt="alt"
      :width="width"
      :height="height"
      :object-fit="objectFit"
      :preview-disabled="previewDisabled"
      :lazy="lazy"
    />
  </div>
</template>
