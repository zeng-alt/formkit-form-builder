import type {
  FormNode,
  FieldNode,
  ContainerNode,
  LayoutNode,
  StaticNode,
  FormDefinition,
} from '../types/dsl'
import type {
  RendererEngine as IRendererEngine,
  RendererPlugin,
  RenderContext,
  FieldRenderer,
  ContainerRenderer,
  LayoutRenderer,
  StaticRenderer,
} from '../types/renderer'

export class RendererEngine<T = any> implements IRendererEngine<T> {
  private fieldMap = new Map<string, FieldRenderer<T>>()
  private containerMap = new Map<string, ContainerRenderer<T>>()
  private layoutMap = new Map<string, LayoutRenderer<T>>()
  private staticMap = new Map<string, StaticRenderer<T>>()
  private plugins = new Map<string, RendererPlugin<T>>()

  // ─── Plugin registration ──────────────────────────────────────────────────

  use(plugin: RendererPlugin<T>): this {
    if (this.plugins.has(plugin.name)) {
      console.warn(`[RendererEngine] Plugin "${plugin.name}" is already installed, skipping.`)
      return this
    }
    plugin.install(this)
    this.plugins.set(plugin.name, plugin)
    return this
  }

  // ─── Node type registration ───────────────────────────────────────────────

  registerField(type: string, fn: FieldRenderer<T>): void {
    this.fieldMap.set(type, fn)
  }

  registerContainer(type: string, fn: ContainerRenderer<T>): void {
    this.containerMap.set(type, fn)
  }

  registerLayout(type: string, fn: LayoutRenderer<T>): void {
    this.layoutMap.set(type, fn)
  }

  registerStatic(type: string, fn: StaticRenderer<T>): void {
    this.staticMap.set(type, fn)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  /**
   * Render a single node.
   * Optionally accepts a partial context — useful for isolated renders.
   */
  render(node: FormNode, ctx: RenderContext<T>): T {
    const children =
      node.category !== 'field' && (node as any).children
        ? (node as any).children.map((c: FormNode) => this.render(c, ctx))
        : undefined

    switch (node.category) {
      case 'field': {
        const renderer = this.fieldMap.get(node.type)
        if (!renderer) throw new MissingRendererError('field', node.type)
        return renderer(node as FieldNode, ctx, children)
      }
      case 'container': {
        const renderer = this.containerMap.get(node.type)
        if (!renderer) throw new MissingRendererError('container', node.type)
        return renderer(node as ContainerNode, ctx, children)
      }
      case 'layout': {
        const renderer = this.layoutMap.get(node.type)
        if (!renderer) throw new MissingRendererError('layout', node.type)
        return renderer(node as LayoutNode, ctx, children)
      }
      case 'static': {
        const renderer = this.staticMap.get(node.type)
        if (!renderer) throw new MissingRendererError('static', node.type)
        return renderer(node as StaticNode, ctx, children)
      }
      default:
        throw new Error(`[RendererEngine] Unknown node category: "${(node as any).category}"`)
    }
  }

  /**
   * Render all top-level nodes of a FormDefinition.
   */
  renderForm(form: FormDefinition): any {
    const ctx = this.makeContext(form)
    return {
      id: form.id,
      name: form.name,
      settings: form.settings,
      nodes: form.root.children.map((node) => this.render(node, ctx)),
    }
  }

  // ─── Context factory ──────────────────────────────────────────────────────

  makeContext(form: FormDefinition): RenderContext<T> {
    const ctx: RenderContext<T> = {
      form,
      engine: this,
      render: (node: FormNode) => this.render(node, ctx),
    }
    return ctx
  }
}

// ─── Error types ──────────────────────────────────────────────────────────────

export class MissingRendererError extends Error {
  constructor(kind: string, type: string) {
    super(`[RendererEngine] No ${kind} renderer registered for type "${type}"`)
    this.name = 'MissingRendererError'
  }
}
