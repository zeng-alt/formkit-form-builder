// ═══ 数据表格画布：占位示例数据 ═══════════════════════════════════════════════
// buildSampleRows 是纯函数（不依赖 i18n / 外部状态），按列来源元素类型（或 render
// 字符串兜底）生成展示用的占位数据，类型名以 src/elements 注册表里的实际值为准
// （naiveSwitch/naiveRate/naiveDateTime/naiveCascader/naiveTreeSelect）。
import { describe, expect, it } from 'vitest'
import { buildSampleRows } from '../utils'
import type { DataTableColumn } from '../types'
import type { FieldNode } from '@/types/dsl'

function col(key: string, render: string, element?: Partial<FieldNode>): DataTableColumn {
  return {
    key,
    title: `列-${key}`,
    render,
    element: element ? ({ category: 'field', type: render, ...element } as FieldNode) : undefined,
  }
}

describe('buildSampleRows', () => {
  it('按列类型归类生成对应形态的占位值', () => {
    const columns: DataTableColumn[] = [
      col('sw', 'naiveSwitch'),
      col('rate', 'naiveRate'),
      col('color', 'color'),
      col('num', 'number'),
      col('slider', 'range'),
      col('date', 'date'),
      col('time', 'time'),
      col('dt', 'naiveDateTime'),
      col('email', 'email'),
      col('url', 'url'),
      col('tel', 'tel'),
      col('text', 'text'),
    ]
    const rows = buildSampleRows(columns, 3)
    expect(rows).toHaveLength(3)

    expect(rows.map((r) => r.sw)).toEqual([true, false, true])
    expect(rows.map((r) => r.rate)).toEqual([3, 4, 5])
    expect(rows.map((r) => r.color)).toEqual(['#a277ff', '#22c55e', '#f59e0b'])
    expect(rows.map((r) => r.num)).toEqual([128, 64, 256])
    expect(rows.map((r) => r.slider)).toEqual([128, 64, 256])
    expect(rows.map((r) => r.date)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03'])
    expect(rows.map((r) => r.time)).toEqual(['09:30', '14:00', '18:45'])
    expect(rows.map((r) => r.dt)).toEqual([
      '2026-01-01 09:30',
      '2026-01-02 14:00',
      '2026-01-03 18:45',
    ])
    expect(rows.map((r) => r.email)).toEqual([
      'user1@example.com',
      'user2@example.com',
      'user3@example.com',
    ])
    expect(rows.map((r) => r.url)).toEqual([
      'https://example.com/1',
      'https://example.com/2',
      'https://example.com/3',
    ])
    expect(rows.map((r) => r.tel)).toEqual(['138 0000 0001', '138 0000 0002', '138 0000 0003'])
    expect(rows.map((r) => r.text)).toEqual(['列-text 1', '列-text 2', '列-text 3'])
  })

  it('select/radio/checkbox/cascader/tree：有 options 取第 i 项 label，无 options 回退 A/B/C', () => {
    const withOptions = col('sel', 'select', {
      options: ['选项一', '选项二'] as unknown as FieldNode['options'],
    })
    const withoutOptions = col('radio', 'radio')
    const rows = buildSampleRows([withOptions, withoutOptions], 3)

    expect(rows[0]!.sel).toBe('选项一')
    expect(rows[1]!.sel).toBe('选项二')

    expect(rows.map((r) => r.radio)).toEqual(['A', 'B', 'C'])
  })

  it('缺 key 的列跳过，不写入行', () => {
    const rows = buildSampleRows([{ key: '', title: '无 key', render: 'text' }], 1)
    expect(rows[0]).toEqual({})
  })
})
