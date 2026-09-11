const SIMPLE_ESCAPE_VALUES: Readonly<Record<string, string>> = {
  '"': '"',
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
}

const UNICODE_ESCAPE_LENGTH = 4
const UNICODE_ESCAPE_PATTERN = /^[\da-f]{4}$/i

// 增量解码 JSON 字符串正文，只返回边界完整的稳定前缀，并在未转义引号处停止。
export function decodeStreamingJsonString(source: string): string {
  let decoded = ''

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (character === '"') break
    if (character !== '\\') {
      decoded += character
      continue
    }

    const escapedCharacter = source[index + 1]
    if (escapedCharacter === undefined) break

    const simpleEscapeValue = SIMPLE_ESCAPE_VALUES[escapedCharacter]
    if (simpleEscapeValue !== undefined) {
      decoded += simpleEscapeValue
      index += 1
      continue
    }

    if (escapedCharacter !== 'u') {
      // 非法转义只有在边界完整后才按原文保留，避免流式阶段静默吞掉内容。
      decoded += `\\${escapedCharacter}`
      index += 1
      continue
    }

    const unicodeStart = index + 2
    const unicodeEscape = source.slice(unicodeStart, unicodeStart + UNICODE_ESCAPE_LENGTH)
    if (unicodeEscape.length < UNICODE_ESCAPE_LENGTH) break
    if (!UNICODE_ESCAPE_PATTERN.test(unicodeEscape)) {
      decoded += '\\u'
      index += 1
      continue
    }

    decoded += String.fromCharCode(Number.parseInt(unicodeEscape, 16))
    index += UNICODE_ESCAPE_LENGTH + 1
  }

  return decoded
}
