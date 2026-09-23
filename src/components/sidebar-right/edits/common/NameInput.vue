<script setup lang="ts">
import { computed } from 'vue'
import { getElementTypeDef, EXPR_HELPER_PREFIX } from '@/dsl'
import { useFormField } from '@/composables/form-fields'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useFormBuilderI18n } from '@/i18n/context'
import { dslChildrenOf, findDslNodeByKey } from '@/utils/schema/dsl-tree'
import { schemaChildren, type SchemaNode } from '@/utils/schema/types'
import TextInput from './TextInput.vue'

// 所属 FormBuilder 实例状态：name 唯一性校验 / 选中定位绑定到各自实例。
const { formDefinition, formSchema, selectedIndex, selectedKey } = useFormBuilderState()
const { currentFieldType, fieldName, label, hasField } = useFormField()
const { t } = useFormBuilderI18n()

// 类型 → 分类（直接查注册表，覆盖无 template 的 group / grid / tabsPane 等）
const category = computed(() => {
  if (!currentFieldType.value) return null
  return getElementTypeDef(currentFieldType.value)?.category ?? null
})

// tabsPane/stepsPane 无独立目录项（无 fieldProps）：同时提供"名称"（运行时数据键 name）
// 与"标题"（label）两栏，二者解耦，改标题不影响已填数据的 key
const isTabsPane = computed(
  () => currentFieldType.value === 'tabsPane' || currentFieldType.value === 'stepsPane',
)

// 字段 / 容器 / 布局 + tab pane 都提供 name 编辑
const isNamedNode = computed(() => {
  const c = category.value
  return c === 'field' || c === 'container' || c === 'layout' || isTabsPane.value
})

const isFieldsCategory = computed(() => category.value === 'field')

const currentFieldKey = computed(() => selectedKey.value ?? undefined)

// name 唯一性：常规字段/容器/布局只校验同层兄弟节点（FormKit 的 name 按父级 group
// 作用域隔离，跨层级不冲突）。
// tabsPane/stepsPane 是特例（H1）：pane 的 name 是它内容 group 的数据键，而这个
// group 并不嵌套在 tabs/steps 容器自己的作用域里（tabs/steps 本身不建 group），
// 与 tabs/steps 容器的兄弟节点（包括根层普通字段）同处一个数据作用域——只校验
// pane 之间的兄弟关系会漏掉"pane 名撞上根层字段 name"这种跨层冲突（flat 模式下
// 尤其明显），因此改用全树名称集合（复用 collectSchemaNames）。
const isNameTaken = (name: string) => {
  if (!name) return false
  const root = formDefinition.value?.root?.children
  if (!Array.isArray(root) || !root.length) return false
  const key = currentFieldKey.value
  const located = key ? findDslNodeByKey(root, key) : null
  const self = located?.node ?? root[selectedIndex.value]

  if (isTabsPane.value) {
    // 按 __key 排除自身节点后再收集全树名称——不能先收集再按名字 delete：如果自身
    // 当前的 name 恰好就是与别的节点重复的那个值，按值删除会把唯一的一条记录整个
    // 删掉，冲突反而检测不出来
    const selfKey = currentFieldKey.value
    const names = new Set<string>()
    const collectOtherNames = (nodes: SchemaNode[]) => {
      for (const node of nodes) {
        if (typeof node?.name === 'string' && node.name && node.__key !== selfKey) {
          names.add(node.name)
        }
        collectOtherNames(schemaChildren(node))
      }
    }
    collectOtherNames(formSchema.value as SchemaNode[])
    return names.has(name)
  }

  const siblings = located?.parent ? dslChildrenOf(located.parent) : root
  return siblings.some((node) => node !== self && node.name === name)
}

// 字段：必填 + 格式 + 保留前缀 + 唯一；容器/布局/tab pane：可选，有值时同样校验
const nameError = computed(() => {
  if (!isNamedNode.value) return ''
  if (isFieldsCategory.value && !fieldName.value) return t('edits.nameRequired')
  if (!fieldName.value) return ''
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName.value)) return t('edits.nameFormat')
  // fkb_ 是 visibleIf 编译产物（$fkb_xxx helper 调用）的保留前缀（见
  // dsl/expr-schema-helpers.ts）：字段名撞上它会被同名 helper 覆盖，导致条件显示
  // 静默失效，因此在这里挡掉，而不是等运行时排查。
  if (fieldName.value.startsWith(EXPR_HELPER_PREFIX))
    return t('edits.nameReserved', { prefix: EXPR_HELPER_PREFIX })
  if (isNameTaken(fieldName.value)) return t('edits.nameExists')
  return ''
})
</script>

<template>
  <!-- tab pane：Name（数据字段名）+ Label（tab 标题） -->
  <template v-if="hasField && isTabsPane">
    <TextInput
      :label="t('edits.name')"
      :placeholder="t('edits.placeholder.fieldName')"
      :value="fieldName"
      :error="nameError"
      @update:value="(v) => (fieldName = v)"
    />
    <TextInput
      :label="t('edits.label')"
      :placeholder="t('edits.placeholder.label')"
      :value="label"
      @update:value="(v) => (label = v)"
    />
  </template>
  <TextInput
    v-else-if="hasField && isNamedNode"
    :label="t('edits.name')"
    :placeholder="t('edits.placeholder.fieldName')"
    :value="fieldName"
    :error="nameError"
    @update:value="(v) => (fieldName = v)"
  />
</template>
