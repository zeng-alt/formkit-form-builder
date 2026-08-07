// ═══ DSL 层出口 ════════════════════════════════════════════════════════════════

export { DSL_VERSION } from '../types/dsl'
export type {
  FormDefinition,
  FormNode,
  BaseNode,
  FieldNode,
  ContainerNode,
  LayoutNode,
  StaticNode,
  LayoutType,
  FormSettings,
  NodeCategory,
  NodeLayout,
  RenderKind,
  Expr,
  ExprLiteral,
  ExprField,
  ExprCall,
  FieldValue,
  StaticValue,
  ValidationRule,
  OptionItem,
  EventBinding,
} from '../types/dsl'

export {
  dslToSchema,
  dslToOutputSchema,
  schemaToDsl,
  schemaNodeToDslNode,
  reconcileDslTree,
} from './schema-adapter'
export type { SchemaToDslOptions } from './schema-adapter'

export {
  registerElementType,
  getElementTypeDef,
  getElementTypeDefs,
  fieldType,
  containerType,
  layoutType,
  staticType,
  tabsPaneType,
  elementTypeFromSchema,
} from './registry'
export type {
  ElementTypeDef,
  ElementTemplate,
  ElementCatalogEntry,
  DslToSchemaCtx,
} from './registry'

export { registerBuiltinElementTypes } from './definitions'
export { getBuiltin, isBuiltin } from './expr-builtins'
export type { BuiltinFn } from './expr-builtins'
export { exprToJs, resolveValidation, resolveEvents } from './compile'
export { evalExpr } from './eval'
export type { EvalResult } from './eval'
export {
  parseExprString,
  parseValidation,
  parseEvents,
  compileLayout,
  parseLayout,
  parseOuterClass,
  nodeOuterClass,
} from './convert-common'
export type { SchemaNode } from './convert-common'
