import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { getColSpan, rebalanceRowSpans, setColSpan } from '@/utils/dnd/grid'

// setColSpan 是纯函数（返回新对象，不改入参）：画布 DnD 操作的节点常是 dslToSchema
// 缓存出来的共享对象，原地改写会污染缓存。调用方必须把返回值写回自己持有的数组，
// 丢弃返回值等于这次宽度调整静默失效。
describe('setColSpan', () => {
  it('返回新对象，不改动入参', () => {
    const item = Object.freeze({ outerClass: 'col-span-6 mt-1' })
    const next = setColSpan(item, 4)
    expect(next).not.toBe(item)
    expect(next.outerClass).toBe('col-span-4 mt-1')
    expect(item.outerClass).toBe('col-span-6 mt-1')
  })

  it('rebalanceRowSpans 把结果写回数组下标，节点本身不被改动', () => {
    const a = Object.freeze({ outerClass: 'col-span-8' })
    const b = Object.freeze({ outerClass: 'col-span-8' })
    const values: unknown[] = [a, b]
    rebalanceRowSpans(values, 12)
    expect(getColSpan(values[0]) + getColSpan(values[1])).toBeLessThanOrEqual(12)
    expect(a.outerClass).toBe('col-span-8')
  })

  it('源码中不存在丢弃 setColSpan 返回值的调用', () => {
    const root = join(__dirname, '../../..')
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) {
          if (name !== '__tests__' && name !== 'node_modules') walk(full)
          continue
        }
        if (!/\.(ts|vue)$/.test(name)) continue
        readFileSync(full, 'utf8')
          .split('\n')
          .forEach((line, i) => {
            // 语句级调用（行首直接调用、或箭头函数体直接返回给 forEach 丢弃）
            if (/^\s*setColSpan\(|forEach\(\s*\(?[\w\s,]*\)?\s*=>\s*setColSpan\(/.test(line))
              offenders.push(`${full}:${i + 1}`)
          })
      }
    }
    walk(root)
    // 健康检查：确实扫到了调用点（防止路径写错导致空扫描恒通过）
    const callSites = readFileSync(join(root, 'utils/dnd/commit.ts'), 'utf8').match(/setColSpan\(/g)
    expect(callSites?.length ?? 0).toBeGreaterThan(3)
    expect(offenders).toEqual([])
  })
})
