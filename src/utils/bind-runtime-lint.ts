import type { Diagnostic } from '@codemirror/lint'
import type { EditorView } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import type { SyntaxNode, TreeCursor } from '@lezer/common'

const BIND_GLOBALS = new Set([
  'event',
  'form',
  '$form',
  '$value',
  '$node',
  '$name',
  '$get',
  '$slots',
  'attrs',
  'ctx',
  'extra',
  'axios',
])

const JS_BUILTINS = new Set([
  'console',
  'window',
  'document',
  'Array',
  'Object',
  'String',
  'Number',
  'Boolean',
  'Date',
  'Math',
  'JSON',
  'Promise',
  'RegExp',
  'Error',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'undefined',
  'NaN',
  'Infinity',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'fetch',
  'alert',
  'confirm',
  'prompt',
  'Intl',
  'BigInt',
  'Symbol',
  'Proxy',
  'Reflect',
  'arguments',
  'eval',
])

export function jsLintSource(view: EditorView): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const tree = syntaxTree(view.state)
  const doc = view.state.doc.toString()

  // 收集作用域内声明的变量
  const declared = new Set<string>()
  collectDeclarations(tree.cursor(), doc, declared)

  // 遍历语法树：语法错误 + 未定义变量检查
  walkTree(tree.cursor(), doc, declared, diagnostics)

  return diagnostics
}

function collectDeclarations(cursor: TreeCursor, doc: string, declared: Set<string>): void {
  // 先读取当前节点
  do {
    const node = cursor.node
    switch (node.name) {
      case 'VariableDefinition':
        declared.add(doc.slice(node.from, node.to))
        break
      case 'PropertyDefinition':
      case 'Property':
        // 对象属性名不纳入变量检查（属性访问由点号触发的补全处理）
        break
    }
    if (
      node.name === 'FunctionDeclaration' ||
      node.name === 'ArrowFunction' ||
      node.name === 'FunctionExpression'
    ) {
      // 函数参数：第一个子节点的子节点
      const child = node.firstChild
      if (child) {
        let param: SyntaxNode | null = child.firstChild
        while (param) {
          if (param.name === 'VariableDefinition') {
            declared.add(doc.slice(param.from, param.to))
          }
          param = param.nextSibling
        }
      }
    }
    if (cursor.firstChild()) {
      collectDeclarations(cursor, doc, declared)
      cursor.parent()
    }
  } while (cursor.nextSibling())
}

function walkTree(
  cursor: TreeCursor,
  doc: string,
  declared: Set<string>,
  diagnostics: Diagnostic[],
): void {
  do {
    const node = cursor.node

    if (node.type.isError) {
      diagnostics.push({
        from: node.from,
        to: node.to,
        severity: 'error',
        message: '语法错误',
      })
    } else if (node.name === 'VariableName') {
      const name = doc.slice(node.from, node.to)
      if (
        name &&
        !BIND_GLOBALS.has(name) &&
        !JS_BUILTINS.has(name) &&
        !declared.has(name) &&
        !isPropertyAccess(node, doc)
      ) {
        diagnostics.push({
          from: node.from,
          to: node.to,
          severity: 'warning',
          message: `未定义的变量 "${name}"`,
        })
      }
    }

    if (cursor.firstChild()) {
      walkTree(cursor, doc, declared, diagnostics)
      cursor.parent()
    }
  } while (cursor.nextSibling())
}

function isPropertyAccess(node: SyntaxNode, _doc: string): boolean {
  const parent = node.parent
  if (!parent) return false
  // MemberExpression: obj.property — node 是 property 部分时跳过
  return parent.name === 'MemberExpression' && parent.firstChild !== node
}
