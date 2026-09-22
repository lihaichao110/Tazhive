// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'

import { createDeepSeekProvider, type DeepSeekMessage } from './deepSeekProvider'

function createProvider() {
  return createDeepSeekProvider(
    { apiKey: 'test-key', baseUrl: 'https://example.com', modelName: 'deepseek-chat' },
    { onError: () => undefined, onSuccess: () => undefined },
  )
}

describe('DeepSeek 回答来源', () => {
  it('合并正文增量并在结束帧保存来源，DONE 不会清空来源', () => {
    const provider = createProvider()
    const headers = new Headers({ 'content-type': 'text/event-stream' })
    const first = provider.transformMessage({
      chunk: { data: '{"choices":[{"delta":{"role":"assistant","content":"你"}}]}' },
      chunks: [],
      status: 'updating',
      responseHeaders: headers,
    })
    const second = provider.transformMessage({
      originMessage: first,
      chunk: { data: '{"choices":[{"delta":{"content":"好"}}]}' },
      chunks: [],
      status: 'updating',
      responseHeaders: headers,
    })
    const finished = provider.transformMessage({
      originMessage: second,
      chunk: {
        data: JSON.stringify({
          choices: [{ delta: {}, finish_reason: 'stop' }],
          references: [
            {
              source_type: 'wiki',
              title: '客服知识库',
              url: '/api/v1/documents/wiki-1/chunks/0',
              snippet: '银行客服电话摘要',
              document_id: 'wiki-1',
              chunk_index: 0,
            },
            {
              source_type: 'web',
              title: '官方公告',
              url: 'https://example.com/notice',
              snippet: '公告摘要',
              document_id: null,
              chunk_index: null,
            },
          ],
        }),
      },
      chunks: [],
      status: 'success',
      responseHeaders: headers,
    })
    const done = provider.transformMessage({
      originMessage: finished,
      chunk: { data: '[DONE]' },
      chunks: [],
      status: 'success',
      responseHeaders: headers,
    })

    expect(done.content).toBe('你好')
    expect(done.references).toEqual([
      expect.objectContaining({ source_type: 'wiki', title: '客服知识库' }),
      expect.objectContaining({ source_type: 'web', title: '官方公告' }),
    ])
  })

  it.each([
    ['非法 JSON', '{bad json'],
    ['未知来源类型', '{"choices":[{"delta":{}}],"references":[{"source_type":"other"}]}'],
    ['非数组来源', '{"choices":[{"delta":{}}],"references":{}}'],
  ])('%s 不会中断回答或清空已有来源', (_label, data) => {
    const existing: DeepSeekMessage = {
      role: 'assistant',
      content: '回答',
      references: [
        {
          source_type: 'web',
          title: '已保存来源',
          url: 'https://example.com',
          snippet: '',
          document_id: null,
          chunk_index: null,
        },
      ],
    }

    expect(
      createProvider().transformMessage({
        originMessage: existing,
        chunk: { data },
        chunks: [],
        status: 'updating',
        responseHeaders: new Headers({ 'content-type': 'text/event-stream' }),
      }).references,
    ).toEqual(existing.references)
  })
})
