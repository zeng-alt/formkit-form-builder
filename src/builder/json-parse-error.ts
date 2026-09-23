// ═══ H9：把 JSON.parse 抛出的原始错误翻译成好懂的提示 ═══════════════════════════
// 不同浏览器的 JSON.parse 报错格式不一样：
// - Firefox：`JSON.parse: unexpected character at line 2 column 3 of the JSON data`
//   （直接给出行列）；
// - Chrome/V8：`Unexpected token } in JSON at position 10`（只有从 0 开始的字符偏移，
//   要自己按换行符数出行列）；
// - 其它引擎（如 Safari）可能两者都没有。
// 纯函数，不依赖 i18n / DOM，方便单测覆盖三种情况；ImportExportModal.vue 负责把
// 结果拼成界面文案。

export interface JsonErrorLocation {
  /** 从 1 开始 */
  line: number
  /** 从 1 开始 */
  column: number
}

/** 从 JSON.parse 的错误信息里解析出出错位置；两种已知格式都解析不出时返回 null。 */
export function parseJsonErrorLocation(
  message: string,
  jsonText: string,
): JsonErrorLocation | null {
  const lineColMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i)
  if (lineColMatch) {
    const line = Number(lineColMatch[1])
    const column = Number(lineColMatch[2])
    if (Number.isFinite(line) && Number.isFinite(column)) return { line, column }
  }

  const positionMatch = message.match(/position\s+(\d+)/i)
  if (positionMatch) {
    const pos = Number(positionMatch[1])
    if (Number.isFinite(pos) && pos >= 0 && pos <= jsonText.length) {
      // 按偏移量数出行列：从 0 数到 pos 之间有几个换行符决定行号，
      // 列号是 pos 与最近一个换行符之间的距离（都从 1 开始）
      let line = 1
      let lastNewlineIndex = -1
      for (let i = 0; i < pos; i++) {
        if (jsonText[i] === '\n') {
          line++
          lastNewlineIndex = i
        }
      }
      const column = pos - lastNewlineIndex
      return { line, column }
    }
  }

  return null
}

export interface JsonParseErrorInfo {
  /** 原始错误信息，作为次要描述展示 */
  message: string
  /** 解析出的出错位置；解析不出时为 null，界面不展示位置提示 */
  location: JsonErrorLocation | null
}

/** 组装错误信息 + 位置，供界面拼出「JSON 格式有误」+「第 X 行第 Y 列附近」的提示 */
export function describeJsonParseError(error: unknown, jsonText: string): JsonParseErrorInfo {
  const message = error instanceof Error ? error.message : String(error)
  return { message, location: parseJsonErrorLocation(message, jsonText) }
}
