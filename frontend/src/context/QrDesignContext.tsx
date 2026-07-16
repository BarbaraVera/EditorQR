import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react'
import type { Gradient } from 'qr-code-styling'

/* ─── Types ─────────────────────────────────────────── */

export type QrShape = 'square' | 'rounded' | 'circle'

export interface QrColors {
  primary: string
  secondary: string
  background: string
  primaryGradient: Gradient | null
  secondaryGradient: Gradient | null
  backgroundGradient: Gradient | null
}

export interface LogoState {
  dataUrl: string | null
  scale: number
  left: number
  top: number
}

export interface LogoFiltersState {
  grayscale: boolean
  invert: boolean
  brightness: number
  contrast: number
}

export interface BackgroundImageState {
  dataUrl: string | null
  opacity: number
}

export interface QrDimensions {
  width: number
  height: number
}

export interface QrLayer {
  id: string
  name: string
  type: 'qr' | 'logo' | 'frame' | 'text'
  visible: boolean
  locked: boolean
  opacity: number
}

export interface QrDesignState {
  qrData: string
  shape: QrShape
  colors: QrColors
  logo: LogoState
  logoFilters: LogoFiltersState
  backgroundImage: BackgroundImageState
  dimensions: QrDimensions
  exportDimensions: QrDimensions
  margin: number
  layers: QrLayer[]
  activeLayerId: string | null
  logoScaleMax: number
}

/* ─── Initial state ─────────────────────────────────── */

const initialState: QrDesignState = {
  qrData: 'https://example.com',
  shape: 'rounded',
  colors: {
    primary: '#000000',
    secondary: '#000000',
    background: '#ffffff',
    primaryGradient: null,
    secondaryGradient: null,
    backgroundGradient: null,
  },
  logo: {
    dataUrl: null,
    scale: 0.3,
    left: 0,
    top: 0,
  },
  logoFilters: {
    grayscale: false,
    invert: false,
    brightness: 0,
    contrast: 0,
  },
  backgroundImage: {
    dataUrl: null,
    opacity: 0.3,
  },
  dimensions: {
    width: 300,
    height: 300,
  },
  exportDimensions: {
    width: 400,
    height: 400,
  },
  margin: 10,
  layers: [
    { id: 'qr-1', name: 'QR Code', type: 'qr', visible: true, locked: false, opacity: 1 },
    { id: 'logo-1', name: 'Logo', type: 'logo', visible: true, locked: false, opacity: 1 },
  ],
  activeLayerId: 'qr-1',
  logoScaleMax: 1,
}

/* ─── Actions ───────────────────────────────────────── */

export type QrDesignAction =
  | { type: 'SET_QR_DATA'; payload: string }
  | { type: 'SET_SHAPE'; payload: QrShape }
  | { type: 'SET_COLORS'; payload: Partial<QrColors> }
  | { type: 'SET_LOGO_DATA'; payload: string | null }
  | { type: 'SET_LOGO_SCALE'; payload: number }
  | { type: 'SET_LOGO_POSITION'; payload: { left: number; top: number } }
  | { type: 'SET_LOGO_FILTERS'; payload: Partial<LogoFiltersState> }
  | { type: 'SET_BACKGROUND_IMAGE'; payload: string | null }
  | { type: 'SET_BACKGROUND_OPACITY'; payload: number }
  | { type: 'SET_DIMENSIONS'; payload: QrDimensions }
  | { type: 'SET_EXPORT_DIMENSIONS'; payload: QrDimensions }
  | { type: 'SET_MARGIN'; payload: number }
  | { type: 'ADD_LAYER'; payload: QrLayer }
  | { type: 'REMOVE_LAYER'; payload: string }
  | { type: 'REORDER_LAYERS'; payload: QrLayer[] }
  | { type: 'SET_ACTIVE_LAYER'; payload: string | null }
  | { type: 'TOGGLE_LAYER_VISIBILITY'; payload: string }
  | { type: 'TOGGLE_LAYER_LOCK'; payload: string }
  | { type: 'SET_LAYER_OPACITY'; payload: { id: string; opacity: number } }
  | { type: 'SET_LOGO_SCALE_MAX'; payload: number }

/* ─── Reducer ───────────────────────────────────────── */

function qrDesignReducer(
  state: QrDesignState,
  action: QrDesignAction,
): QrDesignState {
  switch (action.type) {
    case 'SET_QR_DATA':
      return { ...state, qrData: action.payload }

    case 'SET_SHAPE':
      return { ...state, shape: action.payload }

    case 'SET_COLORS':
      return { ...state, colors: { ...state.colors, ...action.payload } }

    case 'SET_LOGO_DATA':
      return { ...state, logo: { ...state.logo, dataUrl: action.payload } }

    case 'SET_LOGO_SCALE':
      return { ...state, logo: { ...state.logo, scale: action.payload } }

    case 'SET_LOGO_SCALE_MAX':
      return { ...state, logoScaleMax: action.payload }

    case 'SET_LOGO_POSITION':
      return { ...state, logo: { ...state.logo, ...action.payload } }

    case 'SET_LOGO_FILTERS':
      return { ...state, logoFilters: { ...state.logoFilters, ...action.payload } }

    case 'SET_BACKGROUND_IMAGE':
      return { ...state, backgroundImage: { ...state.backgroundImage, dataUrl: action.payload } }

    case 'SET_BACKGROUND_OPACITY':
      return { ...state, backgroundImage: { ...state.backgroundImage, opacity: action.payload } }

    case 'SET_DIMENSIONS':
      return { ...state, dimensions: action.payload }

    case 'SET_EXPORT_DIMENSIONS':
      return { ...state, exportDimensions: action.payload }

    case 'SET_MARGIN':
      return { ...state, margin: action.payload }

    case 'ADD_LAYER':
      return { ...state, layers: [...state.layers, action.payload] }

    case 'REMOVE_LAYER':
      return {
        ...state,
        layers: state.layers.filter((l) => l.id !== action.payload),
        activeLayerId:
          state.activeLayerId === action.payload
            ? (state.layers[0]?.id ?? null)
            : state.activeLayerId,
      }

    case 'REORDER_LAYERS':
      return { ...state, layers: action.payload }

    case 'SET_ACTIVE_LAYER':
      return { ...state, activeLayerId: action.payload }

    case 'TOGGLE_LAYER_VISIBILITY':
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === action.payload ? { ...l, visible: !l.visible } : l,
        ),
      }

    case 'TOGGLE_LAYER_LOCK':
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === action.payload ? { ...l, locked: !l.locked } : l,
        ),
      }

    case 'SET_LAYER_OPACITY':
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === action.payload.id
            ? { ...l, opacity: action.payload.opacity }
            : l,
        ),
      }

    default:
      return state
  }
}

/* ─── Context ───────────────────────────────────────── */

interface QrDesignContextValue {
  state: QrDesignState
  dispatch: Dispatch<QrDesignAction>
}

const QrDesignContext = createContext<QrDesignContextValue | null>(null)

/* ─── Provider ──────────────────────────────────────── */

export function QrDesignProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(qrDesignReducer, initialState)

  return (
    <QrDesignContext.Provider value={{ state, dispatch }}>
      {children}
    </QrDesignContext.Provider>
  )
}

/* ─── Hook ──────────────────────────────────────────── */

export function useQrDesign(): QrDesignContextValue {
  const ctx = useContext(QrDesignContext)
  if (!ctx) {
    throw new Error('useQrDesign must be used within a QrDesignProvider')
  }
  return ctx
}
