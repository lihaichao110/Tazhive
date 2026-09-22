const UUID_BYTE_LENGTH = 16
const UUID_VERSION_INDEX = 6
const UUID_VARIANT_INDEX = 8

/**
 * 创建 UUID v4；非安全上下文中的 WebView 无法使用 randomUUID，
 * 此时回退到仍可用的 getRandomValues，并保留标准版本位与变体位。
 */
export function createUuid(): string {
  const cryptoProvider = (globalThis as { readonly crypto?: Crypto }).crypto
  if (typeof cryptoProvider?.randomUUID === 'function') return cryptoProvider.randomUUID()
  if (typeof cryptoProvider?.getRandomValues !== 'function') {
    throw new Error('当前浏览器不支持安全随机数生成，请升级浏览器后重试')
  }

  const bytes = cryptoProvider.getRandomValues(new Uint8Array(UUID_BYTE_LENGTH))
  bytes[UUID_VERSION_INDEX] = ((bytes[UUID_VERSION_INDEX] ?? 0) & 0x0f) | 0x40
  bytes[UUID_VARIANT_INDEX] = ((bytes[UUID_VARIANT_INDEX] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))

  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`
}
