type Token =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'var'; name: string }
  | { type: 'op'; op: Op }
  | { type: 'lparen' }
  | { type: 'rparen' }

type Op = '+' | '-' | '*' | '/' | 'u-' | 'u+'

const isWhitespace = (ch: string) => ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r'
const isDigit = (ch: string) => ch >= '0' && ch <= '9'
const isIdentStart = (ch: string) =>
  (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'
const isIdent = (ch: string) => isIdentStart(ch) || isDigit(ch)

export type EvalResult =
  | { ok: true; value: unknown; deps: string[] }
  | { ok: false; error: string; deps: string[] }

export function evalExpression(
  input: string,
  vars: Record<string, unknown>,
): EvalResult {
  const deps = new Set<string>()
  const tokensResult = tokenize(input, deps)
  if (!tokensResult.ok) return { ok: false, error: tokensResult.error, deps: Array.from(deps) }
  const rpnResult = toRpn(tokensResult.tokens)
  if (!rpnResult.ok) return { ok: false, error: rpnResult.error, deps: Array.from(deps) }
  const valueResult = evalRpn(rpnResult.rpn, vars)
  if (!valueResult.ok) return { ok: false, error: valueResult.error, deps: Array.from(deps) }
  return { ok: true, value: valueResult.value, deps: Array.from(deps) }
}

type TokenizeResult =
  | { ok: true; tokens: Token[] }
  | { ok: false; error: string }

function tokenize(input: string, deps: Set<string>): TokenizeResult {
  const tokens: Token[] = []
  let i = 0
  const n = input.length

  const pushOp = (op: '+' | '-' | '*' | '/') => {
    tokens.push({ type: 'op', op })
  }

  while (i < n) {
    const ch = input[i]!
    if (isWhitespace(ch)) {
      i++
      continue
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen' })
      i++
      continue
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen' })
      i++
      continue
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      pushOp(ch)
      i++
      continue
    }

    if (ch === '$') {
      i++
      if (i >= n) return { ok: false, error: '表达式以 $ 结尾' }
      const start = i
      const first = input[i]!
      if (!isIdentStart(first)) return { ok: false, error: '变量名不合法' }
      i++
      while (i < n && isIdent(input[i]!)) i++
      const name = input.slice(start, i)
      deps.add(name)
      tokens.push({ type: 'var', name })
      continue
    }

    if (ch === '"' || ch === "'") {
      const quote = ch
      i++
      let out = ''
      for (; i < n; i++) {
        const c = input[i]!
        if (c === '\\') {
          const next = input[i + 1]
          if (next === undefined) return { ok: false, error: '字符串转义不完整' }
          out += next
          i++
          continue
        }
        if (c === quote) break
        out += c
      }
      if (i >= n || input[i] !== quote) return { ok: false, error: '字符串未闭合' }
      i++
      tokens.push({ type: 'string', value: out })
      continue
    }

    if (isDigit(ch) || (ch === '.' && i + 1 < n && isDigit(input[i + 1]!))) {
      const start = i
      i++
      while (i < n && (isDigit(input[i]!) || input[i] === '.')) i++
      const raw = input.slice(start, i)
      const value = Number(raw)
      if (!Number.isFinite(value)) return { ok: false, error: `数字不合法: ${raw}` }
      tokens.push({ type: 'number', value })
      continue
    }

    return { ok: false, error: `无法解析字符: ${ch}` }
  }

  return { ok: true, tokens }
}

type RpnResult =
  | { ok: true; rpn: Token[] }
  | { ok: false; error: string }

function toRpn(tokens: Token[]): RpnResult {
  const output: Token[] = []
  const ops: Token[] = []

  const prec = (op: Op) => {
    if (op === 'u-' || op === 'u+') return 3
    if (op === '*' || op === '/') return 2
    return 1
  }
  const isRightAssoc = (op: Op) => op === 'u-' || op === 'u+'

  let prev: Token | null = null

  for (const t of tokens) {
    if (t.type === 'number' || t.type === 'string' || t.type === 'var') {
      output.push(t)
      prev = t
      continue
    }
    if (t.type === 'lparen') {
      ops.push(t)
      prev = t
      continue
    }
    if (t.type === 'rparen') {
      let found = false
      while (ops.length) {
        const top = ops.pop()!
        if (top.type === 'lparen') {
          found = true
          break
        }
        output.push(top)
      }
      if (!found) return { ok: false, error: '括号不匹配' }
      prev = t
      continue
    }
    if (t.type === 'op') {
      const isUnary: boolean =
        prev === null ||
        prev.type === 'op' ||
        prev.type === 'lparen'
      const opToken: Extract<Token, { type: 'op' }> = isUnary
        ? { type: 'op', op: t.op === '-' ? 'u-' : t.op === '+' ? 'u+' : t.op }
        : t

      while (ops.length) {
        const top = ops[ops.length - 1]!
        if (top.type !== 'op') break
        const p1 = prec(opToken.op)
        const p2 = prec(top.op)
        if ((isRightAssoc(opToken.op) && p1 < p2) || (!isRightAssoc(opToken.op) && p1 <= p2)) {
          output.push(ops.pop()!)
        } else {
          break
        }
      }
      ops.push(opToken)
      prev = opToken
      continue
    }
  }

  while (ops.length) {
    const top = ops.pop()!
    if (top.type === 'lparen' || top.type === 'rparen') return { ok: false, error: '括号不匹配' }
    output.push(top)
  }

  return { ok: true, rpn: output }
}

type EvalRpnResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string }

function evalRpn(rpn: Token[], vars: Record<string, unknown>): EvalRpnResult {
  const stack: unknown[] = []

  const toNum = (v: unknown) => {
    if (typeof v === 'number') return v
    if (typeof v === 'string') return v.trim() ? Number(v) : 0
    if (v === null || v === undefined) return 0
    return Number(v)
  }

  for (const t of rpn) {
    if (t.type === 'number') {
      stack.push(t.value)
      continue
    }
    if (t.type === 'string') {
      stack.push(t.value)
      continue
    }
    if (t.type === 'var') {
      stack.push(vars[t.name])
      continue
    }
    if (t.type === 'op') {
      if (t.op === 'u-' || t.op === 'u+') {
        const a = stack.pop()
        if (a === undefined) return { ok: false, error: '表达式不完整' }
        const n = toNum(a)
        if (!Number.isFinite(n)) return { ok: false, error: '数值运算失败' }
        stack.push(t.op === 'u-' ? -n : n)
        continue
      }

      const b = stack.pop()
      const a = stack.pop()
      if (a === undefined || b === undefined) return { ok: false, error: '表达式不完整' }

      if (t.op === '+') {
        if (typeof a === 'string' || typeof b === 'string') {
          stack.push(String(a ?? '') + String(b ?? ''))
          continue
        }
        const na = toNum(a)
        const nb = toNum(b)
        if (!Number.isFinite(na) || !Number.isFinite(nb)) return { ok: false, error: '数值运算失败' }
        stack.push(na + nb)
        continue
      }

      const na = toNum(a)
      const nb = toNum(b)
      if (!Number.isFinite(na) || !Number.isFinite(nb)) return { ok: false, error: '数值运算失败' }
      if (t.op === '-') stack.push(na - nb)
      else if (t.op === '*') stack.push(na * nb)
      else if (t.op === '/') stack.push(na / nb)
      else return { ok: false, error: '未知运算符' }
      continue
    }
  }

  if (stack.length !== 1) return { ok: false, error: '表达式不完整' }
  return { ok: true, value: stack[0] }
}
