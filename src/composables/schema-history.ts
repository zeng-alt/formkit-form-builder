import type { FormKitSchemaFormKit } from '@formkit/core'
import { computed, ref } from 'vue'
import { formDefinition, commitSchemaChildren } from '@/state/form-definition'
import { selectedIndex, selectedKey } from '@/state/form-schema'
import { generateKey } from '../utils/dnd/schema'
import { findDslNodeByKey } from '../utils/schema/dsl-tree'
import type { FormDefinition, FormNode } from '@/types/dsl'

type DefSnapshot = FormDefinition

const MAX_HISTORY = 100
const MERGE_WINDOW_MS = 500

const past = ref<DefSnapshot[]>([])
const future = ref<DefSnapshot[]>([])
const lastCommit = ref<{ at: number; reason?: string } | null>(null)

function cloneDef(def: DefSnapshot): DefSnapshot {
  try {
    return structuredClone(def)
  } catch {
    return JSON.parse(JSON.stringify(def)) as DefSnapshot
  }
}

function dslRoot(def: DefSnapshot): FormNode[] {
  return Array.isArray(def?.root?.children) ? def.root.children : []
}

function clampSelectedIndex(def: DefSnapshot) {
  const len = dslRoot(def).length
  if (len <= 0) {
    selectedIndex.value = 0
    selectedKey.value = null
    return
  }

  if (selectedIndex.value > len - 1) {
    selectedIndex.value = len - 1
  }
}

function applyDefinition(def: DefSnapshot) {
  const prevKey = selectedKey.value
  formDefinition.value = def
  if (prevKey) {
    const found = findDslNodeByKey(dslRoot(def), prevKey)
    if (found) {
      selectedIndex.value = found.rootIndex
      selectedKey.value = prevKey
    } else {
      selectedKey.value = null
    }
  }
  clampSelectedIndex(def)
}

export const canUndo = computed(() => past.value.length > 0)
export const canRedo = computed(() => future.value.length > 0)

function migrateExpressionKeys(schema: FormKitSchemaFormKit[]) {
  const visit = (nodes: any[]) => {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue
      if (typeof node.__key !== 'string' || !node.__key) {
        node.__key = generateKey()
      }
      if (typeof node.valueExpression === 'string' && typeof node.__raw__valueExpression !== 'string') {
        node.__raw__valueExpression = node.valueExpression
      }
      if (typeof node.if === 'string' && typeof node.__raw__ifExpression !== 'string') {
        node.__raw__ifExpression = node.if
      }
      if ('valueExpression' in node) delete node.valueExpression
      const bind = (node as any).bind
      if (bind && typeof bind !== 'string') {
        if (typeof bind === 'object' && !Array.isArray(bind) && typeof (node as any).__bind !== 'object') {
          ;(node as any).__bind = bind
        }
        delete (node as any).bind
      } else if (typeof bind === 'string') {
        if (bind === '$someAttributes') delete (node as any).bind
        else if (bind.startsWith('$bind_')) delete (node as any).bind
      }
      if (Array.isArray(node.children)) visit(node.children)
    }
  }
  visit(schema as any[])
}

// 唯一写漏斗：直接提交规范 DSL 定义
export function commitFormDefinition(
  nextDef: DefSnapshot,
  options?: { reason?: string; merge?: boolean },
) {
  const now = Date.now()
  const currentDef = formDefinition.value
  if (currentDef === nextDef) return

  const last = lastCommit.value
  const shouldMerge =
    options?.merge === true &&
    last?.reason === options?.reason &&
    !!last &&
    now - last.at <= MERGE_WINDOW_MS &&
    past.value.length > 0

  if (!shouldMerge) {
    past.value.push(cloneDef(currentDef))
    if (past.value.length > MAX_HISTORY) {
      past.value.splice(0, past.value.length - MAX_HISTORY)
    }
  }

  future.value = []
  lastCommit.value = { at: now, reason: options?.reason }
  applyDefinition(nextDef)
}

// schema 数组提交（DnD / 容器更新 / legacy 导入）：迁移后转 DSL 再走统一漏斗
export function commitSchema(
  nextSchema: FormKitSchemaFormKit[],
  options?: { reason?: string; merge?: boolean },
) {
  const working = cloneDef(nextSchema as unknown as DefSnapshot) as unknown as FormKitSchemaFormKit[]
  migrateExpressionKeys(working)
  commitFormDefinition(commitSchemaChildren(working), options)
}

export function undo() {
  const previous = past.value.pop()
  if (!previous) return

  future.value.unshift(cloneDef(formDefinition.value))
  if (future.value.length > MAX_HISTORY) {
    future.value.splice(MAX_HISTORY)
  }

  lastCommit.value = null
  applyDefinition(cloneDef(previous))
}

export function redo() {
  const next = future.value.shift()
  if (!next) return

  past.value.push(cloneDef(formDefinition.value))
  if (past.value.length > MAX_HISTORY) {
    past.value.splice(0, past.value.length - MAX_HISTORY)
  }

  lastCommit.value = null
  applyDefinition(cloneDef(next))
}

export function resetHistory() {
  past.value = []
  future.value = []
  lastCommit.value = null
}
