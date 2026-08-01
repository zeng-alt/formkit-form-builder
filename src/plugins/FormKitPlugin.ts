import type { RendererPlugin, RenderContext } from "../types/renderer";
import type { RendererEngine } from "../engine/RendererEngine";
import type { SchemaNode } from "../dsl";
import { getElementTypeDefs, registerBuiltinElementTypes } from "../dsl";

// ═══ FormKit 渲染插件（注册表驱动） ════════════════════════════════════════════
// 每个 DSL 元素类型注册一条渲染器，统一由 ElementTypeDef.toSchema 产出 FormKit schema。

export class FormKitPlugin implements RendererPlugin<SchemaNode> {
  name = "formkit";

  install(engine: RendererEngine<SchemaNode>): void {
    registerBuiltinElementTypes();

    for (const def of getElementTypeDefs()) {
      const renderer = (node: never, ctx: RenderContext<SchemaNode>, children?: SchemaNode[]): SchemaNode =>
        def.toSchema(node as never, { form: ctx.form, children })

      if (def.category === "field") engine.registerField(def.type, renderer as never)
      else if (def.category === "container") engine.registerContainer(def.type, renderer as never)
      else if (def.category === "layout") engine.registerLayout(def.type, renderer as never)
      else engine.registerStatic(def.type, renderer as never)
    }
  }
}
