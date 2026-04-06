precision mediump float;

varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

// --- Noise functions ---
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                            + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                           dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// --- Terrain ---
float terrainHeight(vec2 uv) {
  float h = fbm(uv * 8.0 + vec2(100.0, 200.0), 6) * 0.5 + 0.5;
  float northBias = smoothstep(0.3, 0.9, uv.y) * 0.3;
  float westBias = smoothstep(0.6, 0.2, uv.x) * 0.15;
  h = h * 0.6 + northBias + westBias;
  return clamp(h, 0.0, 1.0);
}

vec3 terrainColor(float h) {
  vec3 deepGreen = vec3(0.45, 0.58, 0.37);
  vec3 lightGreen = vec3(0.62, 0.72, 0.48);
  vec3 tan_ = vec3(0.72, 0.65, 0.50);
  vec3 brown = vec3(0.60, 0.48, 0.35);
  vec3 purple = vec3(0.52, 0.42, 0.48);

  if (h < 0.25) return mix(deepGreen, lightGreen, h / 0.25);
  if (h < 0.45) return mix(lightGreen, tan_, (h - 0.25) / 0.2);
  if (h < 0.65) return mix(tan_, brown, (h - 0.45) / 0.2);
  return mix(brown, purple, (h - 0.65) / 0.35);
}

float hillshade(vec2 uv) {
  float dx = terrainHeight(uv + vec2(0.002, 0.0)) - terrainHeight(uv - vec2(0.002, 0.0));
  float dy = terrainHeight(uv + vec2(0.0, 0.002)) - terrainHeight(uv - vec2(0.0, 0.002));
  vec3 normal = normalize(vec3(-dx * 4.0, -dy * 4.0, 1.0));
  vec3 lightDir = normalize(vec3(-0.5, 0.5, 0.8));
  return max(dot(normal, lightDir), 0.0);
}

// Water / coastline effect
vec3 waterColor(vec2 uv, float time) {
  vec3 deepWater = vec3(0.22, 0.35, 0.38);
  vec3 lightWater = vec3(0.32, 0.48, 0.50);

  float wave1 = snoise(uv * 15.0 + vec2(time * 0.08, time * 0.05)) * 0.5 + 0.5;
  float wave2 = snoise(uv * 25.0 - vec2(time * 0.12, time * 0.03)) * 0.5 + 0.5;
  float waves = wave1 * 0.6 + wave2 * 0.4;

  vec3 water = mix(deepWater, lightWater, waves * 0.3);

  // Stippled wave lines (old map style)
  float stipple = sin((uv.x + uv.y * 0.5) * 80.0 + time * 2.0) * 0.5 + 0.5;
  stipple = smoothstep(0.4, 0.6, stipple);
  water += stipple * 0.03;

  return water;
}

// --- Paper ---
vec3 paperTexture(vec2 uv) {
  vec3 base = vec3(0.957, 0.910, 0.757);
  float grain = fbm(uv * 40.0, 5) * 0.06;
  float stain = fbm(uv * 3.0 + 42.0, 4) * 0.04;
  float crease1 = smoothstep(0.002, 0.0, abs(uv.x + uv.y * 0.3 - 0.65));
  float crease2 = smoothstep(0.002, 0.0, abs(uv.x * 0.4 - uv.y + 0.3));
  float creases = (crease1 + crease2) * 0.08;
  vec2 vigUV = uv * 2.0 - 1.0;
  float vignette = 1.0 - dot(vigUV * 0.5, vigUV * 0.5);
  vignette = smoothstep(0.0, 1.0, vignette);
  vec3 color = base + grain + stain - creases;
  color *= mix(0.82, 1.0, vignette);
  return color;
}

void main() {
  vec2 parallaxOffset = (u_mouse - 0.5) * 0.01;
  vec2 uv = v_uv + parallaxOffset;

  // Paper base
  vec3 paper = paperTexture(uv);

  // Terrain
  float h = terrainHeight(uv);
  vec3 terrain = terrainColor(h);
  float shade = hillshade(uv);
  terrain *= mix(0.7, 1.1, shade);

  // Land/terrain blended with paper
  vec3 land = mix(paper, terrain, 0.55);
  land += fbm(uv * 60.0, 3) * 0.02;

  // Water
  vec3 water = waterColor(uv, u_time);
  water = mix(paper * 0.7, water, 0.6);

  // Water at edges, land in center
  float edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float waterMask = smoothstep(0.15, 0.05, edgeDist);

  vec3 color = mix(land, water, waterMask);

  // Subtle time-based warmth
  color += vec3(0.008, 0.004, 0.0) * sin(u_time * 0.3);

  gl_FragColor = vec4(color, 1.0);
}
