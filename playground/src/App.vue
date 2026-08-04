<script lang="ts">
/**
 * ① 自定义元素：一个「手机号」输入框（基于 naive NInput）
 *    组件采用 FormKit framework context 契约（receives `context` prop），
 *    label / 校验 / help 由 FormKit 外包层渲染，这里只实现控件本身。
 *    registerElement 一次打通：
 *      - DSL 注册表（画布可新建 / toSchema / fromSchema / match）
 *      - FormKit input（buildFormkitInputs 合并，画布/预览/FormRenderer 通用）
 *      - 物料面板图标 / 文案 / 默认校验
 *    ⚠ 注册必须放在本模块顶层（<script setup> 要到组件挂载才执行，晚于
 *      main.ts 的 formkitConfig()，FormKit inputs 将缺失该类型）。
 *      若改用 FormBuilderPlugin，也可直接在 config.elements 里传（插件
 *      install 时先注册再装配）。
 */
import { defineComponent, h } from 'vue'
import { NInput } from 'naive-ui'
import { registerElement } from '@zeng-alt/formkit-form-builder'
import type { RegisterElementInput } from '@zeng-alt/formkit-form-builder'

const PhoneInput = defineComponent({
  name: 'PhoneInput',
  props: {
    context: { type: Object, required: true },
  },
  setup(props) {
    const ctx = () => props.context as any
    return () =>
      h(NInput, {
        value: (ctx()._value ?? '') as string,
        maxlength: 11,
        placeholder: '请输入手机号',
        'onUpdate:value': (next: string) => ctx().node.input(next),
      })
  },
})

const phoneElement: RegisterElementInput = {
  type: 'phone',
  category: 'field',
  icon: 'i-lucide-phone',
  tooltipKey: 'elements.phone.name',
  component: PhoneInput,
  schema: {
    renderAs: 'formkit',
    nameKey: 'elements.phone.name',
    labelKey: 'elements.phone.label',
    descriptionKey: 'elements.phone.description',
    validation: 'length:11',
  },
}

registerElement(phoneElement)
</script>

<script setup lang="ts">
/**
 * 主演示页：完整演示 @zeng-alt/formkit-form-builder 的用法
 *  1. FormBuilderConfig 完整字段（apiKey / locale / messages / elements）
 *  2. 自定义字段 phone（① 已在顶部 <script> 模块顶层注册）
 *  3. FormBuilder 组件：v-model 双向绑定 DSL + config + 主题 + 全部具名插槽
 *  4. BuilderProvider 注入全局配置
 *  5. FormRenderer 渲染 DSL：dataStructure / actions / submit
 *  6. 表单定义持久化（localStorage 存取）与 DSL 结构示例
 */
import { computed, ref, watch } from 'vue'
import { NButton, NSpace, NTag } from 'naive-ui'
import {
  BuilderPreview,
  BuilderProvider,
  FormBuilder,
  FormRenderer,
  CanvasActionsBar,
} from '@zeng-alt/formkit-form-builder'
import type { FormBuilderConfig, FormDefinition } from '@zeng-alt/formkit-form-builder'

// ════════════════════════════════════════════════════════════════════════════
// ② 完整 FormBuilderConfig：附带自定义元素的 i18n 文案（zh / en）
//    以及动态字典两个方法（fetchDictionary / fetchDictionaryPage）
// ════════════════════════════════════════════════════════════════════════════

// 模拟字典数据：字典定义（code/label，用于分页搜索）+ 每本字典的选项（filtered by code，用于渲染）
const mockDictionaries = [
  {
    code: 'city',
    label: '城市',
    options: [
      { label: '北京', value: 'beijing' },
      { label: '上海', value: 'shanghai' },
      { label: '广州', value: 'guangzhou' },
      { label: '深圳', value: 'shenzhen' },
    ],
  },
  {
    code: 'gender',
    label: '性别',
    options: [
      { label: '男', value: 'male' },
      { label: '女', value: 'female' },
    ],
  },
  {
    code: 'education',
    label: '学历',
    options: [
      { label: '高中', value: 'high' },
      { label: '本科', value: 'bachelor' },
      { label: '硕士', value: 'master' },
      { label: '博士', value: 'doctor' },
    ],
  },
]

const formBuilderConfig = computed<FormBuilderConfig>(() => ({
  apiKey: 'your-openai-api-key', // 可选：AI 生成 Schema 面板需要
  locale: 'zh-CN', // 默认 zh-CN；可选 'en' 'de'
  localeFallback: 'zh-CN',
  availableLocales: ['zh-CN', 'en', 'de'],
  // 多语言覆写：结构 = messages[locale] 与内置结构同形，按 key 递归深合并——
  // 只覆写传入的键，未覆写的沿用内置文案（对齐 camunda7-ui 的国际化语义）。
  messages: {
    'zh-CN': {
      builder: { clearForm: '清空当前表单' }, // 仅覆写这一个 key，其他 builder.* 保留
      elements: {
        phone: {
          name: '手机号',
          label: '手机号',
          description: '自定义手机号输入框（registerElement 扩展）',
        },
      },
    },
    en: {
      elements: {
        phone: {
          name: 'Phone',
          label: 'Phone',
          description: 'A custom phone input registered via registerElement',
        },
      },
    },
    de: {
      builder: { clearForm: 'Formular leeren' },
      elements: {
        phone: {
          name: 'Telefonnummer',
          label: 'Telefonnummer',
          description: 'Ein benutzerdefiniertes Telefonnummer-Eingabefeld (registerElement Erweiterung)',
        },
      },
    },
  },
  // 若改用 FormBuilderPlugin，把 phoneElement 放这里即可（install 会先注册再装配）
  // elements: [phoneElement],

  // ─── 动态字典（单选/多选/下拉的 options 通过 code 动态拉取）───────────────
  // ① fetchDictionary：按 code 取 [{label, value}...]，渲染动态字段时使用
  fetchDictionary: async (code) => {
    await new Promise((r) => setTimeout(r, 200))
    const hit = mockDictionaries.find((d) => d.code === code)
    return hit ? hit.options : []
  },
  // ② fetchDictionaryPage：编辑面板弹窗分页搜索字典定义（行结构 { code, label }）
  fetchDictionaryPage: async ({ code, label, pageNum, pageSize }) => {
    await new Promise((r) => setTimeout(r, 300))
    let list = mockDictionaries
    if (code) list = list.filter((d) => d.code.toLowerCase().includes(code.toLowerCase()))
    if (label) list = list.filter((d) => d.label.includes(label))
    const total = list.length
    const start = (pageNum - 1) * pageSize
    return {
      pageNum,
      pageSize,
      total,
      data: list.slice(start, start + pageSize).map((d) => ({ code: d.code, label: d.label })),
    }
  },
}))

// ════════════════════════════════════════════════════════════════════════════
// ③ 示例 DSL（version 化 FormDefinition）：演示字段 / 校验 / 选项 / 布局 / 静态节点
// ════════════════════════════════════════════════════════════════════════════
const sampleDefinition: FormDefinition = {
  version: 2,
  id: 'demo-form',
  name: '员工信息登记',
  description: '演示 DSL：覆盖字段类型 / 校验 / 选项 / 栅格布局 / 静态展示',
  settings: { layout: 'vertical', columns: 12, labelWidth: 80 },
  root: {
    id: 'root',
    type: 'group',
    category: 'container',
    renderAs: 'cmp',
    name: 'employee',
    children: [
      {
        id: 'f-name',
        type: 'text',
        category: 'field',
        renderAs: 'cmp',
        name: 'name',
        label: '姓名',
        layout: { colspan: 12 },
        validation: [{ rule: 'required', message: '姓名为必填项' }],
      },
      {
        id: 'f-phone',
        type: 'phone', // ①自定义元素
        category: 'field',
        renderAs: 'formkit',
        name: 'phone',
        label: '手机号',
        layout: { colspan: 12 },
        validation: [{ rule: 'length:11', message: '手机号需为 11 位' }],
      },
      {
        id: 'f-city',
        type: 'select',
        category: 'field',
        renderAs: 'cmp',
        name: 'city',
        label: '城市',
        layout: { colspan: 6 },
        options: [
          { label: '北京', value: 'beijing' },
          { label: '上海', value: 'shanghai' },
          { label: '广州', value: 'guangzhou' },
        ],
      },
      {
        id: 'f-age',
        type: 'number',
        category: 'field',
        renderAs: 'cmp',
        name: 'age',
        label: '年龄',
        layout: { colspan: 6 },
        validation: [
          { rule: 'min:18', message: '需年满 18 岁' },
          { rule: 'max:60', message: '不超过 60 岁' },
        ],
      },
      {
        id: 'f-gender',
        type: 'radio',
        category: 'field',
        renderAs: 'cmp',
        name: 'gender',
        label: '性别',
        layout: { colspan: 6 },
        options: [
          { label: '男', value: 'male' },
          { label: '女', value: 'female' },
        ],
      },
      {
        id: 'f-dict-city',
        type: 'select',
        category: 'field',
        renderAs: 'cmp',
        name: 'dictCity',
        label: '城市（动态字典）',
        layout: { colspan: 6 },
        options: { dynamic: true, code: 'city', label: '城市' },
      },
      {
        id: 'f-onboard',
        type: 'naiveSwitch',
        category: 'field',
        renderAs: 'cmp',
        name: 'onboarded',
        label: '已入职',
        layout: { colspan: 6 },
      },
    ],
  },
}

// ─── 状态：定义 / 渲染数据 / 预览 ─────────────────────────────────────────────
const STORAGE_KEY = 'formkit-form-builder:demo'
const definition = ref<FormDefinition | undefined>(undefined)
const renderData = ref<Record<string, unknown>>({})
const previewShow = ref(false)
const dataStructure = ref<'flat' | 'nested'>('flat')

// 初始化：优先读 localStorage，否则用示例 DSL
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as FormDefinition) : undefined
    definition.value = parsed ?? sampleDefinition
  } catch {
    definition.value = sampleDefinition
  }
}
load()

// 编辑即时落库（配合 FormBuilder 的 v-model 实时输出）
watch(
  definition,
  (def) => {
    if (def) localStorage.setItem(STORAGE_KEY, JSON.stringify(def))
  },
  { deep: false },
)

function resetToSample() {
  definition.value = sampleDefinition
}
function clearStorage() {
  localStorage.removeItem(STORAGE_KEY)
  definition.value = sampleDefinition
}
function onFormSubmit(value: Record<string, unknown>, id: string | undefined, version: number | undefined) {
  console.log(id);
  console.log(version);
  alert('提交数据：' + JSON.stringify(value))
}
// function onSave() {
//   alert('表单已实时保存到 localStorage')
// }

const definitionJson = computed(() => JSON.stringify(definition.value ?? {}, null, 2))

// 自定义元素注册状态标识（registerElement 在模块顶层执行，恒为 true，仅作展示）
const phoneRegistered = true
</script>

<template>
  <div class="h-screen w-full flex flex-col">
    <!-- 顶部工具条：说明 + 主题/结构切换 -->
    <div
      class="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-2 bg-card"
    >
      <div class="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span class="font-semibold text-foreground">FormBuilder 详细用法演示</span>
        <NTag size="small" :bordered="false" type="info">v-model DSL</NTag>
        <NTag v-if="phoneRegistered" size="small" :bordered="false" type="success"
          >自定义元素 phone 已注册</NTag
        >
      </div>
      <NSpace :size="4">
        <NButton size="small" :bordered="false" @click="resetToSample">重置示例</NButton>
        <NButton size="small" :bordered="false" @click="clearStorage">清空并重置</NButton>
      </NSpace>
    </div>

    <!-- 主体：设计器 + 渲染结果并排。
         FormRenderer 与 FormBuilder 一起放在 BuilderProvider 内：
         共享 config（locale / elements / messages），作为姊妹节点各自渲染；
         class 通过属性透传落到 provider 根节点上作为栅格容器。 -->
    <BuilderProvider
      :config="formBuilderConfig"
    >
      <!-- 设计器 -->
      <div class="min-h-0 overflow-hidden">
        <FormBuilder v-model="definition">
          <!-- ① 顶栏整体替换（包含默认内容） -->
          <!-- <template #header>…</template> -->

          <!-- 顶栏左侧：自定义按钮（替换「清除」默认区） -->
          <!-- <template #header-left>
            <NButton size="small" secondary @click="clearStorage">重置</NButton>
          </template> -->

          <!-- 顶栏中间：自定义 AI / 标题区 -->
          <!-- <template #header-center>
            <span class="text-[11px] text-muted-foreground">自定义 AI 提示区</span>
          </template> -->

          <!-- 顶栏右侧：自定义 undo/redo 区，放一个「保存」 -->
          <!-- <template #header-right>
            <NButton size="small" type="primary" @click="onSave">保存</NButton>
          </template> -->

          <!-- 画布空状态换肤 -->
          <!-- <template #empty>
            <div class="p-8 text-center text-[11px] text-muted-foreground">
              自定义空状态：拖拽左侧物料到画布
            </div>
          </template> -->

          <!-- 右侧操作列（导入导出/语言）+ 弹窗预览。
                CanvasActionsBar 为画布右侧默认按钮组（导入导出/切换语言），
                这里复用它在默认按钮之外追加预览弹窗；
                BuilderPreview 放在 FormBuilder 的插槽内，处于实例状态 provide 作用域，
                才能预览到当前实例的表单（放组件外会回落到空的默认实例）。 -->
          <template #toolbar>
            <CanvasActionsBar />
            <BuilderPreview
              v-model:show="previewShow"
              :actions="true"
              :show-data-panel="true"
              @submit="onFormSubmit"
            >
            </BuilderPreview>
          </template>
        </FormBuilder>
      </div>

      <!-- 渲染结果 / 数据 -->
      <div class="min-h-0 border-l border-border/50 p-4 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-medium text-foreground/80">
            渲染结果（FormRenderer，读取 config.locale）
          </span>
          <NTag
            size="small"
            :bordered="false"
            class="cursor-pointer select-none"
            @click="dataStructure = dataStructure === 'flat' ? 'nested' : 'flat'"
          >
            dataStructure: {{ dataStructure }}
          </NTag>
        </div>

        <FormRenderer
          v-if="definition"
          :definition="definition"
          v-model="renderData"
          :actions="true"
          :data-structure="dataStructure"
          actions-justify="end"
          @submit="onFormSubmit"
        />

        <div class="mt-2 p-3 bg-muted/40 rounded-lg border border-border/50">
          <h4 class="text-[11px] font-medium mb-2 text-foreground/80">提交数据</h4>
          <pre class="text-[11px] text-muted-foreground">{{
            JSON.stringify(renderData, null, 2)
          }}</pre>
        </div>

        <details class="mt-2 border border-border/50 rounded-lg">
          <summary class="px-3 py-2 text-[11px] cursor-pointer text-muted-foreground select-none">
            当前 FormDefinition（DSL）⇩
          </summary>
          <pre class="p-3 text-[11px] text-muted-foreground max-h-64 overflow-auto">{{
            definitionJson
          }}</pre>
        </details>
      </div>
    </BuilderProvider>
  </div>
</template>
