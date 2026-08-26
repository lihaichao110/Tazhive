import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import type { MermaidProps } from '@ant-design/x'

import { MermaidViewer } from './MermaidViewer'

const { mermaidCalls } = vi.hoisted(() => ({
  mermaidCalls: [] as MermaidProps[],
}))

vi.mock('@ant-design/x', () => ({
  Mermaid: (props: MermaidProps) => {
    mermaidCalls.push(props)
    return <div data-testid="mermaid">{props.children}</div>
  },
}))

describe('MermaidViewer', () => {
  beforeEach(() => {
    mermaidCalls.length = 0
  })

  it('将源码和安全主题配置交给 Ant Design X Mermaid', () => {
    const source = 'graph LR\nA-->B'
    const markup = renderToStaticMarkup(<MermaidViewer source={source} />)

    expect(markup).toContain('Mermaid 图表')
    expect(mermaidCalls).toHaveLength(1)
    expect(mermaidCalls[0]).toMatchObject({
      children: source,
      classNames: {
        graph: expect.any(String),
        code: expect.any(String),
      },
      config: {
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        themeVariables: {
          primaryColor: '#eef2ff',
          fontFamily: "Inter, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif",
        },
      },
      onRenderTypeChange: expect.any(Function),
    })
  })
})
