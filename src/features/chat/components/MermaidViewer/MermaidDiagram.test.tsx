import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { MermaidProps } from '@ant-design/x'

const { mermaidCalls } = vi.hoisted(() => ({
  mermaidCalls: [] as MermaidProps[],
}))

vi.mock('@ant-design/x', () => ({
  Mermaid: (props: MermaidProps) => {
    mermaidCalls.push(props)
    return <div>{props.children}</div>
  },
}))

import { MermaidDiagram } from './MermaidDiagram'

describe('MermaidDiagram', () => {
  it('使用安全主题且不渲染内置工具栏', () => {
    const source = 'graph LR\nA-->B'
    renderToStaticMarkup(<MermaidDiagram source={source} />)

    expect(mermaidCalls.at(-1)).toMatchObject({
      children: source,
      header: null,
      classNames: { graph: expect.any(String) },
      config: {
        startOnLoad: false,
        securityLevel: 'strict',
        htmlLabels: false,
        theme: 'base',
        themeVariables: {
          primaryColor: '#eef2ff',
          fontFamily: "Inter, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif",
        },
      },
    })
  })
})
