// ═══ B1：表单级设置往返测试 ═══════════════════════════════════════════════════════
// dslToSchema 把 settings 的新字段（size/disabled/readonly/successMessage/
// successRedirect/showReset/submitText/resetText）写进表单节点 props，schemaToDsl
// 应该能原样读回来——与既有的 labelAlign/labelWidth/submit 同一套往返协议
// （见 src/dsl/schema-adapter.ts 的 buildSchema / parseFormSettings）。
import { describe, it, expect } from 'vitest'
import { dslToSchema, schemaToDsl, DSL_VERSION } from '@/dsl'
import type { FormDefinition, FormSettings } from '@/types/dsl'

function buildFormDef(settings: FormSettings): FormDefinition {
  return {
    version: DSL_VERSION,
    id: 'f',
    name: 'form',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [],
    },
    settings,
  }
}

describe('B1：表单级设置 DSL ⇄ schema 往返', () => {
  it('全部新增设置字段往返后保持不变', () => {
    const settings: FormSettings = {
      labelWidth: 100,
      labelAlign: 'left',
      size: 'large',
      disabled: true,
      readonly: true,
      successMessage: '提交成功',
      successRedirect: '/thank-you',
      showReset: false,
      submitText: '立即提交',
      resetText: '清空重填',
    }
    const def = buildFormDef(settings)
    const schema = dslToSchema(def)
    const roundTripped = schemaToDsl(schema)

    expect(roundTripped.settings).toEqual(settings)
  })

  it('未设置的可选字段保持缺省（不会往回读出多余的键）', () => {
    const settings: FormSettings = { labelWidth: 80, labelAlign: 'top' }
    const def = buildFormDef(settings)
    const roundTripped = schemaToDsl(dslToSchema(def))

    expect(roundTripped.settings.size).toBeUndefined()
    expect(roundTripped.settings.disabled).toBeUndefined()
    expect(roundTripped.settings.readonly).toBeUndefined()
    expect(roundTripped.settings.successMessage).toBeUndefined()
    expect(roundTripped.settings.successRedirect).toBeUndefined()
    expect(roundTripped.settings.showReset).toBeUndefined()
    expect(roundTripped.settings.submitText).toBeUndefined()
    expect(roundTripped.settings.resetText).toBeUndefined()
  })

  it('showReset:false 与「未设置」可区分（false 也要能往返）', () => {
    const def = buildFormDef({ labelWidth: 80, labelAlign: 'top', showReset: false })
    const roundTripped = schemaToDsl(dslToSchema(def))
    expect(roundTripped.settings.showReset).toBe(false)
  })
})
