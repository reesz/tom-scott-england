import { Sprite, SpriteMaterial, CanvasTexture, LinearFilter } from 'three'

const CANVAS_WIDTH = 512
const CANVAS_HEIGHT = 128
const FONT_FAMILY = "'Fraunces', Georgia, serif"
const MAX_FONT_SIZE = 48
const MIN_FONT_SIZE = 16

/**
 * Create a Sprite with a canvas-rendered label.
 * Font size is auto-fitted so the text never exceeds the given
 * maxTextWidth (in canvas pixels at 1x, before retina scaling).
 */
export function createLabelSprite(
  name: string,
  maxTextWidth: number = CANVAS_WIDTH * 0.9,
): Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH * 2 // 2x for retina
  canvas.height = CANVAS_HEIGHT * 2
  const ctx = canvas.getContext('2d')!

  ctx.scale(2, 2)

  // Find the largest font size that fits within maxTextWidth
  let fontSize = MAX_FONT_SIZE
  ctx.font = `${fontSize}px ${FONT_FAMILY}`
  let measured = ctx.measureText(name).width

  while (measured > maxTextWidth && fontSize > MIN_FONT_SIZE) {
    fontSize -= 2
    ctx.font = `${fontSize}px ${FONT_FAMILY}`
    measured = ctx.measureText(name).width
  }

  // Dark text shadow for readability
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 3
  ctx.shadowOffsetX = 1
  ctx.shadowOffsetY = 1

  // Draw text — off-black
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(25, 22, 18, 0.9)'
  ctx.fillText(name, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)

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
  sprite.name = `label-${name}`

  return sprite
}
