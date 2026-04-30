<script setup lang="ts">
import type { Component } from 'vue'
import { computed, provide, ref, watch, watchEffect } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { FormKit, FormKitSchema } from '@formkit/vue'
import createFormattedSchema from '@/utils/format-schema'
import { evalExpression } from '@/utils/expression-eval'
import { collectSchemaNames, generateKey, toSafeName } from '@/utils/dnd/schema'
import { getContainerKind } from '@/utils/schema/containers'
import { getPreviewSchemaLibrary } from '@/containers/registry'
import { useFormBuilderConfig } from '@/composables/use-config'

type ModelValue = Record<string, unknown>

const props = withDefaults(
  defineProps<{
    schema: FormKitSchemaFormKit[]
    modelValue?: ModelValue
    actions?: boolean
    formClass?: string
    formName?: string
    labelPosition?: 'top' | 'left'
    labelWidth?: number
    schemaLibrary?: Record<string, Component>
    interactiveContainers?: boolean
  }>(),
  {
    actions: false,
    formClass: 'w-full !grid !grid-cols-12 gap-x-4 gap-y-2',
    interactiveContainers: true,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: ModelValue): void
  (e: 'submit', value: ModelValue): void
}>()

const safeClone = <T,>(value: T): T => {
  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

const internalSchema = ref<FormKitSchemaFormKit[]>([])
const data = ref<ModelValue>({})
const listItemSeq = ref<Record<string, number>>({})
const lastComputedValueByName = ref<Record<string, string>>({})
const lastDepsSigByName = ref<Record<string, string>>({})

watch(
  () => props.schema,
  (next) => {
    internalSchema.value = safeClone(Array.isArray(next) ? next : [])
    listItemSeq.value = {}
    lastComputedValueByName.value = {}
    lastDepsSigByName.value = {}
  },
  { immediate: true, deep: true },
)

watch(
  () => props.modelValue,
  (next) => {
    if (!next) return
    if (next === data.value) return
    data.value = safeClone(next)
  },
  { immediate: true, deep: true },
)

watch(
  data,
  (next) => {
    emit('update:modelValue', next)
  },
  { deep: true },
)

const cfg = useFormBuilderConfig() as any

const schemaLibrary = computed<Record<string, Component>>(() => {
  const base = getPreviewSchemaLibrary()
  const wrapper = cfg?.wrapper && typeof cfg.wrapper === 'object' ? (cfg.wrapper as Record<string, Component>) : {}
  return { ...base, ...wrapper, ...props.schemaLibrary }
})

const formWrapper = computed<any | null>(() => {
  const only = internalSchema.value.length === 1 ? (internalSchema.value[0] as any) : null
  if (!only || typeof only !== 'object') return null
  if (only.$formkit !== 'form') return null
  if (!Array.isArray(only.children)) return null
  return only
})

const schemaBody = computed<FormKitSchemaFormKit[]>(() => {
  if (formWrapper.value) return formWrapper.value.children as FormKitSchemaFormKit[]
  return internalSchema.value
})

const resolvedFormName = computed(() => {
  const fromSchema = formWrapper.value?.name
  if (typeof fromSchema === 'string' && fromSchema.trim()) return fromSchema
  const fromProps = props.formName
  if (typeof fromProps === 'string' && fromProps.trim()) return fromProps
  return undefined
})

const resolvedLabelPosition = computed<'top' | 'left'>(() => {
  const fromSchema = formWrapper.value?.props?.labelPosition
  if (fromSchema === 'left' || fromSchema === 'top') return fromSchema
  return props.labelPosition === 'left' ? 'left' : 'top'
})

const resolvedLabelWidth = computed<number>(() => {
  const fromSchema = Number(formWrapper.value?.props?.labelWidth)
  if (Number.isFinite(fromSchema)) return fromSchema
  const fromProps = Number(props.labelWidth)
  if (Number.isFinite(fromProps)) return fromProps
  return 80
})

const resolvedFormClass = computed(() => {
  const base = props.formClass
  const common = [
    '[&_.formkit-label]:text-xs',
    '[&_.formkit-label]:font-bold',
  ].join(' ')
  if (resolvedLabelPosition.value === 'left') {
    return [
      base,
      common,
      'fk-label-left',
      '[&_.formkit-wrapper]:flex',
      '[&_.formkit-wrapper]:flex-row',
      '[&_.formkit-wrapper]:items-start',
      '[&_.formkit-wrapper]:gap-3',
      '[&_.formkit-label]:mb-0',
      '[&_.formkit-label]:w-[var(--fk-label-width)]',
      '[&_.formkit-label]:shrink-0',
      '[&_.formkit-label]:pt-1',
      '[&_.formkit-inner]:flex-1',
      '[&_.formkit-inner]:min-w-0',
    ].join(' ')
  }
  return [base, common].join(' ')
})

const formattedSchema = createFormattedSchema(schemaBody)

type Found = { node: FormKitSchemaFormKit; path: number[] } | null

const findSchemaNodeByKey = (schema: any[], key: string, path: number[] = []): Found => {
  for (let i = 0; i < schema.length; i++) {
    const node = schema[i]
    if (!node || typeof node !== 'object') continue
    const nextPath = [...path, i]
    if ((node as any).__key === key) return { node, path: nextPath }
    const children = (node as any)?.children
    if (Array.isArray(children)) {
      const found = findSchemaNodeByKey(children, key, [...nextPath, -1])
      if (found) return found
    }
  }
  return null
}

const normalizePath = (path: number[]) => path.filter((p) => p !== -1)

const getParentArrayAtPath = (schema: any[], path: number[]) => {
  const p = normalizePath(path)
  if (p.length === 0) return null
  if (p.length === 1) return { parentArr: schema, index: p[0]!, parentNode: null as any }
  let cursor: any = schema[p[0]!]
  for (let i = 1; i < p.length - 1; i++) {
    cursor = cursor?.children?.[p[i]!]
  }
  const parentArr = Array.isArray(cursor?.children) ? cursor.children : null
  return parentArr ? { parentArr, index: p[p.length - 1]!, parentNode: cursor } : null
}

const updateAtPath = (schema: any[], path: number[], nextNode: any): any[] => {
  const p = normalizePath(path)
  if (p.length === 0) return schema
  const nextSchema = [...schema]
  const idx0 = p[0]!
  if (p.length === 1) {
    nextSchema[idx0] = nextNode
    return nextSchema
  }
  const parent = { ...(nextSchema[idx0] as any) }
  let cursor: any = parent
  for (let i = 1; i < p.length - 1; i++) {
    const idx = p[i]!
    const arr = Array.isArray(cursor.children) ? [...cursor.children] : []
    const child = { ...(arr[idx] as any) }
    arr[idx] = child
    cursor.children = arr
    cursor = child
  }
  const lastIdx = p[p.length - 1]!
  const lastArr = Array.isArray(cursor.children) ? [...cursor.children] : []
  lastArr[lastIdx] = nextNode
  cursor.children = lastArr
  nextSchema[idx0] = parent
  return nextSchema
}

const removeAtPath = (schema: any[], path: number[]) => {
  const info = getParentArrayAtPath(schema, path)
  if (!info) return schema
  const { parentArr, index, parentNode } = info
  const nextArr = parentArr.filter((_: any, i: number) => i !== index)
  if (!parentNode) return nextArr
  const nextParent = { ...(parentNode as any), children: nextArr }
  return updateAtPath(schema, path.slice(0, -1), nextParent)
}

const insertAfterAtPath = (schema: any[], path: number[], nextNode: any) => {
  const info = getParentArrayAtPath(schema, path)
  if (!info) return schema
  const { parentArr, index, parentNode } = info
  const nextArr = [...parentArr]
  nextArr.splice(index + 1, 0, nextNode)
  if (!parentNode) return nextArr
  const nextParent = { ...(parentNode as any), children: nextArr }
  return updateAtPath(schema, path.slice(0, -1), nextParent)
}

const canonicalBaseName = (value: unknown) => {
  const safe = toSafeName(value)
  const match = safe.match(/^(.*_\d+)_\d+$/)
  return match?.[1] || safe
}

const isStructureNode = (node: any) => {
  const kind = getContainerKind(node)
  if (kind) return true
  return ['group'].includes(String(node?.$formkit ?? ''))
}

const collectLeafBases = (node: any, bases: Set<string>) => {
  if (!node || typeof node !== 'object') return
  if (!isStructureNode(node) && node.$formkit !== 'submit') {
    const rawName = node.name || node.$formkit || node.$cmp || 'field'
    const base = canonicalBaseName(rawName)
    if (base) bases.add(base)
  }
  if (Array.isArray(node.children)) {
    for (const c of node.children) collectLeafBases(c, bases)
  }
}

const cloneNodeWithFreshIdentity = (node: any, existingNames: Set<string>, listSuffix: number) => {
  if (!node || typeof node !== 'object') return node
  const nextKey = generateKey()
  const next: any = { ...node, __key: nextKey }
  const kind = getContainerKind(node)
  if (node.$formkit !== 'submit') {
    if (!isStructureNode(node)) {
      const rawName = node.name || node.$formkit || node.$cmp || 'field'
      const base = canonicalBaseName(rawName)
      let candidate = listSuffix > 0 ? `${base}_${listSuffix}` : base
      let i = 1
      while (existingNames.has(candidate)) {
        candidate = `${base}_${listSuffix}_${i}`
        i++
      }
      next.name = candidate
      existingNames.add(candidate)
      existingNames.add(toSafeName(candidate))
    }
    next.id = `field_${nextKey}`
  }
  if (Array.isArray(node.children)) {
    next.children = node.children.map((c: any) => cloneNodeWithFreshIdentity(c, existingNames, listSuffix))
  }
  if (kind) {
    const baseProps = typeof next.props === 'object' && next.props ? next.props : {}
    if (kind === 'list') {
      next.props = { ...baseProps, listKey: nextKey, modelValue: Array.isArray(next.children) ? next.children : [] }
    } else if (kind === 'card') {
      next.props = { ...baseProps, cardKey: nextKey, modelValue: Array.isArray(next.children) ? next.children : [] }
    } else if (kind === 'inputGroup') {
      next.props = { ...baseProps, inputGroupKey: nextKey, modelValue: Array.isArray(next.children) ? next.children : [] }
    } else if (kind === 'tabs') {
      next.props = { ...baseProps, tabsKey: nextKey, modelValue: Array.isArray(next.children) ? next.children : [] }
    }
  }
  return next
}

const eachField = (schema: FormKitSchemaFormKit[], fn: (field: any) => void) => {
  for (const field of schema) {
    fn(field)
    const children = (field as any)?.children
    if (Array.isArray(children)) eachField(children as FormKitSchemaFormKit[], fn)
  }
}

const collectSchemaNamesSafe = (schema: FormKitSchemaFormKit[], names: Set<string>) => {
  collectSchemaNames(schema, names)
  eachField(schema, (field) => {
    const raw = field?.name
    if (typeof raw !== 'string' || !raw) return
    names.add(toSafeName(raw))
  })
}

provide('previewListDuplicate', (key: string) => {
  if (!props.interactiveContainers) return
  const found = findSchemaNodeByKey(internalSchema.value as any[], key)
  if (!found) return
  const existingNames = new Set<string>()
  collectSchemaNamesSafe(internalSchema.value as any, existingNames)
  const bases = new Set<string>()
  collectLeafBases(found.node as any, bases)
  let nextSuffix = (listItemSeq.value[key] ?? 0) + 1
  const isFree = (suffix: number) => {
    for (const base of bases) {
      const candidate = `${base}_${suffix}`
      if (existingNames.has(candidate) || existingNames.has(toSafeName(candidate))) return false
    }
    return true
  }
  while (!isFree(nextSuffix)) nextSuffix++
  listItemSeq.value = { ...listItemSeq.value, [key]: nextSuffix }
  const cloned = cloneNodeWithFreshIdentity(safeClone(found.node as any), existingNames, nextSuffix)
  internalSchema.value = insertAfterAtPath(internalSchema.value as any[], found.path, cloned) as any
})

provide('previewListIsLast', (key: string) => {
  if (!props.interactiveContainers) return true
  const found = findSchemaNodeByKey(internalSchema.value as any[], key)
  if (!found) return true
  const info = getParentArrayAtPath(internalSchema.value as any[], found.path)
  if (!info) return true
  const { parentArr } = info
  const last = [...parentArr].reverse().find((n: any) => getContainerKind(n) === 'list' && (n as any)?.__preview_placeholder !== true)
  if (!last) return true
  return (last as any).__key === key
})

provide('previewListRemove', (key: string) => {
  if (!props.interactiveContainers) return
  const found = findSchemaNodeByKey(internalSchema.value as any[], key)
  if (!found) return
  const hasOtherList = (() => {
    const walk = (nodes: any[]): boolean => {
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue
        if (getContainerKind(node) === 'list' && node.__key !== key && (node as any).__preview_placeholder !== true) return true
        const children = (node as any)?.children
        if (Array.isArray(children) && walk(children)) return true
      }
      return false
    }
    return walk(internalSchema.value as any[])
  })()

  if (!hasOtherList) {
    const current: any = found.node as any
    const nextNode: any = { ...current, __preview_placeholder: true }
    internalSchema.value = updateAtPath(internalSchema.value as any[], found.path, nextNode) as any
    return
  }

  internalSchema.value = removeAtPath(internalSchema.value as any[], found.path) as any
})

provide('previewListRestore', (key: string) => {
  if (!props.interactiveContainers) return
  const found = findSchemaNodeByKey(internalSchema.value as any[], key)
  if (!found) return
  const current: any = found.node as any
  const { __preview_placeholder, ...rest } = current
  const nextNode: any = { ...rest, children: Array.isArray(current.children) ? current.children : [] }
  internalSchema.value = updateAtPath(internalSchema.value as any[], found.path, nextNode) as any
})

watchEffect(() => {
  const currentData = data.value as Record<string, unknown>
  let nextData: Record<string, unknown> | null = null
  eachField(internalSchema.value as FormKitSchemaFormKit[], (field) => {
    if (!field || typeof field !== 'object') return
    if (!field.useExpressionValue) return
    if (typeof field.name !== 'string' || !field.name) return
    const expr = (field as any)?.__raw__valueExpression ?? (field as any)?.valueExpression
    if (typeof expr !== 'string' || !expr.trim()) return

    const evalResult = evalExpression(expr, currentData)
    const depsSig = evalResult.deps
      .filter((k) => k !== field.name)
      .map((k) => `${k}:${String(currentData[k] ?? '')}`)
      .join('|')
    if (lastDepsSigByName.value[field.name] === depsSig) return
    lastDepsSigByName.value = { ...lastDepsSigByName.value, [field.name]: depsSig }

    if (!evalResult.ok) return
    const result = evalResult.value === null || evalResult.value === undefined ? '' : String(evalResult.value)

    const currentValue = currentData[field.name]
    const lastComputedValue = lastComputedValueByName.value[field.name]
    const shouldApply =
      currentValue === null ||
      currentValue === undefined ||
      String(currentValue) === '' ||
      (lastComputedValue !== undefined && String(currentValue) === lastComputedValue)

    if (shouldApply && String(currentValue ?? '') !== result) {
      if (!nextData) nextData = { ...currentData }
      nextData[field.name] = result
      lastComputedValueByName.value = { ...lastComputedValueByName.value, [field.name]: result }
    }
  })

  if (nextData) data.value = nextData
})

const handleSubmit = (formData: Record<string, unknown>) => {
  emit('submit', formData)
}
</script>

<template>
  <FormKit
    type="form"
    :name="resolvedFormName"
    :actions="props.actions"
    v-model="data"
    @submit="handleSubmit"
    :form-class="resolvedFormClass"
    :style="{ '--fk-label-width': `${resolvedLabelWidth}px` }"
  >
    <FormKitSchema :schema="formattedSchema" :data="data" :library="schemaLibrary" />
  </FormKit>
</template>
