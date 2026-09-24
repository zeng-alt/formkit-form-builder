// ═══ E2：reason → i18n key 映射单测 ═══════════════════════════════════════════
import { describe, expect, it } from 'vitest'
import { historyReasonI18nKey } from '@/builder/history-reasons'

describe('historyReasonI18nKey', () => {
  it('已登记的 reason 映射到对应 key', () => {
    expect(historyReasonI18nKey('delete')).toBe('delete')
    expect(historyReasonI18nKey('structure-delete')).toBe('delete')
    expect(historyReasonI18nKey('structure-dnd')).toBe('dnd')
    expect(historyReasonI18nKey('form-label-width')).toBe('formLabelWidth')
    expect(historyReasonI18nKey('batch-edit')).toBe('batchEdit')
  })

  it('未登记 / 空 reason 落到 default', () => {
    expect(historyReasonI18nKey(undefined)).toBe('default')
    expect(historyReasonI18nKey('')).toBe('default')
    expect(historyReasonI18nKey('some-future-task-d-reason')).toBe('default')
  })
})
