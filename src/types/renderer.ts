import type {
  FormNode,
  FieldNode,
  ContainerNode,
  LayoutNode,
  StaticNode,
  FormDefinition,
} from './dsl'

// ─── Renderer function types ──────────────────────────────────────────────────

export type FieldRenderer<T> = (node: FieldNode, ctx: RenderContext<T>, children?: T[]) => T

export type ContainerRenderer<T> = (node: ContainerNode, ctx: RenderContext<T>, children?: T[]) => T

export type LayoutRenderer<T> = (node: LayoutNode, ctx: RenderContext<T>, children?: T[]) => T

export type StaticRenderer<T> = (node: StaticNode, ctx: RenderContext<T>, children?: T[]) => T

// ─── Render context ───────────────────────────────────────────────────────────

export interface RenderContext<T = any> {
  form: FormDefinition
  engine: RendererEngine<T>
  render(node: FormNode): T
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export interface RendererPlugin<T = any> {
  name: string
  install(engine: RendererEngine<T>): void
}

// ─── Engine interface (used by plugins to avoid circular import) ──────────────

export interface RendererEngine<T = any> {
  use(plugin: RendererPlugin<T>): this
  registerField(type: string, fn: FieldRenderer<T>): void
  registerContainer(type: string, fn: ContainerRenderer<T>): void
  registerLayout(type: string, fn: LayoutRenderer<T>): void
  registerStatic(type: string, fn: StaticRenderer<T>): void
  render(node: FormNode, ctx?: Partial<RenderContext<T>>): T
  renderForm(form: FormDefinition): any
}
