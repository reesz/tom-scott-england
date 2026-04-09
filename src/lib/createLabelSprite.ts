import { Sprite, SpriteMaterial, CanvasTexture, LinearFilter } from 'three'

const CANVAS_WIDTH = 512
const CANVAS_HEIGHT = 128
const FONT_SIZE = 48
const FONT = `${FONT_SIZE}px 'Fraunces', Georgia, serif`

/**
 * Create a Sprite with a canvas-rendered label.
 * The sprite is sized in world units so it scales naturally with zoom.
 */
export function createLabelSprite(name: string): Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH * 2 // 2x for retina
  canvas.height = CANVAS_HEIGHT * 2
  const ctx = canvas.getContext('2d')!

  ctx.scale(2, 2)

  // Text shadow for readability over terrain
  ctx.shadowColor = 'rgba(255, 255, 255, 0.7)'
  ctx.shadowBlur = 4
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  // Draw text
  ctx.font = FONT
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.letterSpacing = '1px'
  ctx.fillStyle = 'rgba(60, 50, 40, 0.85)'
  ctx.fillText(name, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)

  // Also draw a subtle stroke for legibility
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.lineWidth = 1.5
  ctx.strokeText(name, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
  // Re-draw fill on top of stroke
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
  // Name stored for debugging
  sprite.name = `label-${name}`

  return sprite
}
