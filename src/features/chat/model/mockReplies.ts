export const MOCK_REPLY_DELAY_MS = 800

// 关键词匹配的兜底话术，仅用于本地演示，不接真实接口。
export function buildMockReply(userText: string): string {
  if (/图|mermaid|画图/i.test(userText)) {
    return '游客模式暂不支持生成图片和视频，请登录后再试'
  }
  if (/你好|hello|hi/i.test(userText)) {
    return '你好😊，有什么可以帮你的吗？'
  }
  return '这是一条模拟回复：当前为演示页面，仅本地生成固定话术。'
}
