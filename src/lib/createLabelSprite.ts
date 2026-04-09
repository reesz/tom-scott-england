import { Sprite, SpriteMaterial, CanvasTexture, LinearFilter } from 'three'

const CANVAS_WIDTH = 512
const CANVAS_HEIGHT = 128
const FONT_SIZE = 48
const FONT_FAMILY = "'Fraunces', Georgia, serif"

/**
 * Create a Sprite with a canvas-rendered label at max resolution.
 * Sizing is handled dynamically in the render loop.
 */
export function createLabelSprite(name: string): Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH * 2 // 2x for retina
  canvas.height = CANVAS_HEIGHT * 2
  const ctx = canvas.getContext('2d')!

  ctx.scale(2, 2)

  ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`
  const measured = ctx.measureText(name).width

  // Dark text shadow for readability
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 4

  // Draw text — white
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
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
  // Store the text width ratio (how much of the canvas the text fills)
  sprite.userData.textWidthRatio = measured / CANVAS_WIDTH

  return sprite
}
