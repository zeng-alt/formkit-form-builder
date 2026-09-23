import { describe, expect, it } from 'vitest'
import { describeJsonParseError, parseJsonErrorLocation } from '@/builder/json-parse-error'

describe('parseJsonErrorLocation', () => {
  it('Chrome/V8 格式（只有 position）：按偏移量换算成行列', () => {
    const jsonText = '{\n  "a": 1,\n  "b": ,\n}'
    // V8 报错格式："Unexpected token , in JSON at position 19"
    const pos = jsonText.indexOf(',\n}') + 1 // 指向第 3 行那个非法逗号后的位置
    const message = `Unexpected token } in JSON at position ${pos}`
    const loc = parseJsonErrorLocation(message, jsonText)
    expect(loc).not.toBeNull()
    // 第 3 行（前两行各一个 \n），列号 = pos 与上一个换行符的距离
    expect(loc!.line).toBe(3)
  })

  it('position 为 0 时也能正确换算为第 1 行第 1 列', () => {
    const jsonText = 'not json'
    const message = 'Unexpected token o in JSON at position 0'
    expect(parseJsonErrorLocation(message, jsonText)).toEqual({ line: 1, column: 1 })
  })

  it('Firefox 格式（line L column C）：直接读出行列', () => {
    const message = 'JSON.parse: unexpected character at line 2 column 3 of the JSON data'
    expect(parseJsonErrorLocation(message, '{\n x }')).toEqual({ line: 2, column: 3 })
  })

  it('两种格式都解析不出时返回 null', () => {
    const message = 'JSON Parse error: Unexpected token }'
    expect(parseJsonErrorLocation(message, '{}}')).toBeNull()
  })

  it('position 超出文本长度时视为解析失败，返回 null（避免算出无意义的行列）', () => {
    const message = 'Unexpected end of JSON input at position 999'
    expect(parseJsonErrorLocation(message, '{}')).toBeNull()
  })
})

describe('describeJsonParseError', () => {
  it('真实 JSON.parse 抛错时能配上原始错误信息与位置', () => {
    const jsonText = '{"a":1,}'
    let caught: unknown
    try {
      JSON.parse(jsonText)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(Error)
    const info = describeJsonParseError(caught, jsonText)
    expect(info.message).toEqual((caught as Error).message)
    // 当前运行时（V8）的报错带位置信息，应当能解析出来
    expect(info.location).not.toBeNull()
  })

  it('非 Error 类型的异常也能兜底转成字符串', () => {
    const info = describeJsonParseError('boom', 'irrelevant')
    expect(info.message).toBe('boom')
    expect(info.location).toBeNull()
  })
})
