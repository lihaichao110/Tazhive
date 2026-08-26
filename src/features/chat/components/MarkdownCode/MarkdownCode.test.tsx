import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import type { CodeHighlighterProps } from '@ant-design/x'
import type { ComponentProps } from '@ant-design/x-markdown'

import { MarkdownCode, MarkdownPre } from './MarkdownCode'

const { highlighterCalls } = vi.hoisted(() => ({
  highlighterCalls: [] as CodeHighlighterProps[],
}))

vi.mock('@ant-design/x', () => ({
  CodeHighlighter: (props: CodeHighlighterProps) => {
    highlighterCalls.push(props)
    return <div data-language={props.lang}>{props.children}</div>
  },
}))

const domNode = {} as ComponentProps['domNode']

describe('MarkdownCode', () => {
  beforeEach(() => {
    highlighterCalls.length = 0
  })

  it.each([
    ['js', 'javascript'],
    ['ts title=example.ts', 'typescript'],
    ['shell', 'bash'],
    ['html', 'markup'],
    ['yml', 'yaml'],
  ])('将 %s 规范化为 %s', (lang, expected) => {
    renderToStaticMarkup(
      <MarkdownCode block domNode={domNode} lang={lang} streamStatus="done">
        {'const value = 1\n'}
      </MarkdownCode>,
    )

    expect(highlighterCalls[0]).toMatchObject({
      children: 'const value = 1\n',
      lang: expected,
    })
  })

  it('将未知语言原样交给 CodeHighlighter', () => {
    renderToStaticMarkup(
      <MarkdownCode block domNode={domNode} lang="custom-lang" streamStatus="loading">
        code
      </MarkdownCode>,
    )

    expect(highlighterCalls[0]?.lang).toBe('custom-lang')
  })

  it('未标注语言时使用 CodeHighlighter 的无语言降级模式', () => {
    renderToStaticMarkup(
      <MarkdownCode block domNode={domNode} streamStatus="done">
        plain code
      </MarkdownCode>,
    )

    expect(highlighterCalls[0]).toMatchObject({ children: 'plain code' })
    expect(highlighterCalls[0]?.lang).toBeUndefined()
  })

  it('行内代码保持原生 code 且不调用 CodeHighlighter', () => {
    const markup = renderToStaticMarkup(
      <MarkdownCode domNode={domNode} streamStatus="done">
        const value = 1
      </MarkdownCode>,
    )

    expect(markup).toBe('<code>const value = 1</code>')
    expect(highlighterCalls).toHaveLength(0)
  })

  it('pre 适配器仅展开子节点', () => {
    const markup = renderToStaticMarkup(
      <MarkdownPre domNode={domNode} streamStatus="done">
        <span>code</span>
      </MarkdownPre>,
    )

    expect(markup).toBe('<span>code</span>')
  })
})
