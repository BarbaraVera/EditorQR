import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QrDesignProvider, useQrDesign } from './context/QrDesignContext'
import { QrCanvas } from './components/canvas/QrCanvas'
import type { QrCanvasHandle, DownloadFormat } from './components/canvas/QrCanvas'
import type { QrShape } from './context/QrDesignContext'
import type { GradientType } from 'qr-code-styling'

function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint)
    globalThis.addEventListener('resize', onResize)
    return () => globalThis.removeEventListener('resize', onResize)
  }, [breakpoint])
  return isMobile
}

const inputStyle = (compact?: boolean): React.CSSProperties => ({
  width: '100%',
  padding: compact ? '4px 6px' : '6px 8px',
  borderRadius: 6,
  border: '1px solid #2A3040', background: '#1D2535', color: '#E8EDF5',
  boxSizing: 'border-box',
  fontSize: compact ? 12 : 13,
})

const labelRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
}

const fieldsetStyle = (compact?: boolean): React.CSSProperties => ({
  border: '1px solid #2A3040', borderRadius: 8,
  padding: compact ? 8 : 12,
})

const legendStyle = (compact?: boolean): React.CSSProperties => ({
  padding: '0 4px',
  fontSize: compact ? 11 : 13,
})

const btnStyle = (color: string, compact?: boolean): React.CSSProperties => ({
  flex: 1,
  padding: compact ? '4px 0' : '6px 0',
  borderRadius: 6,
  border: `1px solid ${color}`, background: color, color: '#fff',
  cursor: 'pointer',
  fontSize: compact ? 11 : 12,
  transition: 'filter 0.15s ease, transform 0.15s ease',
})

/* ─── Gradient Controls ────────────────────────────── */

type GradientControlValue = {
  type: GradientType
  rotation?: number
  colorStops: { offset: number; color: string }[]
}

function GradientControl({ label, gradient, onSetGradient, onClear }: {
  label: string
  gradient: GradientControlValue | null
  onSetGradient: (g: GradientControlValue) => void
  onClear: () => void
}) {
  const { t } = useTranslation()
  const enabled = gradient !== null

  return (
    <div style={{ marginTop: 6, padding: 8, background: '#1D2535', borderRadius: 6, border: '1px solid #2A3040' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 6, cursor: 'pointer' }}>
        <input type="checkbox" checked={enabled} onChange={(e) => {
          if (e.target.checked) {
            onSetGradient({
              type: 'linear',
              rotation: 0,
              colorStops: [
                { offset: 0, color: '#ff6b6b' },
                { offset: 1, color: '#4ecdc4' },
              ],
            })
          } else {
            onClear()
          }
        }} />
        {label} {t('controles.gradiente.activar')}
      </label>

      {enabled && gradient && (
        <>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, marginBottom: 4 }}>
            {t('controles.gradiente.tipo')}
            <select value={gradient.type}
              onChange={(e) => onSetGradient({ ...gradient, type: e.target.value as GradientType })}
              style={{ width: 80, padding: '2px 4px', borderRadius: 4, border: '1px solid #2A3040', background: '#131823', color: '#E8EDF5', fontSize: 11 }}>
              <option value="linear">{t('controles.gradiente.lineal')}</option>
              <option value="radial">{t('controles.gradiente.radial')}</option>
            </select>
          </label>

          {gradient.type === 'linear' && (
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, marginBottom: 4 }}>
              {t('controles.gradiente.rotacion')}
              <input type="range" min={0} max={360} step={1} value={gradient.rotation ?? 0}
                onChange={(e) => onSetGradient({ ...gradient, rotation: Number(e.target.value) })}
                style={{ width: 60 }} />
            </label>
          )}

          {[0, 1].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, marginBottom: 2 }}>
              <input type="color" value={gradient.colorStops[i]?.color ?? '#ffffff'}
                onChange={(e) => {
                  const stops = [...gradient.colorStops]
                  while (stops.length < 2) stops.push({ offset: stops.length, color: '#ffffff' })
                  stops[i] = { offset: i === 0 ? 0 : 1, color: e.target.value }
                  onSetGradient({ ...gradient, colorStops: stops })
                }}
                style={{ width: 28, height: 22, border: 'none', cursor: 'pointer', padding: 0 }} />
              <span style={{ fontSize: 10 }}>{i === 0 ? t('controles.gradiente.inicial') : t('controles.gradiente.final')}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

/* ─── Sidebar Controls ─────────────────────────────── */

function Controls({ canvasRef, isMobile }: {
  canvasRef: React.RefObject<QrCanvasHandle | null>
  isMobile: boolean
}) {
  const { t, i18n } = useTranslation()
  const { state, dispatch } = useQrDesign()
  const { colors, shape, logo, logoFilters, backgroundImage, quitarFondo } = state
  const logoFileRef = useRef<HTMLInputElement>(null)
  const bgFileRef = useRef<HTMLInputElement>(null)

  const alternarIdioma = () => {
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es')
  }

  const manejarArchivo = (accion: (url: string) => void) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => accion(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const manejarLogoPlaceholder = () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <rect width="120" height="120" rx="16" fill="#7C5CFC"/>
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="white" font-size="40" font-family="sans-serif" font-weight="bold">LOGO</text>
    </svg>`
    dispatch({ type: 'SET_LOGO_ORIGINAL', payload: `data:image/svg+xml;base64,${btoa(svg)}` })
  }

  const manejarFondoPlaceholder = () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <defs><pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#1D2535"/><rect width="10" height="10" fill="#2A3040"/></pattern></defs>
      <rect width="200" height="200" fill="url(#g)"/>
    </svg>`
    dispatch({ type: 'SET_BACKGROUND_IMAGE', payload: `data:image/svg+xml;base64,${btoa(svg)}` })
  }

  const definirGradiente = (campo: 'primaryGradient' | 'secondaryGradient' | 'backgroundGradient') =>
    (g: GradientControlValue) => {
      dispatch({ type: 'SET_COLORS', payload: { [campo]: g as typeof colors.primaryGradient } })
    }

  const limpiarGradiente = (campo: 'primaryGradient' | 'secondaryGradient' | 'backgroundGradient') => () => {
    dispatch({ type: 'SET_COLORS', payload: { [campo]: null } })
  }

  const botonIdioma = {
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid #2A3040',
    background: 'transparent',
    color: '#E8EDF5',
    cursor: 'pointer' as const,
    fontSize: 12,
    fontWeight: 600 as const,
    transition: 'background 0.15s ease, border-color 0.15s ease',
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 15 : 18, color: '#E8EDF5', fontWeight: 600, letterSpacing: '-0.02em' }}>{t('titulo')}</h2>
        <button onClick={alternarIdioma} style={botonIdioma}>
          {i18n.language === 'es' ? t('selectorIdioma.en') : t('selectorIdioma.es')}
        </button>
      </div>

      <ColorRow label={t('controles.colores.modulos')} color={colors.primary} compact={isMobile}
        onChange={(v) => dispatch({ type: 'SET_COLORS', payload: { primary: v } })} />
      <GradientControl label={t('controles.colores.modulos')} gradient={colors.primaryGradient}
        onSetGradient={definirGradiente('primaryGradient')} onClear={limpiarGradiente('primaryGradient')} />

      <ColorRow label={t('controles.colores.esquinas')} color={colors.secondary} compact={isMobile}
        onChange={(v) => dispatch({ type: 'SET_COLORS', payload: { secondary: v } })} />
      <GradientControl label={t('controles.colores.esquinas')} gradient={colors.secondaryGradient}
        onSetGradient={definirGradiente('secondaryGradient')} onClear={limpiarGradiente('secondaryGradient')} />

      <ColorRow label={t('controles.colores.fondo')} color={colors.background} compact={isMobile}
        onChange={(v) => dispatch({ type: 'SET_COLORS', payload: { background: v } })}
        noMargin />
      <GradientControl label={t('controles.colores.fondo')} gradient={colors.backgroundGradient}
        onSetGradient={definirGradiente('backgroundGradient')} onClear={limpiarGradiente('backgroundGradient')} />

      {/* ── Shape / Forma ── */}
      <fieldset style={fieldsetStyle(isMobile)}>
        <legend style={legendStyle(isMobile)}>{t('controles.forma.titulo')}</legend>
        <select value={shape}
          onChange={(e) => dispatch({ type: 'SET_SHAPE', payload: e.target.value as QrShape })}
          style={inputStyle(isMobile)}>
          <option value="rounded">{t('controles.forma.opciones.redondeado')}</option>
          <option value="square">{t('controles.forma.opciones.cuadrado')}</option>
          <option value="circle">{t('controles.forma.opciones.puntos')}</option>
        </select>
      </fieldset>

      {/* ── Data / Datos QR ── */}
      <fieldset style={fieldsetStyle(isMobile)}>
        <legend style={legendStyle(isMobile)}>{t('controles.datos.titulo')}</legend>
        <input type="text" value={state.qrData}
          onChange={(e) => dispatch({ type: 'SET_QR_DATA', payload: e.target.value })}
          style={inputStyle(isMobile)} />
      </fieldset>

      {/* ── Export Size / Tamaño Exportación ── */}
      <fieldset style={fieldsetStyle(isMobile)}>
        <legend style={legendStyle(isMobile)}>{t('controles.tamanoExportacion.titulo')}</legend>
        <label style={labelRow}>
          <span style={{ fontSize: isMobile ? 12 : 13 }}>{t('controles.tamanoExportacion.ancho')}</span>
          <input type="number" value={state.exportDimensions.width} min={100} max={4000} step={10}
            onChange={(e) => dispatch({ type: 'SET_EXPORT_DIMENSIONS', payload: { width: Number(e.target.value), height: state.exportDimensions.height } })}
            style={{ width: isMobile ? 64 : 80, padding: '3px 5px', borderRadius: 4, border: '1px solid #2A3040', background: '#1D2535', color: '#E8EDF5', fontSize: isMobile ? 12 : 13 }} />
        </label>
        <label style={{ ...labelRow, marginBottom: 0 }}>
          <span style={{ fontSize: isMobile ? 12 : 13 }}>{t('controles.tamanoExportacion.alto')}</span>
          <input type="number" value={state.exportDimensions.height} min={100} max={4000} step={10}
            onChange={(e) => dispatch({ type: 'SET_EXPORT_DIMENSIONS', payload: { width: state.exportDimensions.width, height: Number(e.target.value) } })}
            style={{ width: isMobile ? 64 : 80, padding: '3px 5px', borderRadius: 4, border: '1px solid #2A3040', background: '#1D2535', color: '#E8EDF5', fontSize: isMobile ? 12 : 13 }} />
        </label>
      </fieldset>

      {/* ── Background Image / Fondo ── */}
      <fieldset style={fieldsetStyle(isMobile)}>
        <legend style={legendStyle(isMobile)}>{t('controles.fondo.titulo')}</legend>
        <div style={{ display: 'flex', gap: isMobile ? 6 : 8, marginBottom: isMobile ? 6 : 8 }}>
          <button onClick={manejarFondoPlaceholder} className="btn-hover" style={btnStyle('#3A4050', isMobile)}>{t('controles.fondo.patron')}</button>
          <button onClick={() => bgFileRef.current?.click()} className="btn-hover" style={btnStyle('#7C5CFC', isMobile)}>{t('controles.fondo.subir')}</button>
          {backgroundImage.dataUrl && (
            <button onClick={() => dispatch({ type: 'SET_BACKGROUND_IMAGE', payload: null })}
              className="btn-hover" style={{ ...btnStyle('#FF6B6B', isMobile), flex: 0.5 }}>{t('controles.fondo.limpiar')}</button>
          )}
        </div>
        <input ref={bgFileRef} type="file" accept="image/*"
          onChange={manejarArchivo((url) => dispatch({ type: 'SET_BACKGROUND_IMAGE', payload: url }))}
          style={{ display: 'none' }} />
        {backgroundImage.dataUrl && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: isMobile ? 10 : 11 }}>
            {t('controles.fondo.opacidad')}
            <input type="range" min={0} max={1} step={0.05} value={backgroundImage.opacity}
              onChange={(e) => dispatch({ type: 'SET_BACKGROUND_OPACITY', payload: Number(e.target.value) })}
              style={{ flex: 1 }} />
            <span style={{ width: 24, fontSize: isMobile ? 10 : 11 }}>{Math.round(backgroundImage.opacity * 100)}%</span>
          </label>
        )}
      </fieldset>

      {/* ── Logo ── */}
      <fieldset style={fieldsetStyle(isMobile)}>
        <legend style={legendStyle(isMobile)}>{t('controles.logo.titulo')}</legend>
        <div style={{ display: 'flex', gap: isMobile ? 6 : 8, marginBottom: isMobile ? 6 : 8 }}>
          <button onClick={manejarLogoPlaceholder} className="btn-hover" style={btnStyle('#7C5CFC', isMobile)}>{t('controles.logo.placeholder')}</button>
          <button onClick={() => logoFileRef.current?.click()} className="btn-hover" style={btnStyle('#00D4AA', isMobile)}>{t('controles.logo.subir')}</button>
        </div>
        <input ref={logoFileRef} type="file" accept="image/*"
          onChange={manejarArchivo((url) => dispatch({ type: 'SET_LOGO_ORIGINAL', payload: url }))}
          style={{ display: 'none' }} />
        {logo.dataUrl && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <img src={logo.dataUrl} alt="logo" style={{ width: isMobile ? 28 : 36, height: isMobile ? 28 : 36, borderRadius: 4, objectFit: 'cover' }} />
              <button onClick={() => {
                dispatch({ type: 'SET_LOGO_ORIGINAL', payload: null })
                dispatch({ type: 'SET_QUITAR_FONDO', payload: false })
              }}
                className="btn-hover" style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #FF6B6B', background: 'transparent', color: '#FF6B6B', cursor: 'pointer', fontSize: isMobile ? 10 : 11 }}>
                {t('controles.logo.limpiar')}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <label style={{ fontSize: isMobile ? 10 : 11, display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                {t('controles.logo.escala')}
                <input type="range" min={0.1} max={state.logoScaleMax || 0.8} step={0.05} value={logo.scale}
                  onChange={(e) => dispatch({ type: 'SET_LOGO_SCALE', payload: Number(e.target.value) })}
                  style={{ flex: 1 }} />
              </label>
            </div>
            <label style={{ fontSize: isMobile ? 10 : 11, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <input type="checkbox" checked={quitarFondo}
                onChange={(e) => dispatch({ type: 'SET_QUITAR_FONDO', payload: e.target.checked })} />
              {t('controles.logo.quitarFondo')}
            </label>

            {/* ── Logo Filters / Filtros ── */}
            <div style={{ padding: isMobile ? 6 : 8, background: '#1D2535', borderRadius: 6, border: '1px solid #2A3040' }}>
              <div style={{ fontSize: isMobile ? 10 : 11, marginBottom: 6, color: '#8892A8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{t('controles.logo.filtros')}</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
                <label style={{ fontSize: isMobile ? 10 : 11, display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                  <input type="checkbox" checked={logoFilters.grayscale}
                    onChange={(e) => dispatch({ type: 'SET_LOGO_FILTERS', payload: { grayscale: e.target.checked } })} />
                  {t('controles.logo.gris')}
                </label>
                <label style={{ fontSize: isMobile ? 10 : 11, display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                  <input type="checkbox" checked={logoFilters.invert}
                    onChange={(e) => dispatch({ type: 'SET_LOGO_FILTERS', payload: { invert: e.target.checked } })} />
                  {t('controles.logo.invertir')}
                </label>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: isMobile ? 10 : 11, marginBottom: 3 }}>
                {t('controles.logo.brillo')}
                <input type="range" min={-1} max={1} step={0.05} value={logoFilters.brightness}
                  onChange={(e) => dispatch({ type: 'SET_LOGO_FILTERS', payload: { brightness: Number(e.target.value) } })}
                  style={{ flex: 1 }} />
                <span style={{ width: 22, fontSize: isMobile ? 10 : 11, color: '#8892A8' }}>{logoFilters.brightness.toFixed(2)}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: isMobile ? 10 : 11 }}>
                {t('controles.logo.contraste')}
                <input type="range" min={-1} max={1} step={0.05} value={logoFilters.contrast}
                  onChange={(e) => dispatch({ type: 'SET_LOGO_FILTERS', payload: { contrast: Number(e.target.value) } })}
                  style={{ flex: 1 }} />
                <span style={{ width: 22, fontSize: isMobile ? 10 : 11, color: '#8892A8' }}>{logoFilters.contrast.toFixed(2)}</span>
              </label>
            </div>
          </div>
        )}
      </fieldset>

      {/* ── Download / Descargar ── */}
      <fieldset style={fieldsetStyle(isMobile)}>
        <legend style={legendStyle(isMobile)}>{t('controles.descarga.titulo')}</legend>
        <div style={{ display: 'flex', gap: isMobile ? 6 : 8 }}>
          <BotonDescarga formato="png" canvasRef={canvasRef} etiqueta={t('controles.descarga.png')} color="#00D4AA" compacto={isMobile} />
          <BotonDescarga formato="jpeg" canvasRef={canvasRef} etiqueta={t('controles.descarga.jpg')} color="#7C5CFC" compacto={isMobile} />
        </div>
      </fieldset>
    </>
  )
}

function BotonDescarga({ formato, canvasRef, etiqueta, color, compacto }: {
  formato: DownloadFormat
  canvasRef: React.RefObject<QrCanvasHandle | null>
  etiqueta: string
  color: string
  compacto?: boolean
}) {
  return (
    <button onClick={() => canvasRef.current?.download(formato)}
      className="btn-hover"
      style={{
        flex: 1, padding: compacto ? '5px 0' : '8px 0', borderRadius: 6,
        border: `1px solid ${color}`, background: color, color: '#fff',
        cursor: 'pointer', fontSize: compacto ? 12 : 13, fontWeight: 600,
        transition: 'filter 0.15s ease, transform 0.15s ease',
      }}>
      {etiqueta}
    </button>
  )
}

function ColorRow({ label, color, compact, onChange, noMargin }: {
  label: string
  color: string
  compact?: boolean
  onChange: (v: string) => void
  noMargin?: boolean
}) {
  return (
    <label style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: noMargin ? 0 : 4,
    }}>
      <span style={{ fontSize: compact ? 12 : 13 }}>{label}</span>
      <input type="color" value={color}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: compact ? 32 : 40,
          height: compact ? 24 : 30,
          border: 'none', cursor: 'pointer',
        }} />
    </label>
  )
}

/* ─── Playground Layout ────────────────────────────── */

function Playground() {
  const canvasRef = useRef<QrCanvasHandle>(null)
  const isMobile = useIsMobile()

  return (
    <div className="flex flex-col md:flex-row h-dvh w-full overflow-hidden bg-deep font-sans">
      <main className="order-2 md:order-none flex-1 flex items-center justify-center p-3 md:p-5 overflow-auto bg-grid">
        <QrCanvas ref={canvasRef} />
      </main>
      <aside className="order-1 md:order-none max-h-[40vh] md:max-h-none md:h-full md:w-[380px] overflow-y-auto shrink-0 p-3 md:p-5 bg-elevated text-text-primary md:border-l border-t md:border-t-0 border-border flex flex-col gap-4">
        <Controls canvasRef={canvasRef} isMobile={isMobile} />
      </aside>
    </div>
  )
}

/* ─── Root ─────────────────────────────────────────── */

export function App() {
  return (
    <QrDesignProvider>
      <Playground />
    </QrDesignProvider>
  )
}
