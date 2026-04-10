import { Sprite, SpriteMaterial, CanvasTexture, LinearFilter } from 'three'

const CANVAS_WIDTH = 512
const CANVAS_HEIGHT = 192
const LABEL_SCALE = Math.max(2, Math.ceil(window.devicePixelRatio))
const TITLE_SIZE = 44
const SUB_SIZE = 24
const TITLE_FONT = "'Fraunces', Georgia, serif"
const SUB_FONT = "'Manrope', system-ui, sans-serif"

// Play triangle icon dimensions
const ICON_SIZE = 28
const ICON_GAP = 8

export interface LabelData {
  name: string
  hasVideo: boolean
  status: 'released' | 'upcoming'
  releaseDate: string | null
}

function formatReleaseDate(dateStr: string): string {
  const release = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const diffMs = release.getTime() - now.getTime()

  // If in the past, show nothing
  if (diffMs < 0) return ''

  // Under 24h: countdown
  if (diffMs < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diffMs / (60 * 60 * 1000))
    const mins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000))
    if (hours > 0) return `In ${hours}h ${mins}m`
    return `In ${mins}m`
  }

  // Otherwise: "Coming Apr 14"
  const month = release.toLocaleString('en-US', { month: 'short' })
  const day = release.getDate()
  return `Coming ${month} ${day}`
}

function formatPastDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const month = d.toLocaleString('en-US', { month: 'short' })
  const day = d.getDate()
  const year = d.getFullYear()
  return `${month} ${day}, ${year}`
}

function drawPlayIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 2

  // Draw a play triangle
  const half = size / 2
  ctx.beginPath()
  ctx.moveTo(x - half * 0.4, y - half)
  ctx.lineTo(x + half * 0.7, y)
  ctx.lineTo(x - half * 0.4, y + half)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function renderLabel(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  data: LabelData,
): number {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.scale(LABEL_SCALE, LABEL_SCALE)

  // --- Title row ---
  ctx.font = `700 ${TITLE_SIZE}px ${TITLE_FONT}`
  const titleWidth = ctx.measureText(data.name).width
  const hasIcon = data.hasVideo
  const totalTitleWidth = titleWidth + (hasIcon ? ICON_SIZE + ICON_GAP : 0)

  // Title Y: pushed up if we have a subtitle
  const hasSubtitle = data.status === 'upcoming' || !!data.releaseDate
  const titleY = hasSubtitle ? CANVAS_HEIGHT * 0.38 : CANVAS_HEIGHT * 0.45

  // Shadow for title
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 4

  // Draw title text centered (accounting for icon)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  const titleCenterX = CANVAS_WIDTH / 2 - (hasIcon ? (ICON_SIZE + ICON_GAP) / 2 : 0)
  ctx.fillText(data.name, titleCenterX, titleY)

  // Draw play icon after title
  if (hasIcon) {
    const iconX = titleCenterX + titleWidth / 2 + ICON_GAP + ICON_SIZE * 0.3
    drawPlayIcon(ctx, iconX, titleY, ICON_SIZE)
  }

  // --- Subtitle row ---
  if (hasSubtitle) {
    const subText = data.status === 'upcoming'
      ? (data.releaseDate ? formatReleaseDate(data.releaseDate) : 'Coming Soon')
      : (data.releaseDate ? formatPastDate(data.releaseDate) : '')
    if (subText) {
      const subY = titleY + TITLE_SIZE * 0.5 + SUB_SIZE * 0.6

      ctx.font = `500 ${SUB_SIZE}px ${SUB_FONT}`
      ctx.shadowBlur = 6
      ctx.shadowOffsetY = 2
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.fillText(subText, CANVAS_WIDTH / 2, subY)
    }
  }

  ctx.restore()

  // Return the text width ratio for sizing
  return totalTitleWidth / CANVAS_WIDTH
}

/**
 * Create a Sprite with a canvas-rendered label showing county name,
 * optional video icon, and release date subtitle.
 */
export function createLabelSprite(data: LabelData): Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH * LABEL_SCALE
  canvas.height = CANVAS_HEIGHT * LABEL_SCALE
  const ctx = canvas.getContext('2d')!

  const textWidthRatio = renderLabel(canvas, ctx, data)

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter

  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  })

  const sprite = new Sprite(material)
  sprite.name = `label-${data.name}`
  sprite.userData.textWidthRatio = textWidthRatio
  sprite.userData.labelData = data
  sprite.userData._canvas = canvas
  sprite.userData._ctx = ctx

  return sprite
}

/**
 * Re-render label texture (for countdown updates).
 * Returns true if the texture actually changed.
 */
export function updateLabelTexture(sprite: Sprite): boolean {
  const { labelData, _canvas, _ctx } = sprite.userData
  if (!labelData || !_canvas || !_ctx) return false
  if (labelData.status !== 'upcoming' || !labelData.releaseDate) return false

  renderLabel(_canvas, _ctx, labelData)
  const mat = sprite.material as SpriteMaterial
  if (mat.map) mat.map.needsUpdate = true
  return true
}
