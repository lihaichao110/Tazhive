export type MermaidImageExportErrorCode =
  | 'canvas-unavailable'
  | 'file-save-failed'
  | 'invalid-svg-size'
  | 'png-encode-failed'
  | 'svg-decode-failed'
  | 'unsupported-svg-content'

// 为页面保留失败阶段，同时通过 cause 保存原始异常供开发环境诊断。
export class MermaidImageExportError extends Error {
  readonly code: MermaidImageExportErrorCode

  constructor(code: MermaidImageExportErrorCode, message: string, cause?: unknown) {
    super(message, { cause })
    this.name = 'MermaidImageExportError'
    this.code = code
  }
}

// 将技术失败阶段转换为用户可理解且可操作的提示。
export function getMermaidImageErrorMessage(error: unknown): string {
  if (!(error instanceof MermaidImageExportError)) return '图片生成失败，请重试'

  switch (error.code) {
    case 'invalid-svg-size':
      return '图形尺寸异常，无法生成图片'
    case 'file-save-failed':
      return '图片已生成，但浏览器未能开始下载，请检查下载设置'
    case 'canvas-unavailable':
    case 'png-encode-failed':
    case 'svg-decode-failed':
    case 'unsupported-svg-content':
      return '当前浏览器不支持将此图形导出为 PNG'
  }
}
