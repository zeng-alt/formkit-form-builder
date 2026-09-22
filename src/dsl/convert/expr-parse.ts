// ═══ 旧表达式字符串 → AST（best-effort，失败则 __raw__ 无损兜底）═════════════════
// fromSchema 方向专用：把外部/历史 schema 里 `if`（及旧版 expr 字符串）解析回 Expr
// AST，供各节点的 fromSchema 还原 visibleIf。叶子模块，不依赖 convert/ 下任何其他文件。

import type { Expr } from '../../types/dsl'
import { EXPR_HELPER_PREFIX } from '../expr-schema-helpers'

export function parseExprString(input: string): Expr {
  const raw = (str: string): Expr => ({
    type: 'call',
    fn: '__raw__',
    args: [{ type: 'literal', value: str }],
  })
  if (typeof input !== 'string') return raw(String(input))
  const src = input.trim()
  if (!src) return raw('')

  let pos = 0
  const n = src.length
  const eof = () => pos >= n
  const peek = () => src[pos]
  const skip = () => {
    while (!eof() && /\s/.test(peek()!)) pos++
  }
  const consume = (ch: string): boolean => {
    if (src[pos] === ch) {
      pos++
      return true
    }
    return false
  }
  const ident = (word: string): boolean => {
    skip()
    if (src.slice(pos, pos + word.length) !== word) return false
    const after = src[pos + word.length]
    if (after !== undefined && /[a-zA-Z0-9_]/.test(after)) return false
    pos += word.length
    return true
  }
  const literal = (value: unknown): Expr => ({ type: 'literal', value })
  const call = (fn: string, args: Expr[]): Expr => ({ type: 'call', fn, args })

  const parseConditional = (): Expr => {
    const test = parseOr()
    skip()
    if (peek() === '?') {
      pos++
      skip()
      const consequent = parseOr()
      skip()
      if (!consume(':')) throw new Error('parse error')
      skip()
      const alternate = parseOr()
      return call('if', [test, consequent, alternate])
    }
    return test
  }

  const parseOr = (): Expr => {
    let left = parseAnd()
    for (;;) {
      skip()
      if (src.slice(pos, pos + 2) === '||') {
        pos += 2
        left = call('or', [left, parseAnd()])
      } else break
    }
    return left
  }
  const parseAnd = (): Expr => {
    let left = parseEq()
    for (;;) {
      skip()
      if (src.slice(pos, pos + 2) === '&&') {
        pos += 2
        left = call('and', [left, parseEq()])
      } else break
    }
    return left
  }
  const parseEq = (): Expr => {
    let left = parseRel()
    for (;;) {
      skip()
      const three = src.slice(pos, pos + 3)
      const two = src.slice(pos, pos + 2)
      if (three === '===') {
        pos += 3
        left = call('eq', [left, parseRel()])
      } else if (three === '!==') {
        pos += 3
        left = call('neq', [left, parseRel()])
      } else if (two === '==') {
        pos += 2
        left = call('eq', [left, parseRel()])
      } else if (two === '!=') {
        pos += 2
        left = call('neq', [left, parseRel()])
      } else break
    }
    return left
  }
  const parseRel = (): Expr => {
    let left = parseAdd()
    for (;;) {
      skip()
      const two = src.slice(pos, pos + 2)
      const ch = peek()
      if (two === '>=') {
        pos += 2
        left = call('gte', [left, parseAdd()])
      } else if (two === '<=') {
        pos += 2
        left = call('lte', [left, parseAdd()])
      } else if (ch === '>') {
        pos++
        left = call('gt', [left, parseAdd()])
      } else if (ch === '<') {
        pos++
        left = call('lt', [left, parseAdd()])
      } else break
    }
    return left
  }
  const parseAdd = (): Expr => {
    let left = parseMul()
    for (;;) {
      skip()
      const ch = peek()
      if (ch === '+') {
        pos++
        left = call('add', [left, parseMul()])
      } else if (ch === '-') {
        pos++
        left = call('sub', [left, parseMul()])
      } else break
    }
    return left
  }
  const parseMul = (): Expr => {
    let left = parseUnary()
    for (;;) {
      skip()
      const ch = peek()
      if (ch === '*') {
        pos++
        left = call('mul', [left, parseUnary()])
      } else if (ch === '/') {
        pos++
        left = call('div', [left, parseUnary()])
      } else break
    }
    return left
  }
  const parseUnary = (): Expr => {
    skip()
    const ch = peek()
    if (ch === '!') {
      pos++
      return call('not', [parseUnary()])
    }
    if (ch === '-') {
      pos++
      return call('sub', [literal(0), parseUnary()])
    }
    return parsePrimary()
  }
  const parseStringWrapper = (): Expr | null => {
    if (!ident('String') || peek() !== '(') return null
    pos++
    skip()
    const inner = parseOr()
    skip()
    if (!consume(')')) throw new Error('parse error')
    skip()
    if (peek() === '.') {
      pos++
      skip()
      const member = src.slice(pos).match(/^[a-zA-Z]+/)
      if (member) {
        pos += member[0].length
        if (member[0] === 'includes' && peek() === '(') {
          pos++
          skip()
          const arg = parseOr()
          skip()
          if (!consume(')')) throw new Error('parse error')
          return call('contains', [inner, arg])
        }
        if (member[0] === 'toLowerCase') {
          if (!consume('(') || !consume(')')) throw new Error('parse error')
          return call('lower', [inner])
        }
        if (member[0] === 'toUpperCase') {
          if (!consume('(') || !consume(')')) throw new Error('parse error')
          return call('upper', [inner])
        }
        if (member[0] === 'trim') {
          if (!consume('(') || !consume(')')) throw new Error('parse error')
          return call('trim', [inner])
        }
      }
    }
    return inner
  }
  const parsePrimary = (): Expr => {
    skip()
    const ch = peek()

    if (ch === '"' || ch === "'") {
      const quote = ch
      pos++
      let out = ''
      for (;;) {
        if (eof()) throw new Error('parse error')
        const c = peek()
        if (c === '\\') {
          pos++
          if (eof()) throw new Error('parse error')
          out += peek()
          pos++
          continue
        }
        if (c === quote) break
        out += c
        pos++
      }
      if (!consume(quote)) throw new Error('parse error')
      return literal(out)
    }

    if (ch === '$') {
      pos++
      const start = pos
      while (!eof() && /[a-zA-Z0-9_]/.test(peek()!)) pos++
      let field = src.slice(start, pos)
      // $fkb_<fn>(arg1, arg2, ...) —— exprToJs 现在把所有内置函数都编译成这种
      // helper 调用形式（见 expr-schema-helpers.ts），是本解析器唯一需要认识的
      // "自家产物"语法；参数递归走 parseConditional，因此嵌套调用
      // （如 $fkb_not($fkb_eq($a, 5))）能正确还原成嵌套的 call 节点。
      if (field.startsWith(EXPR_HELPER_PREFIX) && peek() === '(') {
        const fn = field.slice(EXPR_HELPER_PREFIX.length)
        pos++
        skip()
        const args: Expr[] = []
        if (peek() !== ')') {
          args.push(parseConditional())
          skip()
          while (peek() === ',') {
            pos++
            skip()
            args.push(parseConditional())
            skip()
          }
        }
        if (!consume(')')) throw new Error('parse error')
        return call(fn, args)
      }
      // $xxx() / $xxx($1) — 空参或模板占位符，将 () 吃掉，让 $get()
      // 变成普通字段引用而非 __raw__('$get()')，避免 FormKit 报
      // "must use the id of an input to access" 警告
      const rest = src.slice(pos)
      const emptyParens = /^\(\)/.exec(rest)
      const templateParens = /^\(\$1\)/.exec(rest)
      if (emptyParens || templateParens) {
        pos += emptyParens ? 2 : 4
        return { type: 'field', name: field }
      }
      // 去掉上下文前缀：$formData.userType / $var.userType → field 'userType'
      if (peek() === '.') {
        pos++
        const segStart = pos
        while (!eof() && /[a-zA-Z0-9_.]/.test(peek()!)) pos++
        const rest = src.slice(segStart, pos)
        if (rest) field = rest
      }
      return { type: 'field', name: field }
    }

    if (ch === '(') {
      pos++
      skip()
      const inner = parseOr()
      skip()
      if (!consume(')')) throw new Error('parse error')
      return inner
    }

    if (ch !== undefined && /[0-9.]/.test(ch)) {
      const numberMatch = src.slice(pos).match(/^\d+(\.\d+)?/)
      if (numberMatch) {
        pos += numberMatch[0].length
        return literal(Number(numberMatch[0]))
      }
    }

    if (ident('true')) return literal(true)
    if (ident('false')) return literal(false)
    if (ident('null')) return literal(null)

    const wrapped = parseStringWrapper()
    if (wrapped) return wrapped

    throw new Error('parse error')
  }

  try {
    skip()
    const result = parseConditional()
    skip()
    if (!eof()) return raw(input)
    return result
  } catch {
    return raw(input)
  }
}
