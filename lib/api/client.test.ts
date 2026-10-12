import { afterEach, vi } from 'vitest'
import { api, ApiError } from './client'

afterEach(() => vi.unstubAllGlobals())

it('turns non-2xx API responses into typed errors', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Try again' } }), {
        status: 500,
      })
    )
  )
  await expect(api.get('/transactions')).rejects.toMatchObject({
    name: 'ApiError',
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Try again',
  } satisfies Partial<ApiError>)
})
