/** @vitest-environment happy-dom */

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { AppRouteOutlet } from './AppRouteOutlet'

let root: ReturnType<typeof createRoot> | undefined

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

describe('AppRouteOutlet', () => {
  it('页面切换等待期间展示统一 Loading，完成后渲染目标页面', async () => {
    let finishLoading: () => void = () => undefined
    const loadingGate = new Promise<void>((resolve) => {
      finishLoading = resolve
    })
    const router = createMemoryRouter(
      [
        {
          Component: AppRouteOutlet,
          children: [
            { index: true, Component: () => <p>聊天首页</p> },
            {
              path: 'next',
              loader: () => loadingGate,
              Component: () => <p>目标页面</p>,
            },
          ],
        },
      ],
      { initialEntries: ['/'] },
    )
    const container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => root?.render(<RouterProvider router={router} />))

    let navigation: Promise<void> | undefined
    await act(async () => {
      navigation = router.navigate('/next')
    })
    expect(container.textContent).toContain('小塔正在赶来…')
    expect(container.querySelector('[role="status"]')).not.toBeNull()

    await act(async () => {
      finishLoading()
      await navigation
    })
    expect(container.textContent).toContain('目标页面')
  })
})
