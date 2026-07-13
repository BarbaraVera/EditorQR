import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QrDesignProvider, useQrDesign } from './QrDesignContext'

function wrapper({ children }: { children: ReactNode }) {
  return <QrDesignProvider>{children}</QrDesignProvider>
}

describe('QrDesignContext', () => {
  it('provides default state values', () => {
    const { result } = renderHook(() => useQrDesign(), { wrapper })

    expect(result.current.state.qrData).toBe('https://example.com')
    expect(result.current.state.shape).toBe('rounded')
    expect(result.current.state.colors).toEqual({
      primary: '#000000',
      secondary: '#000000',
      background: '#ffffff',
      primaryGradient: null,
      secondaryGradient: null,
      backgroundGradient: null,
    })
    expect(result.current.state.logoFilters).toEqual({
      grayscale: false,
      invert: false,
      brightness: 0,
      contrast: 0,
    })
    expect(result.current.state.backgroundImage).toEqual({
      dataUrl: null,
      opacity: 0.3,
    })
    expect(result.current.state.dimensions).toEqual({ width: 300, height: 300 })
    expect(result.current.state.exportDimensions).toEqual({ width: 400, height: 400 })
    expect(result.current.state.margin).toBe(10)
    expect(result.current.state.layers).toHaveLength(2)
    expect(result.current.state.activeLayerId).toBe('qr-1')
  })

  it('throws when used outside provider', () => {
    expect(() => renderHook(() => useQrDesign())).toThrow(
      'useQrDesign must be used within a QrDesignProvider',
    )
  })

  it('sets qr data', () => {
    const { result } = renderHook(() => useQrDesign(), { wrapper })
    act(() => { result.current.dispatch({ type: 'SET_QR_DATA', payload: 'https://new.url' }) })
    expect(result.current.state.qrData).toBe('https://new.url')
  })

  it('sets shape', () => {
    const { result } = renderHook(() => useQrDesign(), { wrapper })
    act(() => { result.current.dispatch({ type: 'SET_SHAPE', payload: 'square' }) })
    expect(result.current.state.shape).toBe('square')
  })

  it('updates colors partially', () => {
    const { result } = renderHook(() => useQrDesign(), { wrapper })
    act(() => { result.current.dispatch({ type: 'SET_COLORS', payload: { primary: '#ff0000' } }) })
    expect(result.current.state.colors.primary).toBe('#ff0000')
    expect(result.current.state.colors.secondary).toBe('#000000')
  })

  it('sets logo data', () => {
    const { result } = renderHook(() => useQrDesign(), { wrapper })
    act(() => { result.current.dispatch({ type: 'SET_LOGO_DATA', payload: 'data:image/png;base64,abc' }) })
    expect(result.current.state.logo.dataUrl).toBe('data:image/png;base64,abc')
  })

  it('sets logo position', () => {
    const { result } = renderHook(() => useQrDesign(), { wrapper })
    act(() => { result.current.dispatch({ type: 'SET_LOGO_POSITION', payload: { left: 100, top: 200 } }) })
    expect(result.current.state.logo.left).toBe(100)
    expect(result.current.state.logo.top).toBe(200)
  })

  it('sets dimensions', () => {
    const { result } = renderHook(() => useQrDesign(), { wrapper })
    act(() => { result.current.dispatch({ type: 'SET_DIMENSIONS', payload: { width: 600, height: 600 } }) })
    expect(result.current.state.dimensions).toEqual({ width: 600, height: 600 })
  })

  it('sets export dimensions', () => {
    const { result } = renderHook(() => useQrDesign(), { wrapper })
    act(() => { result.current.dispatch({ type: 'SET_EXPORT_DIMENSIONS', payload: { width: 800, height: 800 } }) })
    expect(result.current.state.exportDimensions).toEqual({ width: 800, height: 800 })
  })

  it('sets active layer', () => {
    const { result } = renderHook(() => useQrDesign(), { wrapper })
    act(() => { result.current.dispatch({ type: 'SET_ACTIVE_LAYER', payload: 'logo-1' }) })
    expect(result.current.state.activeLayerId).toBe('logo-1')
  })

  it('toggles layer visibility', () => {
    const { result } = renderHook(() => useQrDesign(), { wrapper })
    act(() => { result.current.dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', payload: 'logo-1' }) })
    const layer = result.current.state.layers.find((l) => l.id === 'logo-1')
    expect(layer?.visible).toBe(false)
  })

  it('toggles layer lock', () => {
    const { result } = renderHook(() => useQrDesign(), { wrapper })
    act(() => { result.current.dispatch({ type: 'TOGGLE_LAYER_LOCK', payload: 'qr-1' }) })
    const layer = result.current.state.layers.find((l) => l.id === 'qr-1')
    expect(layer?.locked).toBe(true)
  })

  it('sets layer opacity', () => {
    const { result } = renderHook(() => useQrDesign(), { wrapper })
    act(() => { result.current.dispatch({ type: 'SET_LAYER_OPACITY', payload: { id: 'qr-1', opacity: 0.5 } }) })
    const layer = result.current.state.layers.find((l) => l.id === 'qr-1')
    expect(layer?.opacity).toBe(0.5)
  })

  it('removes layer and resets active layer if needed', () => {
    const { result } = renderHook(() => useQrDesign(), { wrapper })
    act(() => { result.current.dispatch({ type: 'SET_ACTIVE_LAYER', payload: 'logo-1' }) })
    act(() => { result.current.dispatch({ type: 'REMOVE_LAYER', payload: 'logo-1' }) })
    expect(result.current.state.layers.find((l) => l.id === 'logo-1')).toBeUndefined()
    expect(result.current.state.activeLayerId).toBe('qr-1')
  })

  it('adds a layer', () => {
    const { result } = renderHook(() => useQrDesign(), { wrapper })
    const newLayer = { id: 'frame-1', name: 'Frame', type: 'frame' as const, visible: true, locked: false, opacity: 1 }
    act(() => { result.current.dispatch({ type: 'ADD_LAYER', payload: newLayer }) })
    expect(result.current.state.layers).toHaveLength(3)
    expect(result.current.state.layers[2]).toEqual(newLayer)
  })

  it('sets logo filters', () => {
    const { result } = renderHook(() => useQrDesign(), { wrapper })
    act(() => { result.current.dispatch({ type: 'SET_LOGO_FILTERS', payload: { grayscale: true, brightness: 0.5 } }) })
    expect(result.current.state.logoFilters.grayscale).toBe(true)
    expect(result.current.state.logoFilters.invert).toBe(false)
    expect(result.current.state.logoFilters.brightness).toBe(0.5)
  })

  it('sets background image', () => {
    const { result } = renderHook(() => useQrDesign(), { wrapper })
    act(() => { result.current.dispatch({ type: 'SET_BACKGROUND_IMAGE', payload: 'data:image/png;base64,bg' }) })
    expect(result.current.state.backgroundImage.dataUrl).toBe('data:image/png;base64,bg')
  })

  it('sets background opacity', () => {
    const { result } = renderHook(() => useQrDesign(), { wrapper })
    act(() => { result.current.dispatch({ type: 'SET_BACKGROUND_OPACITY', payload: 0.7 }) })
    expect(result.current.state.backgroundImage.opacity).toBe(0.7)
  })
})
