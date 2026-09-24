<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NTooltip, NPopconfirm, NPopover } from 'naive-ui'
import { useFormBuilderI18n } from '../i18n/context'
import BuilderPreview from './BuilderPreview.vue'
import AiPrompt from '../components/ai-prompt/AiPrompt.vue'
import ThemeSwitcher from '../components/ui/theme-switcher/ThemeSwitcher.vue'
import TemplatePickerModal from '@/templates/TemplatePickerModal.vue'
import HistoryPanel from './HistoryPanel.vue'
import IssuesPanel from './IssuesPanel.vue'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useFormBuilderConfig } from '@/composables/use-config'
import { lintDefinition } from '@/dsl/lint'

const config = useFormBuilderConfig()
// 所属 FormBuilder 实例状态：undo/redo / 清空提交绑定到各自实例。
const { canRedo, canUndo, commitSchema, redo, undo, formDefinition } = useFormBuilderState()
const { t } = useFormBuilderI18n()
// E2：顶栏「历史」入口，弹出面板列出 historyEntries，点击跳转（state.jumpTo）。
const showHistory = ref(false)

// H2：顶栏「体检」入口——lintDefinition 是纯函数一次遍历，这里算一次通过 props
// 传给 IssuesPanel，避免面板每次开合都重新跑一遍（大表单场景尤其明显）。
const showIssues = ref(false)
const issues = computed(() => lintDefinition(formDefinition.value))
const issueErrorCount = computed(() => issues.value.filter((i) => i.severity === 'error').length)
const issueWarningCount = computed(
  () => issues.value.filter((i) => i.severity === 'warning').length,
)
// 右上角小圆点：有 error 时红色，仅 warning（没有 error）时琥珀色，都没有时不显示
const issueDotClass = computed(() => {
  if (issueErrorCount.value > 0) return 'bg-red-500 dark:bg-red-400'
  if (issueWarningCount.value > 0) return 'bg-amber-500 dark:bg-amber-400'
  return ''
})

const clearForm = () => {
  commitSchema([], { reason: 'clear' })
}
const showPreview = ref(false)
// B2：顶栏「模板」入口，与空画布引导卡片共用同一个弹窗组件
const showTemplates = ref(false)

// 顶栏右侧撤销 / 重做 / 历史：与画布浮动工具条同一套图标按钮样式（28px 点击区、紫色悬停）
// 图标颜色写在图标自身上：naive-ui 的按钮图标容器有自己的颜色变量，按钮上的 text-* 传不进去
const headerBtnClass =
  'group !h-[28px] !w-[28px] !p-0 !rounded-[7px] hover:!bg-[#a277ff]/12 active:!scale-95 transition-[transform,background-color] duration-150'
const headerIconClass =
  '!h-[16px] !w-[16px] text-muted-foreground group-hover:text-[#a277ff] transition-colors duration-150'

defineSlots<{
  /** 顶栏左侧区（清除 / 预览） */
  left?: () => unknown
  /** 顶栏中间区（AI 提示） */
  center?: () => unknown
  /** 顶栏右侧区（undo/redo / 主题） */
  right?: () => unknown
}>()
</script>

<template>
  <header class="sticky top-0 md:top-5 flex h-14 shrink-0 items-center rounded-2xl z-[1000] px-4">
    <div class="w-full grid grid-cols-3 items-center gap-3">
      <div class="flex items-center gap-2 justify-start">
        <slot name="left">
          <n-popconfirm @positive-click="clearForm">
            <template #trigger>
              <n-tooltip>
                <template #trigger>
                  <n-button text type="error" circle size="small" class="h-16px w-16px !p-2">
                    <template #icon>
                      <span class="i-lucide-trash-2 h-16px w-16px"></span>
                    </template>
                  </n-button>
                </template>
                {{ t('builder.clearForm') }}
              </n-tooltip>
            </template>
            {{ t('builder.clearConfirm') }}
          </n-popconfirm>

          <n-tooltip>
            <template #trigger>
              <n-button
                type="primary"
                text
                circle
                size="small"
                @click="showPreview = true"
                class="h-7 w-7 !p-2"
              >
                <template #icon><span class="i-lucide-eye h-16px w-16px"></span></template>
              </n-button>
            </template>
            {{ t('builder.previewForm') }}
          </n-tooltip>
          <BuilderPreview v-model:show="showPreview" />

          <n-tooltip>
            <template #trigger>
              <n-button
                type="primary"
                text
                circle
                size="small"
                :aria-label="t('templates.entry')"
                @click="showTemplates = true"
                class="h-7 w-7 !p-2"
              >
                <template #icon
                  ><span class="i-lucide-layout-template h-16px w-16px"></span
                ></template>
              </n-button>
            </template>
            {{ t('templates.entry') }}
          </n-tooltip>
          <TemplatePickerModal v-model:show="showTemplates" />
        </slot>
      </div>

      <div class="flex justify-center">
        <slot name="center">
          <div class="w-full max-w-[560px]">
            <AiPrompt v-if="config.apiKey" />
          </div>
        </slot>
      </div>

      <div class="flex items-center gap-2 justify-end">
        <slot name="right">
          <div
            class="inline-flex items-center gap-0.5 rounded-[10px] border border-solid border-border/70 bg-card p-[3px] shadow-sm dark:border-border/50"
          >
            <n-popover
              trigger="click"
              placement="bottom-end"
              :show="showIssues"
              style="padding: 0"
              @update:show="(v: boolean) => (showIssues = v)"
            >
              <template #trigger>
                <n-tooltip placement="bottom">
                  <template #trigger>
                    <n-button
                      quaternary
                      size="small"
                      :class="[
                        headerBtnClass,
                        showIssues ? '!bg-[#a277ff]/12 !text-[#a277ff]' : '',
                      ]"
                      :aria-label="t('issues.entry')"
                    >
                      <template #icon>
                        <span class="relative inline-flex h-[16px] w-[16px]">
                          <span
                            :class="[
                              'i-lucide-stethoscope',
                              headerIconClass,
                              showIssues ? '!text-[#a277ff]' : '',
                            ]"
                          ></span>
                          <span
                            v-if="issueDotClass"
                            :class="[
                              'absolute -top-0.5 -right-0.5 h-[7px] w-[7px] rounded-full border border-solid border-card',
                              issueDotClass,
                            ]"
                          ></span>
                        </span>
                      </template>
                    </n-button>
                  </template>
                  {{ t('issues.entry') }}
                </n-tooltip>
              </template>
              <IssuesPanel :issues="issues" />
            </n-popover>
          </div>
          <div
            class="inline-flex items-center gap-0.5 rounded-[10px] border border-solid border-border/70 bg-card p-[3px] shadow-sm dark:border-border/50"
          >
            <n-tooltip placement="bottom">
              <template #trigger>
                <n-button
                  quaternary
                  size="small"
                  :class="headerBtnClass"
                  :aria-label="t('builder.undoTooltip')"
                  :disabled="!canUndo"
                  @click="undo"
                >
                  <template #icon
                    ><span :class="['i-lucide-undo-2', headerIconClass]"></span
                  ></template>
                </n-button>
              </template>
              {{ t('builder.undoTooltip') }}
            </n-tooltip>
            <n-tooltip placement="bottom">
              <template #trigger>
                <n-button
                  quaternary
                  size="small"
                  :class="headerBtnClass"
                  :aria-label="t('builder.redoTooltip')"
                  :disabled="!canRedo"
                  @click="redo"
                >
                  <template #icon
                    ><span :class="['i-lucide-redo-2', headerIconClass]"></span
                  ></template>
                </n-button>
              </template>
              {{ t('builder.redoTooltip') }}
            </n-tooltip>
            <span aria-hidden="true" class="mx-0.5 h-4 w-px bg-border"></span>
            <n-popover
              trigger="click"
              placement="bottom-end"
              :show="showHistory"
              style="padding: 0"
              @update:show="(v: boolean) => (showHistory = v)"
            >
              <template #trigger>
                <n-tooltip placement="bottom">
                  <template #trigger>
                    <n-button
                      quaternary
                      size="small"
                      :class="[
                        headerBtnClass,
                        showHistory ? '!bg-[#a277ff]/12 !text-[#a277ff]' : '',
                      ]"
                      :aria-label="t('history.entry')"
                    >
                      <template #icon
                        ><span
                          :class="[
                            'i-lucide-history',
                            headerIconClass,
                            showHistory ? '!text-[#a277ff]' : '',
                          ]"
                        ></span
                      ></template>
                    </n-button>
                  </template>
                  {{ t('history.entry') }}
                </n-tooltip>
              </template>
              <HistoryPanel :show="showHistory" />
            </n-popover>
          </div>
          <ThemeSwitcher />
        </slot>
      </div>
    </div>
  </header>
</template>
