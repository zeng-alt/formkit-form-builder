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
export {
  setExprLocale,
  getExprLocale,
  getExprTimeZone,
  resolveTimeZoneForLocale,
  formatIsoDate,
  LOCALE_TIME_ZONES,
} from './expr-env'
export { exprToJs, resolveValidation, resolveEvents } from './compile'
export type { ValidationEntry, ResolvedValidation } from './compile'
export { EXPR_HELPER_PREFIX, EXPR_SCHEMA_HELPERS, exprHelperCall } from './expr-schema-helpers'
export { evalExpr } from './eval'
export type { EvalResult } from './eval'
export {
  parseExprString,
  parseValidation,
  parseOuterClass,
  nodeOuterClass,
} from './convert'
export type { SchemaNode } from './convert'
