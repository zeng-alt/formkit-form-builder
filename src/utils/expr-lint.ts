import type { Diagnostic } from '@codemirror/lint'
import type { EditorView } from '@codemirror/view'

// 字段名清单由调用方以取值函数传入（原因同 expr-completions.ts）：模块级全局
// 在两个 FormBuilder 实例并存时会互相覆盖，取值函数则始终读到调用时刻的最新清单。
type GetExprLintFieldNames = () => string[]

const VAR_RE = /\$([a-zA-Z_]\w*)/g

const BUILTIN_REFS = new Set(['get', 'slots'])

export function createExprLintSource(
  getFieldNames: GetExprLintFieldNames,
): (view: EditorView) => Diagnostic[] {
  return (view) => {
    const diagnostics: Diagnostic[] = []
    const doc = view.state.doc
    const text = doc.toString()

    const expr = text.trim()
    if (expr) {
      const syntaxResult = checkExprSyntax(expr)
      if (!syntaxResult.ok) {
        diagnostics.push({
          from: 0,
          to: doc.length,
          severity: 'error',
          message: syntaxResult.error,
        })
      }
    }

    checkUndefinedVars(text, getFieldNames(), diagnostics)

    return diagnostics
  }
}

function checkExprSyntax(expr: string): { ok: boolean; error: string } {
  let depth = 0
  let inSingle = false
  let inDouble = false
  const n = expr.length

  for (let i = 0; i < n; i++) {
    const ch = expr[i]!
    if (inSingle) {
      if (ch === '\\') {
        i++
        continue
      }
      if (ch === "'") inSingle = false
      continue
    }
    if (inDouble) {
      if (ch === '\\') {
        i++
        continue
      }
      if (ch === '"') inDouble = false
      continue
    }
    if (ch === "'") {
      inSingle = true
      continue
    }
    if (ch === '"') {
      inDouble = true
      continue
    }
    if (ch === '(') depth++
    if (ch === ')') {
      depth--
      if (depth < 0) return { ok: false, error: '括号不匹配' }
    }
  }

  if (inSingle) return { ok: false, error: '字符串未闭合（缺少单引号）' }
  if (inDouble) return { ok: false, error: '字符串未闭合（缺少双引号）' }
  if (depth !== 0) return { ok: false, error: '括号不匹配' }

  const trimmed = expr.trimEnd()
  if (/[+\-*/&|=<>.]$/.test(trimmed)) {
    return { ok: false, error: '表达式不完整（末尾有运算符或成员访问）' }
  }
  if (trimmed.endsWith('$')) {
    return { ok: false, error: '表达式不完整（$ 后缺少变量名或表达式标记）' }
  }

  return { ok: true, error: '' }
}

function checkUndefinedVars(text: string, fieldNames: string[], diagnostics: Diagnostic[]) {
  const matches = text.matchAll(VAR_RE)
  for (const match of matches) {
    const fieldName = match[1]!
    if (fieldNames.includes(fieldName)) continue
    if (BUILTIN_REFS.has(fieldName)) continue
    diagnostics.push({
      from: match.index,
      to: match.index + match[0].length,
      severity: 'warning',
      message: `未找到表单字段「${fieldName}」`,
    })
  }
}
