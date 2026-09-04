// @vitest-environment happy-dom

import { act } from 'react'
import { AxiosError, type AxiosAdapter } from 'axios'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpErrorMessageBridge } from './HttpErrorMessageBridge'

import { createHttpClient } from '@/shared/api'

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }))

vi.mock('antd', () => ({
  App: {
    useApp: () => ({ message: { error: showError } }),
  },
}))

let host: HTMLDivElement | undefined
let root: ReturnType<typeof createRoot> | undefined

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  host = undefined
  root = undefined
  showError.mockReset()
})

describe('HttpErrorMessageBridge', () => {
  it('将归一化后的后端错误弹出为全局消息，并在卸载时停止上报', async () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    act(() => root?.render(<HttpErrorMessageBridge />))

    const adapter: AxiosAdapter = async (config) => {
      const response = {
        data: { detail: '文件格式不支持' },
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: {},
        config,
      }
      throw new AxiosError('request failed', 'ERR_BAD_REQUEST', config, undefined, response)
    }

    await expect(createHttpClient().post('/documents', undefined, { adapter })).rejects.toThrow(
      '文件格式不支持',
    )
    expect(showError).toHaveBeenCalledWith({
      content: '文件格式不支持',
      key: 'http-error:文件格式不支持',
    })

    act(() => root?.unmount())
    await expect(createHttpClient().post('/documents', undefined, { adapter })).rejects.toThrow(
      '文件格式不支持',
    )
    expect(showError).toHaveBeenCalledTimes(1)
    root = undefined
  })
})
