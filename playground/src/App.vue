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
import {  NTag } from 'naive-ui'
import {
  BuilderProvider,
  FormBuilder,
  FormRenderer,
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

// 模拟树型字典数据：树型字典定义 + 树型选项（label/key/children）
const mockTreeDictionaries = [
  {
    value: 'orgTree',
    label: '组织架构树',
    options: [
      {
        label: '总公司',
        value: 'hq',
        children: [
          { label: '研发部', value: 'rd', children: [{ label: '前端组', value: 'fe' }, { label: '后端组', value: 'be' }] },
          { label: '市场部', value: 'marketing' },
        ],
      },
      {
        label: '分公司',
        value: 'branch',
        children: [
          { label: '华东区', value: 'east' },
          { label: '华南区', value: 'south' },
        ],
      },
    ],
  },
  {
    value: 'regionTree',
    label: '地区树',
    options: [
      {
        label: '中国',
        value: 'cn',
        children: [
          { label: '北京', value: 'bj' },
          { label: '上海', value: 'sh' },
          { label: '广东', value: 'gd', children: [{ label: '广州', value: 'gz' }, { label: '深圳', value: 'sz' }] },
        ],
      },
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

  // ─── 树型动态字典（树选择/级联选择的 options 通过 code 动态拉取）───────────────
  // ③ fetchTreeDictionary：按 code 取树型字典项 [{label, key, children?}]，渲染树选择/级联选择时使用
  fetchTreeDictionary: async (value) => {
    await new Promise((r) => setTimeout(r, 200))
    const hit = mockTreeDictionaries.find((d) => d.value === value)
    return hit ? hit.options : []
  },
  // ④ fetchTreeDictionaryPage：编辑面板弹窗分页搜索树型字典定义（行结构 { code, label }）
  fetchTreeDictionaryPage: async ({ value, label, pageNum, pageSize }) => {
    await new Promise((r) => setTimeout(r, 300))
    let list = mockTreeDictionaries
    if (value) list = list.filter((d) => d.value.toLowerCase().includes(value.toLowerCase()))
    if (label) list = list.filter((d) => d.label.includes(label))
    const total = list.length
    const start = (pageNum - 1) * pageSize
    return {
      pageNum,
      pageSize,
      total,
      data: list.slice(start, start + pageSize).map((d) => ({ value: d.value, label: d.label })),
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
      {
        id: 'f-test1',
        type: 'text',
        category: 'field',
        renderAs: 'cmp',
        name: 'test1',
        label: '测试输入',
        layout: { colspan: 12 },
      },
      {
        id: 'f-test',
        type: 'text',
        category: 'field',
        renderAs: 'cmp',
        name: 'test',
        label: '表达式结果',
        layout: { colspan: 12 },
        expr: "$test1 + '测试'",
      },
    ],
  },
}

// ─── 状态：定义 / 渲染数据 / 预览 ─────────────────────────────────────────────
const STORAGE_KEY = 'formkit-form-builder:demo'
const definition = ref<FormDefinition | undefined>(undefined)
const renderData = ref<Record<string, unknown>>({})
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
function onFormSubmit(value: Record<string, unknown>, id: string | undefined, version: number | undefined) {
  console.log(id);
  console.log(version);
  alert('提交数据：' + JSON.stringify(value))
}
// function onSave() {
//   alert('表单已实时保存到 localStorage')
// }

const definitionJson = computed(() => JSON.stringify(definition.value ?? {}, null, 2))
</script>

<template>
  <div class="h-screen w-full flex flex-col">
    <!-- 顶部工具条：说明 + 主题/结构切换 -->

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
