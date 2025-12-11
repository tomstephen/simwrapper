type RGBA = [number, number, number, number]
type RGB = [number, number, number]

type CategoricalMapping = {
  column: string
  scheme?: string
  include?: (string | number | boolean | null)[]
  exclude?: (string | number | boolean | null)[]
}

type QuantitativeMapping = {
  column: string
  range: [number, number]
}

type QuantitativeColorMapping = {
  column: string
  colorRange?: [string, string] // e.g., ['#ffffcc', '#006837']
  scheme?: string // for sequential schemes like 'YlGn'
}

type StyleMapping = CategoricalMapping | QuantitativeMapping | QuantitativeColorMapping

type LayerStyle = {
  fillColor?: StyleMapping
  lineColor?: StyleMapping
  lineWidth?: StyleMapping
  pointRadius?: StyleMapping
  fillHeight?: StyleMapping
  filter?: StyleMapping
}

type LayerConfigLite = {
  table?: string
  geometry?: string
  style?: LayerStyle
}

type BuildArgs = {
  features: Array<{ properties: any; geometry: any }>
  layers: Record<string, LayerConfigLite>
  defaults?: {
    fillColor?: string
    lineColor?: string
    lineWidth?: number
    pointRadius?: number
    fillHeight?: number
  }
}

type BuildResult = {
  fillColors: Uint8ClampedArray
  lineColors: Uint8ClampedArray
  lineWidths: Float32Array
  pointRadii: Float32Array
  fillHeights: Float32Array
  featureFilter: Float32Array
}

// Basic palettes; expand as needed
const palettes: Record<string, string[]> = {
  Category10: [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  ],
  Set2: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3'],
  // Sequential palettes for quantitative color mapping
  YlGn: ['#ffffcc', '#d9f0a3', '#addd8e', '#78c679', '#31a354', '#006837'],
  Blues: ['#eff3ff', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c'],
  Reds: ['#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#de2d26', '#a50f15'],
  // Diverging palettes - useful for ratio/deviation visualization
  RdYlGn: ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850'],
  GnRd: ['#1a9850', '#91cf60', '#d9ef8b', '#fee08b', '#fc8d59', '#d73027'],
  RdBu: ['#b2182b', '#ef8a62', '#fddbc7', '#d1e5f0', '#67a9cf', '#2166ac'],
  PiYG: ['#c51b7d', '#e9a3c9', '#fde0ef', '#e6f5d0', '#a1d76a', '#4d9221'],
  // Viridis-like for continuous data
  Viridis: ['#440154', '#482878', '#3e4a89', '#31688e', '#26838f', '#1f9e89', '#6cce5a', '#b6de2b', '#fee825'],
}

function hexToRgba(hex: string, alpha = 255): RGBA {
  const h = hex.replace('#', '')
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return [r, g, b, alpha]
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return [r, g, b]
}

function resolveDefaultColor(hex?: string, fallback: string): RGBA {
  return hexToRgba(hex || fallback)
}

function resolveDefaultLineColor(hex?: string, fallback: string): RGB {
  return hexToRgb(hex || fallback)
}

function isNumeric(val: any): val is number {
  return typeof val === 'number' && !Number.isNaN(val)
}

function toNumber(val: any): number | null {
  if (isNumeric(val)) return val
  const num = Number(val)
  return Number.isFinite(num) ? num : null
}

function scaleLinear(value: number, domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain
  const [r0, r1] = range
  if (d0 === d1) return (r0 + r1) / 2
  const t = (value - d0) / (d1 - d0)
  return r0 + t * (r1 - r0)
}

function interpolateColor(t: number, colors: RGBA[]): RGBA {
  if (colors.length === 0) return [128, 128, 128, 255]
  if (colors.length === 1) return colors[0]
  const clampedT = Math.max(0, Math.min(1, t))
  const segment = clampedT * (colors.length - 1)
  const i = Math.floor(segment)
  const f = segment - i
  const c0 = colors[Math.min(i, colors.length - 1)]
  const c1 = colors[Math.min(i + 1, colors.length - 1)]
  return [
    Math.round(c0[0] + f * (c1[0] - c0[0])),
    Math.round(c0[1] + f * (c1[1] - c0[1])),
    Math.round(c0[2] + f * (c1[2] - c0[2])),
    Math.round(c0[3] + f * (c1[3] - c0[3])),
  ]
}

function interpolateColorRgb(t: number, colors: RGB[]): RGB {
  if (colors.length === 0) return [128, 128, 128]
  if (colors.length === 1) return colors[0]
  const clampedT = Math.max(0, Math.min(1, t))
  const segment = clampedT * (colors.length - 1)
  const i = Math.floor(segment)
  const f = segment - i
  const c0 = colors[Math.min(i, colors.length - 1)]
  const c1 = colors[Math.min(i + 1, colors.length - 1)]
  return [
    Math.round(c0[0] + f * (c1[0] - c0[0])),
    Math.round(c0[1] + f * (c1[1] - c0[1])),
    Math.round(c0[2] + f * (c1[2] - c0[2])),
  ]
}

/**
 * Build a quantitative color encoder for fill colors (RGBA)
 * @param values - Array of numeric values to encode
 * @param scheme - Color scheme name (e.g., 'RdYlGn', 'Blues')
 * @param colorRange - Optional custom color range as [startHex, endHex]
 * @param dataRange - Optional data range [min, max] to clamp values (prevents outliers from dominating)
 */
function buildQuantitativeColorEncoder(
  values: (number | null)[],
  scheme = 'YlGn',
  colorRange?: [string, string],
  dataRange?: [number, number]
) {
  const nums = values.filter((v): v is number => v !== null)
  
  // Use provided dataRange or auto-compute from data
  let min: number, max: number
  if (dataRange && dataRange.length === 2) {
    min = dataRange[0]
    max = dataRange[1]
  } else {
    min = nums.length ? Math.min(...nums) : 0
    max = nums.length ? Math.max(...nums) : 1
  }
  
  let colors: RGBA[]
  if (colorRange) {
    colors = [hexToRgba(colorRange[0]), hexToRgba(colorRange[1])]
  } else {
    const palette = palettes[scheme] || palettes.YlGn
    colors = palette.map(c => hexToRgba(c))
  }
  
  return (v: number | null) => {
    const val = v ?? min
    // Clamp value to range before computing t
    const clampedVal = Math.max(min, Math.min(max, val))
    const t = max === min ? 0.5 : (clampedVal - min) / (max - min)
    return interpolateColor(t, colors)
  }
}


/**
 * Build a quantitative color encoder for line colors (RGB)
 * @param values - Array of numeric values to encode
 * @param scheme - Color scheme name (e.g., 'RdYlGn', 'Blues')
 * @param colorRange - Optional custom color range as [startHex, endHex]
 * @param dataRange - Optional data range [min, max] to clamp values (prevents outliers from dominating)
 */
function buildQuantitativeLineColorEncoder(
  values: (number | null)[],
  scheme = 'YlGn',
  colorRange?: [string, string],
  dataRange?: [number, number]
) {
  const nums = values.filter((v): v is number => v !== null)
  
  // Use provided dataRange or auto-compute from data
  let min: number, max: number
  if (dataRange && dataRange.length === 2) {
    min = dataRange[0]
    max = dataRange[1]
  } else {
    min = nums.length ? Math.min(...nums) : 0
    max = nums.length ? Math.max(...nums) : 1
  }
  
  let colors: RGB[]
  if (colorRange) {
    colors = [hexToRgb(colorRange[0]), hexToRgb(colorRange[1])]
  } else {
    const palette = palettes[scheme] || palettes.YlGn
    colors = palette.map(c => hexToRgb(c))
  }
  
  return (v: number | null) => {
    const val = v ?? min
    // Clamp value to range before computing t
    const clampedVal = Math.max(min, Math.min(max, val))
    const t = max === min ? 0.5 : (clampedVal - min) / (max - min)
    return interpolateColorRgb(t, colors)
  }
}

function isCategoricalColorMapping(mapping: any): boolean {
  // If it has colorRange or a sequential scheme, treat as quantitative
  if (mapping.colorRange) return false
  if (mapping.range && Array.isArray(mapping.range) && typeof mapping.range[0] === 'number') return false
  // Sequential and diverging palette names (quantitative/continuous)
  const quantitativeSchemes = [
    'YlGn', 'Blues', 'Reds', 'Greens', 'Oranges', 'Purples', 'YlOrRd', 'YlOrBr',
    'RdYlGn', 'RdBu', 'PiYG',  // Diverging - great for ratios
    'Viridis',                   // Perceptually uniform
  ]
  if (mapping.scheme && quantitativeSchemes.includes(mapping.scheme)) return false
  return true
}

function buildCategoricalColorEncoder(values: any[], scheme = 'Category10') {
  const palette = palettes[scheme] || palettes.Category10
  const domain = Array.from(new Set(values.map(v => v)))
  const map = new Map<any, RGBA>()
  domain.forEach((v, i) => map.set(v, hexToRgba(palette[i % palette.length])))
  return (v: any) => map.get(v) || hexToRgba('#999999')
}

function buildCategoricalLineColorEncoder(values: any[], scheme = 'Category10') {
  const palette = palettes[scheme] || palettes.Category10
  const domain = Array.from(new Set(values.map(v => v)))
  const map = new Map<any, RGB>()
  domain.forEach((v, i) => map.set(v, hexToRgb(palette[i % palette.length])))
  return (v: any) => map.get(v) || hexToRgb('#999999')
}

function buildQuantEncoder(values: (number | null)[], range: [number, number]) {
  const nums = values.filter((v): v is number => v !== null)
  const min = nums.length ? Math.min(...nums) : 0
  const max = nums.length ? Math.max(...nums) : 1
  const domain: [number, number] = [min, max]
  return (v: number | null) => scaleLinear(v ?? min, domain, range)
}

export function buildStyleArrays(args: BuildArgs): BuildResult {
  const { features, layers, defaults = {} } = args

  const N = features.length
  const fillColors = new Uint8ClampedArray(N * 4)
  const lineColors = new Uint8ClampedArray(N * 3)  // RGB only
  const lineWidths = new Float32Array(N)
  const pointRadii = new Float32Array(N)
  const fillHeights = new Float32Array(N)
  const featureFilter = new Float32Array(N)

  // Pre-index features by layer name in properties._layer to allow per-layer style
  // Fallback to globalstyle if properties._layer isn’t present.
  type LayerBucket = { idxs: number[]; props: any[]; style?: LayerStyle }
  const buckets = new Map<string, LayerBucket>()
  for (let i = 0; i < N; i++) {
    const props = features[i]?.properties || {}
    const layerName = props._layer || 'GLOBAL'
    const bucket = buckets.get(layerName) || { idxs: [], props: [], style: layers[layerName]?.style }
    bucket.idxs.push(i)
    bucket.props.push(props)
    bucket.style = layers[layerName]?.style || bucket.style
    buckets.set(layerName, bucket)
  }

  // Global defaults used if no layer style present
  const defaultFill = resolveDefaultColor(defaults.fillColor, '#59a14f')
  const defaultLine = resolveDefaultLineColor(defaults.lineColor, '#4e79a7')
  const defaultWidth = defaults.lineWidth ?? 2
  const defaultRadius = defaults.pointRadius ?? 4
  const defaultHeight = defaults.fillHeight ?? 0

  // Initialize everything to defaults first
  for (let i = 0; i < N; i++) {
    fillColors.set(defaultFill, i * 4)
    lineColors.set(defaultLine, i * 3)  // RGB offset
    lineWidths[i] = defaultWidth
    pointRadii[i] = defaultRadius
    fillHeights[i] = defaultHeight
    featureFilter[i] = 1 // visible by default
  }

  // Apply per-layer styles
  for (const [layerName, bucket] of buckets.entries()) {
    const style = bucket.style
    const idxs = bucket.idxs
    const propsArr = bucket.props

    if (!style) continue

    // filter
    if (style.filter && 'column' in style.filter) {
      const col = (style.filter as any).column
      const include: any[] | undefined = (style.filter as any).include
      const exclude: any[] | undefined = (style.filter as any).exclude
      for (let j = 0; j < idxs.length; j++) {
        const i = idxs[j]
        const v = propsArr[j]?.[col]
        let visible = true
        if (include && include.length) visible = include.includes(v)
        if (exclude && exclude.length) visible = visible && !exclude.includes(v)
        featureFilter[i] = visible ? 1 : 0
      }
    }

    // fillColor - categorical or quantitative
    if (style.fillColor && 'column' in style.fillColor) {
      const col = (style.fillColor as any).column
      const values = propsArr.map(p => p?.[col])
      
      if (isCategoricalColorMapping(style.fillColor)) {
        const encoder = buildCategoricalColorEncoder(values, (style.fillColor as any).scheme)
        for (let j = 0; j < idxs.length; j++) {
          const i = idxs[j]
          fillColors.set(encoder(values[j]), i * 4)
        }
      } else {
        const numValues = values.map(v => toNumber(v))
        // range can be used to clamp data values (prevents outliers from dominating)
        const dataRange = (style.fillColor as any).range as [number, number] | undefined
        const encoder = buildQuantitativeColorEncoder(
          numValues,
          (style.fillColor as any).scheme,
          (style.fillColor as any).colorRange,
          dataRange
        )
        for (let j = 0; j < idxs.length; j++) {
          const i = idxs[j]
          fillColors.set(encoder(numValues[j]), i * 4)
        }
      }
    }

    // lineColor - categorical or quantitative (RGB)
    if (style.lineColor && 'column' in style.lineColor) {
      const col = (style.lineColor as any).column
      const values = propsArr.map(p => p?.[col])
      
      if (isCategoricalColorMapping(style.lineColor)) {
        const encoder = buildCategoricalLineColorEncoder(values, (style.lineColor as any).scheme)
        for (let j = 0; j < idxs.length; j++) {
          const i = idxs[j]
          lineColors.set(encoder(values[j]), i * 3)  // RGB offset
        }
      } else {
        const numValues = values.map(v => toNumber(v))
        // range can be used to clamp data values (prevents outliers from dominating)
        const dataRange = (style.lineColor as any).range as [number, number] | undefined
        const encoder = buildQuantitativeLineColorEncoder(
          numValues,
          (style.lineColor as any).scheme,
          (style.lineColor as any).colorRange,
          dataRange
        )
        for (let j = 0; j < idxs.length; j++) {
          const i = idxs[j]
          lineColors.set(encoder(numValues[j]), i * 3)  // RGB offset
        }
      }
    }

    // lineWidth quantitative
    if (style.lineWidth && 'column' in style.lineWidth) {
      const col = (style.lineWidth as any).column
      const range: [number, number] = (style.lineWidth as any).range ?? [1, 6]
      const values = propsArr.map(p => toNumber(p?.[col]))
      const encoder = buildQuantEncoder(values, range)
      for (let j = 0; j < idxs.length; j++) {
        const i = idxs[j]
        lineWidths[i] = encoder(values[j])
      }
    }

    // pointRadius quantitative
    if (style.pointRadius && 'column' in style.pointRadius) {
      const col = (style.pointRadius as any).column
      const range: [number, number] = (style.pointRadius as any).range ?? [2, 12]
      const values = propsArr.map(p => toNumber(p?.[col]))
      const encoder = buildQuantEncoder(values, range)
      for (let j = 0; j < idxs.length; j++) {
        const i = idxs[j]
        pointRadii[i] = encoder(values[j])
      }
    }

    // fillHeight quantitative
    if (style.fillHeight && 'column' in style.fillHeight) {
      const col = (style.fillHeight as any).column
      const range: [number, number] = (style.fillHeight as any).range ?? [0, 100]
      const values = propsArr.map(p => toNumber(p?.[col]))
      const encoder = buildQuantEncoder(values, range)
      for (let j = 0; j < idxs.length; j++) {
        const i = idxs[j]
        fillHeights[i] = encoder(values[j])
      }
    }
  }

  return {
    fillColors,
    lineColors,
    lineWidths,
    pointRadii,
    fillHeights,
    featureFilter,
  }
}
