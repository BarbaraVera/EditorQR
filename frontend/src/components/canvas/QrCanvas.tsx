import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as fabric from 'fabric'
import QRCodeStyling from 'qr-code-styling'
import type { DotType, Gradient } from 'qr-code-styling'
import { useQrDesign } from '../../context/QrDesignContext'
import type { QrShape } from '../../context/QrDesignContext'

const MAX_LOGO_RATIO = 0.40

export type DownloadFormat = 'png' | 'jpeg'

export interface QrCanvasHandle {
  download: (format: DownloadFormat, quality?: number) => void
}

function shapeToQrType(shape: QrShape): DotType {
  switch (shape) {
    case 'circle': return 'dots'
    case 'square': return 'square'
    default: return 'rounded'
  }
}

type DotsOptions = {
  type?: DotType
  color?: string
  gradient?: Gradient
}

type CornersOptions = {
  color?: string
  gradient?: Gradient
}

type BackgroundOptions = {
  color?: string
  gradient?: Gradient
}

function dotsOptions(colors: {
  primary: string
  primaryGradient: Gradient | null
  secondary: string
  secondaryGradient: Gradient | null
  background: string
  backgroundGradient: Gradient | null
}, shape: QrShape): {
  dotsOptions: DotsOptions
  cornersSquareOptions: CornersOptions
  backgroundOptions: BackgroundOptions
} {
  const dotType = shapeToQrType(shape)

  const dotsOpts: DotsOptions = { type: dotType }
  if (colors.primaryGradient) {
    dotsOpts.gradient = colors.primaryGradient
  } else {
    dotsOpts.color = colors.primary
  }

  const cornersOpts: CornersOptions = {}
  if (colors.secondaryGradient) {
    cornersOpts.gradient = colors.secondaryGradient
  } else {
    cornersOpts.color = colors.secondary
  }

  const bgOpts: BackgroundOptions = {}
  if (colors.backgroundGradient) {
    bgOpts.gradient = colors.backgroundGradient
  } else {
    bgOpts.color = colors.background
  }

  return { dotsOptions: dotsOpts, cornersSquareOptions: cornersOpts, backgroundOptions: bgOpts }
}

function buildFilters(logoFilters: {
  grayscale: boolean
  invert: boolean
  brightness: number
  contrast: number
}) {
  const filters: fabric.filters.BaseFilter<string, Record<string, any>>[] = []

  if (logoFilters.grayscale) {
    filters.push(new fabric.filters.Grayscale())
  }
  if (logoFilters.invert) {
    filters.push(new fabric.filters.Invert())
  }
  if (logoFilters.brightness !== 0) {
    filters.push(new fabric.filters.Brightness({ brightness: logoFilters.brightness }))
  }
  if (logoFilters.contrast !== 0) {
    filters.push(new fabric.filters.Contrast({ contrast: logoFilters.contrast }))
  }

  return filters
}

export const QrCanvas = forwardRef<QrCanvasHandle, object>(function QrCanvas(_props, ref) {
  const { t } = useTranslation()
  const { state, dispatch } = useQrDesign()
  const { qrData, shape, colors, dimensions, margin, logo, logoFilters, backgroundImage, quitarFondo } = state

  const [logoAdvertencia, setLogoAdvertencia] = useState<string | null>(null)
  const [procesandoFondo, setProcesandoFondo] = useState(false)
  const stateRef = useRef(state)
  stateRef.current = state

  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<fabric.Canvas | null>(null)
  const qrImageRef = useRef<fabric.Image | null>(null)
  const logoImageRef = useRef<fabric.Image | null>(null)
  const bgImageRef = useRef<fabric.Image | null>(null)
  const isInternalUpdate = useRef(false)
  const syncIdRef = useRef(0)

  useImperativeHandle(ref, () => ({
    async download(format, quality) {
      const s = stateRef.current

      const exportW = s.exportDimensions.width
      const exportH = s.exportDimensions.height
      const margin = s.margin
      const totalW = exportW + margin * 2
      const totalH = exportH + margin * 2

      /* Generate QR at full export size */
      const qrOpts = dotsOptions(s.colors, s.shape)
      const qrCode = new QRCodeStyling({
        width: exportW,
        height: exportH,
        data: s.qrData,
        qrOptions: {
          errorCorrectionLevel: s.logo.dataUrl ? 'H' : 'M',
        },
        ...qrOpts,
      })
      const blob = await qrCode.getRawData('png')
      if (!(blob instanceof Blob)) return
      const qrUrl = URL.createObjectURL(blob)

      /* Offscreen canvas at export resolution */
      const tempEl = document.createElement('canvas')
      tempEl.width = totalW
      tempEl.height = totalH
      const tempCanvas = new fabric.Canvas(tempEl, { backgroundColor: '#ffffff' })

      try {
        /* Background image */
        if (s.backgroundImage.dataUrl) {
          const bgImg = await fabric.Image.fromURL(s.backgroundImage.dataUrl)
          bgImg.set({
            left: 0, top: 0,
            scaleX: totalW / (bgImg.width ?? 1),
            scaleY: totalH / (bgImg.height ?? 1),
            opacity: s.backgroundImage.opacity,
            selectable: false, evented: false,
          })
          tempCanvas.add(bgImg)
          tempCanvas.sendObjectToBack(bgImg)
        }

        /* QR image */
        const qrImg = await fabric.Image.fromURL(qrUrl)
        qrImg.set({ left: margin, top: margin, selectable: false, evented: false })
        tempCanvas.add(qrImg)
        tempCanvas.sendObjectToBack(qrImg)

        /* Logo */
        if (s.logo.dataUrl) {
          const logoImg = await fabric.Image.fromURL(s.logo.dataUrl)
          const filters = buildFilters(s.logoFilters)
          if (filters.length > 0) {
            logoImg.filters = filters
            logoImg.applyFilters()
          }
          const scaleRatio = s.logo.scale * (exportW / s.dimensions.width)
          logoImg.set({
            left: exportW / 2 + margin,
            top: exportH / 2 + margin,
            originX: 'center', originY: 'center',
            scaleX: scaleRatio, scaleY: scaleRatio,
            selectable: false, evented: false,
            imageSmoothing: true,
          })
          tempCanvas.add(logoImg)
        }

        tempCanvas.renderAll()

        const dataUrl = tempCanvas.toDataURL({
          format,
          quality: quality ?? (format === 'jpeg' ? 0.92 : undefined),
          multiplier: 1,
        })
        if (!dataUrl) return

        const link = document.createElement('a')
        link.download = `qrcode.${format === 'jpeg' ? 'jpg' : 'png'}`
        link.href = dataUrl
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } finally {
        tempCanvas.dispose()
        URL.revokeObjectURL(qrUrl)
      }
    },
  }), [])

  /* ── Init Fabric canvas + event listeners + initial sync ──── */
  useEffect(() => {
    const el = canvasElRef.current
    if (!el) return

    const canvas = new fabric.Canvas(el, {
      width: dimensions.width + margin * 2,
      height: dimensions.height + margin * 2,
      backgroundColor: '#ffffff',

    })

    fabricRef.current = canvas

    /* ── Canvas → State event handlers ──────────────── */

    canvas.on('selection:created', () => {
      if (isInternalUpdate.current) return
      dispatch({ type: 'SET_ACTIVE_LAYER', payload: 'qr-1' })
    })

    canvas.on('selection:cleared', () => {
      if (isInternalUpdate.current) return
      dispatch({ type: 'SET_ACTIVE_LAYER', payload: null })
    })

    /* ── Initial sync ──────────────────────────────── */
    const syncId = ++syncIdRef.current
    syncStateToCanvas(canvas, syncId).catch(console.error)

    return () => {
      canvas.dispose()
      fabricRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Re-sync on state changes ──────────────────────── */
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    if (isInternalUpdate.current) {
      isInternalUpdate.current = false
      return
    }

    const syncId = ++syncIdRef.current

    syncStateToCanvas(canvas, syncId).catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    qrData, shape, colors,
    dimensions.width, dimensions.height, margin,
    logo.dataUrl, logo.scale,
    logoFilters, backgroundImage.dataUrl, backgroundImage.opacity,
  ])

  async function procesarRemocionFondo() {
    const s = stateRef.current
    if (!s.logo.originalDataUrl) return

    setProcesandoFondo(true)
    try {
      const blobResp = await fetch('/api/remove-bg', {
        method: 'POST',
        body: (() => {
          const parts = s.logo.originalDataUrl!.split(',')
          const byteString = atob(parts[1]!)
          const ab = new ArrayBuffer(byteString.length)
          const ia = new Uint8Array(ab)
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
          const blob = new Blob([ab], { type: 'image/png' })
          const fd = new FormData()
          fd.append('file', blob, 'logo.png')
          return fd
        })(),
      })
      if (!blobResp.ok) return

      const resultBlob = await blobResp.blob()
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          dispatch({ type: 'SET_LOGO_DATA', payload: reader.result })
        }
        setProcesandoFondo(false)
      }
      reader.readAsDataURL(resultBlob)
    } catch {
      setProcesandoFondo(false)
    }
  }

  function restaurarLogoOriginal() {
    const s = stateRef.current
    if (s.logo.originalDataUrl) {
      dispatch({ type: 'SET_LOGO_DATA', payload: s.logo.originalDataUrl })
    }
  }

  useEffect(() => {
    if (!logo.originalDataUrl) return
    if (quitarFondo) {
      procesarRemocionFondo()
    } else {
      restaurarLogoOriginal()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quitarFondo])

  async function syncStateToCanvas(canvas: fabric.Canvas, syncId: number) {
    try {
      /* Resize canvas if needed */
      const expectedW = dimensions.width + margin * 2
      const expectedH = dimensions.height + margin * 2
      if (canvas.width !== expectedW || canvas.height !== expectedH) {
        canvas.setWidth(expectedW)
        canvas.setHeight(expectedH)
      }

      /* Prevent canvas event handlers from dispatching during programmatic mutations */
      isInternalUpdate.current = true

      /* ── Background image layer (lowest) ──────────────── */
      if (bgImageRef.current) {
        canvas.remove(bgImageRef.current)
        bgImageRef.current.dispose()
        bgImageRef.current = null
      }

      if (backgroundImage.dataUrl) {
        if (syncId !== syncIdRef.current) return

        const bgImg = await fabric.Image.fromURL(backgroundImage.dataUrl)

        if (syncId !== syncIdRef.current) {
          bgImg.dispose()
          return
        }

        bgImg.set({
          left: 0,
          top: 0,
          scaleX: expectedW / (bgImg.width ?? 1),
          scaleY: expectedH / (bgImg.height ?? 1),
          opacity: backgroundImage.opacity,
          selectable: false,
          evented: false,
        })
        canvas.add(bgImg)
        canvas.sendObjectToBack(bgImg)
        bgImageRef.current = bgImg
      }

      /* ── QR base image ────────────────────────────────── */
      const qrOpts = dotsOptions(colors, shape)

      const qrCode = new QRCodeStyling({
        width: dimensions.width,
        height: dimensions.height,
        data: qrData,
        qrOptions: {
          errorCorrectionLevel: logo.dataUrl ? 'H' : 'M',
        },
        ...qrOpts,
      })

      const blob = await qrCode.getRawData('png')

      /* Stale guard */
      if (syncId !== syncIdRef.current) return
      if (!(blob instanceof Blob)) {
        return
      }

      const qrUrl = URL.createObjectURL(blob)

      if (syncId !== syncIdRef.current) {
        URL.revokeObjectURL(qrUrl)
        return
      }

      if (qrImageRef.current) {
        canvas.remove(qrImageRef.current)
        qrImageRef.current.dispose()
        qrImageRef.current = null
      }

      const img = await fabric.Image.fromURL(qrUrl)
      img.set({
        left: margin,
        top: margin,
        selectable: false,
        evented: false,
      })
      canvas.add(img)
      canvas.sendObjectToBack(img)
      qrImageRef.current = img

      URL.revokeObjectURL(qrUrl)

      /* ── Logo overlay + filters ───────────────────────── */
      if (logoImageRef.current) {
        canvas.remove(logoImageRef.current)
        logoImageRef.current.dispose()
        logoImageRef.current = null
      }

      if (logo.dataUrl) {
        if (syncId !== syncIdRef.current) return

        const logoImg = await fabric.Image.fromURL(logo.dataUrl)

        if (syncId !== syncIdRef.current) {
          logoImg.dispose()
          return
        }

        const filters = buildFilters(logoFilters)
        if (filters.length > 0) {
          logoImg.filters = filters
          logoImg.applyFilters()
        }

        const escalaMax = MAX_LOGO_RATIO * expectedW / (logoImg.width ?? 1)
        const escalaSegura = Math.min(logo.scale, escalaMax)
        dispatch({ type: 'SET_LOGO_SCALE_MAX', payload: escalaMax })

        logoImg.set({
          left: expectedW / 2,
          top: expectedH / 2,
          originX: 'center',
          originY: 'center',
          scaleX: escalaSegura,
          scaleY: escalaSegura,
          selectable: false,
          evented: false,
        })
        canvas.add(logoImg)
        logoImageRef.current = logoImg

        const anchoEscalado = escalaSegura * (logoImg.width ?? 1)
        const limiteMaximo = MAX_LOGO_RATIO * expectedW
        setLogoAdvertencia(anchoEscalado > limiteMaximo * 1 ? t('advertencia.logoGrande') : null)
        if (escalaSegura !== logo.scale) {
          dispatch({ type: 'SET_LOGO_SCALE', payload: escalaSegura })
        }
      } else {
        setLogoAdvertencia(null)
      }

      canvas.renderAll()
    } finally {
      if (syncId === syncIdRef.current) {
        isInternalUpdate.current = false
      }
    }
  }

  const canvasW = dimensions.width + margin * 2
  const canvasH = dimensions.height + margin * 2

  return (
    <>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <canvas
          ref={canvasElRef}
          width={canvasW}
          height={canvasH}
          className="max-w-full max-h-full"
          style={{ border: '1px solid #ccc', borderRadius: 8 }}
        />
        {procesandoFondo && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600,
          }}>
            {t('controles.logo.procesando')}
          </div>
        )}
      </div>
      {logoAdvertencia && (
        <p style={{ color: '#f59e0b', fontSize: 12, margin: '6px 0 0', textAlign: 'center' }}>
          {logoAdvertencia}
        </p>
      )}
    </>
  )
})
