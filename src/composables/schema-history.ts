import type { FormKitSchemaFormKit } from '@formkit/core'
import { computed, ref } from 'vue'
import { formSchema, selectedIndex } from '../utils/default-form-elements'

type SchemaSnapshot = FormKitSchemaFormKit[]

const MAX_HISTORY = 100
const MERGE_WINDOW_MS = 500

const past = ref<SchemaSnapshot[]>([])
const future = ref<SchemaSnapshot[]>([])
const lastCommit = ref<{ at: number; reason?: string } | null>(null)

function cloneSchema(schema: SchemaSnapshot): SchemaSnapshot {
  try {
    return structuredClone(schema)
  } catch {
    return JSON.parse(JSON.stringify(schema)) as SchemaSnapshot
  }
}

function clampSelectedIndex(schemaLength: number) {
  if (schemaLength <= 0) {
    selectedIndex.value = 0
    return
  }

  if (selectedIndex.value > schemaLength - 1) {
    selectedIndex.value = schemaLength - 1
  }
}

export const canUndo = computed(() => past.value.length > 0)
export const canRedo = computed(() => future.value.length > 0)

export function commitSchema(
  nextSchema: SchemaSnapshot,
  options?: { reason?: string; merge?: boolean },
) {
  const now = Date.now()
  const currentSchema = formSchema.value
  const selectedKey = (formSchema.value[selectedIndex.value] as any)?.__key as string | undefined

  if (currentSchema === nextSchema) return

  const last = lastCommit.value
  const shouldMerge =
    options?.merge === true &&
    last?.reason === options?.reason &&
    !!last &&
    now - last.at <= MERGE_WINDOW_MS &&
    past.value.length > 0

  if (!shouldMerge) {
    past.value.push(cloneSchema(currentSchema))
    if (past.value.length > MAX_HISTORY) {
      past.value.splice(0, past.value.length - MAX_HISTORY)
    }
  }

  future.value = []
  lastCommit.value = { at: now, reason: options?.reason }

  formSchema.value = nextSchema
  if (options?.reason === 'dnd' && selectedKey) {
    const nextIndex = nextSchema.findIndex((field: any) => field?.__key === selectedKey)
    if (nextIndex >= 0) selectedIndex.value = nextIndex
  }
  clampSelectedIndex(formSchema.value.length)
}

export function undo() {
  const previous = past.value.pop()
  if (!previous) return

  future.value.unshift(cloneSchema(formSchema.value))
  if (future.value.length > MAX_HISTORY) {
    future.value.splice(MAX_HISTORY)
  }

  lastCommit.value = null
  formSchema.value = cloneSchema(previous)
  clampSelectedIndex(formSchema.value.length)
}

export function redo() {
  const next = future.value.shift()
  if (!next) return

  past.value.push(cloneSchema(formSchema.value))
  if (past.value.length > MAX_HISTORY) {
    past.value.splice(0, past.value.length - MAX_HISTORY)
  }

  lastCommit.value = null
  formSchema.value = cloneSchema(next)
  clampSelectedIndex(formSchema.value.length)
}

export function resetHistory() {
  past.value = []
  future.value = []
  lastCommit.value = null
}
