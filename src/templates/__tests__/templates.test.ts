// ═══ B2：表单模板 ═══════════════════════════════════════════════════════════════
// 每个模板都应：id 唯一、build() 产出可被 dslToSchema 正常转换的定义、字段数量与
// 元数据一致、文案走 i18n（不是硬编码字符串）。
import { describe, it, expect } from 'vitest'
import { dslToSchema } from '@/dsl'
import zhMessages from '@/i18n/zh'
import type { FormNode } from '@/types/dsl'
import { FORM_TEMPLATES } from '../index'

// useFormBuilderI18n() 的 t() 必须在组件 setup() 内调用（inject 依赖当前组件实例）；
// 这里脱离组件树，直接按 key 路径读生产用的 zh 文案，验证模板文案确实走 i18n
// （而不是硬编码），做法与 i18n/context.ts 的 getByPath 等价。
function t(key: string): string {
  const value = key.split('.').reduce<unknown>((acc, part) => (acc as any)?.[part], zhMessages)
  return typeof value === 'string' ? value : key
}

function countFields(nodes: FormNode[]): number {
  let count = 0
  for (const node of nodes) {
    if (node.category === 'field') count += 1
    const children = (node as { children?: FormNode[] }).children
    if (Array.isArray(children)) count += countFields(children)
  }
  return count
}

describe('B2：表单模板', () => {
  it('5 个模板，id 各不相同', () => {
    expect(FORM_TEMPLATES).toHaveLength(5)
    const ids = new Set(FORM_TEMPLATES.map((tpl) => tpl.id))
    expect(ids.size).toBe(5)
  })

  it.each(FORM_TEMPLATES.map((tpl) => [tpl.id, tpl] as const))(
    '%s：build() 产出的定义可正常转换为 schema，字段数与描述都不为空',
    (_id, tpl) => {
      const def = tpl.build(t)

      // 名称 / 描述走 i18n，不是没翻译到的裸 key
      expect(t(tpl.nameKey)).not.toBe(tpl.nameKey)
      expect(t(tpl.descriptionKey)).not.toBe(tpl.descriptionKey)
      expect(def.name).toBe(t(tpl.nameKey))

      // 字段数量与卡片上展示的元数据一致
      expect(countFields(def.root.children)).toBe(tpl.fieldCount)

      // 每个字段都有 name（能提交数据）与非空 label
      const walk = (nodes: FormNode[]) => {
        for (const node of nodes) {
          if (node.category === 'field') {
            expect(node.name).toBeTruthy()
            expect(node.label).toBeTruthy()
          }
          const children = (node as { children?: FormNode[] }).children
          if (Array.isArray(children)) walk(children)
        }
      }
      walk(def.root.children)

      // 能正常产出 FormKit schema，不抛错（覆盖到 card 分组等容器节点）
      expect(() => dslToSchema(def)).not.toThrow()
    },
  )

  it('两次调用 build() 互不共享节点引用（可安全连续应用/撤销）', () => {
    const tpl = FORM_TEMPLATES[0]!
    const first = tpl.build(t)
    const second = tpl.build(t)
    expect(first).not.toBe(second)
    expect(first.id).not.toBe(second.id)
    expect(first.root.children[0]).not.toBe(second.root.children[0])
  })
})
