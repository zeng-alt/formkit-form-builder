<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { NButton, NDataTable, NEmpty, NInput, NModal, NPagination } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { useDictionary } from '@/composables/use-dictionary'
import { useFormBuilderI18n } from '@/i18n/context'
import type { DictionaryDefinition } from '@/types/env'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  select: [row: DictionaryDefinition]
}>()

const { fetchDictionaryPage } = useDictionary()
const { t } = useFormBuilderI18n()

// 未配置分页查询方法时，提示用户通过 BuilderProvider config 传入
const hasProvider = computed(() => typeof fetchDictionaryPage === 'function')

const code = ref('')
const label = ref('')
const rows = ref<DictionaryDefinition[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const loading = ref(false)

const columns: DataTableColumns<DictionaryDefinition> = [
  { title: () => t('edits.optionsSource.dictCode'), key: 'code', minWidth: 140 },
  { title: () => t('edits.optionsSource.dictLabel'), key: 'label', minWidth: 200 },
  {
    title: () => t('edits.optionsSource.dictAction'),
    key: 'actions',
    width: 72,
    render: (row) =>
      h(
        NButton,
        { size: 'tiny', type: 'primary', secondary: true, onClick: () => onSelect(row) },
        { default: () => t('edits.optionsSource.dictChoose') },
      ),
  },
]

async function search() {
  if (!fetchDictionaryPage) return
  loading.value = true
  try {
    const res = await fetchDictionaryPage({
      code: code.value.trim() || undefined,
      label: label.value.trim() || undefined,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    rows.value = res?.data ?? []
    total.value = res?.total ?? 0
  } catch {
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function onPageChange(next: number) {
  pageNum.value = next
  search()
}

function onPageSizeChange(next: number) {
  pageSize.value = next
  pageNum.value = 1
  search()
}

function onSelect(row: DictionaryDefinition) {
  emit('select', row)
  emit('update:show', false)
}

watch(
  () => props.show,
  (open) => {
    if (open) {
      pageNum.value = 1
      search()
    }
  },
)
</script>

<template>
  <NModal
    :show="props.show"
    preset="card"
    :title="t('edits.optionsSource.dictPickerTitle')"
    class="!w-[560px]"
    @update:show="(v) => emit('update:show', Boolean(v))"
  >
    <div class="flex flex-col gap-3">
      <div class="flex flex-row gap-2 items-center">
        <NInput
          size="small"
          :placeholder="t('edits.optionsSource.dictCodePlaceholder')"
          :value="code"
          @update:value="(v) => (code = v)"
        />
        <NInput
          size="small"
          :placeholder="t('edits.optionsSource.dictLabelPlaceholder')"
          :value="label"
          @update:value="(v) => (label = v)"
        />
        <NButton size="small" type="primary" :loading="loading" @click="search">
          {{ t('edits.optionsSource.dictSearch') }}
        </NButton>
      </div>

      <NDataTable size="small" :loading="loading" :columns="columns" :data="rows" :max-height="320">
        <template #empty>
          <NEmpty
            :description="
              hasProvider
                ? t('edits.optionsSource.dictEmpty')
                : t('edits.optionsSource.dictProviderMissing')
            "
          />
        </template>
      </NDataTable>

      <div class="flex justify-end">
        <NPagination
          v-model:page="pageNum"
          :page-size="pageSize"
          :item-count="total"
          :on-update:page="onPageChange"
          :on-update:page-size="onPageSizeChange"
          :show-size-picker="true"
          :page-sizes="[10, 20, 50]"
          size="small"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <NButton size="small" @click="emit('update:show', false)">
          {{ t('edits.optionsSource.dictCancel') }}
        </NButton>
      </div>
    </template>
  </NModal>
</template>
