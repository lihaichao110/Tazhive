import { afterEach, describe, expect, it, vi } from 'vitest'

import { readMessageSelection } from './selection'

class FakeElement {
  parentElement: FakeElement | null = null
  private readonly quotableRoot: FakeElement | null
  private readonly containedElements: readonly FakeElement[]

  constructor(
    quotableRoot: FakeElement | null = null,
    containedElements: readonly FakeElement[] = [],
  ) {
    this.quotableRoot = quotableRoot
    this.containedElements = containedElements
  }

  closest(selector: string): FakeElement | null {
    return selector === '[data-quotable-text]' ? this.quotableRoot : null
  }

  contains(element: FakeElement): boolean {
    return this.containedElements.includes(element)
  }
}

interface SelectionOptions {
  readonly collapsed?: boolean
  readonly endRoot?: FakeElement
  readonly height?: number
  readonly rangeCount?: number
  readonly text?: string
  readonly width?: number
}

// 构造最小 DOM 选区环境，精确覆盖消息边界和无效范围判断。
function installSelection(options: SelectionOptions = {}) {
  const startRoot = new FakeElement()
  const endRoot = options.endRoot ?? startRoot
  const startNode = new FakeElement(startRoot)
  const endNode = new FakeElement(endRoot)
  const container = new FakeElement(null, [startRoot, endRoot])
  const rect = {
    bottom: 40,
    height: options.height ?? 20,
    left: 10,
    right: 110,
    top: 20,
    width: options.width ?? 100,
  } as DOMRect
  const range = {
    endContainer: endNode,
    getBoundingClientRect: vi.fn(() => rect),
    startContainer: startNode,
  }
  const selection = {
    getRangeAt: vi.fn(() => range),
    isCollapsed: options.collapsed ?? false,
    rangeCount: options.rangeCount ?? 1,
    toString: vi.fn(() => options.text ?? '选中的内容'),
  }

  vi.stubGlobal('Element', FakeElement)
  vi.stubGlobal('window', { getSelection: vi.fn(() => selection) })

  return { container: container as unknown as HTMLElement, endRoot, rect, startRoot }
}

describe('readMessageSelection', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('读取同一可引用文本块内的选区', () => {
    const environment = installSelection()

    expect(readMessageSelection(environment.container)).toEqual({
      rect: environment.rect,
      text: '选中的内容',
    })
  })

  it('拒绝跨文本块的选区', () => {
    const endRoot = new FakeElement()
    const environment = installSelection({ endRoot })

    expect(readMessageSelection(environment.container)).toBeNull()
  })

  it.each([
    ['折叠选区', { collapsed: true }],
    ['空白文本', { text: '   ' }],
    ['无尺寸范围', { height: 0, width: 0 }],
    ['多个范围', { rangeCount: 2 }],
  ])('拒绝%s', (_name, options) => {
    const environment = installSelection(options)

    expect(readMessageSelection(environment.container)).toBeNull()
  })
})
