import { renderHook, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useFarms } from '@/lib/hooks/useFarms'

const mockResponse = (data: unknown, ok = true) =>
  Promise.resolve({
    ok,
    json: async () => data,
  }) as Promise<Response>

describe('useFarms', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('loads farms on mount', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockReturnValueOnce(mockResponse([{ id: '1', name: 'Farm A' }]))

    const { result } = renderHook(() => useFarms())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.farms?.length).toBe(1)
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/farms')
  })

  it('creates a farm optimistically', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock
      .mockReturnValueOnce(mockResponse([]))
      .mockReturnValueOnce(mockResponse({ id: '2', name: 'Farm B' }))

    const { result } = renderHook(() => useFarms())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.create({ name: 'Farm B' })
    })

    expect(result.current.farms?.[0]?.name).toBe('Farm B')
  })

  it('removes a farm optimistically', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock
      .mockReturnValueOnce(mockResponse([{ id: '1', name: 'Farm A' }]))
      .mockReturnValueOnce(mockResponse({ id: '1', name: 'Farm A' }))

    const { result } = renderHook(() => useFarms())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.remove('1')
    })

    expect(result.current.farms?.length).toBe(0)
  })
})
