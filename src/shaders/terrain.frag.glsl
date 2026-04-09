precision highp float;

varying vec2 v_uv;

uniform sampler2D u_dem;
uniform sampler2D u_mask;
uniform vec2 u_mouse;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_demTexelSize;
uniform vec4 u_demUV; // x=uMin, y=vMin, z=uMax, w=vMax

// Remap screen UV (0-1) to DEM texture UV
vec2 remapUV(vec2 screenUV) {
  return mix(u_demUV.xy, u_demUV.zw, screenUV);
}

// --- Noise for micro-detail ---
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

// --- Hypsometric color scale ---
vec3 terrainColor(float h) {
  // Saturated palette — rich greens through warm ochre to cool peaks
  vec3 c0 = vec3(0.18, 0.42, 0.22);  // 0m: deep forest green
  vec3 c1 = vec3(0.28, 0.55, 0.24);  // 50m: rich mid green
  vec3 c2 = vec3(0.50, 0.68, 0.26);  // 150m: vivid yellow-green
  vec3 c3 = vec3(0.72, 0.58, 0.22);  // 300m: warm ochre
  vec3 c4 = vec3(0.55, 0.35, 0.18);  // 500m: deep brown
  vec3 c5 = vec3(0.42, 0.25, 0.32);  // 800m+: dark purple-brown
  vec3 c6 = vec3(0.72, 0.70, 0.68);  // Peaks: cool grey

  // Elevation stops normalized to 0-1 (max ~1345m)
  if (h < 0.037) return mix(c0, c1, h / 0.037);
  if (h < 0.112) return mix(c1, c2, (h - 0.037) / 0.075);
  if (h < 0.223) return mix(c2, c3, (h - 0.112) / 0.111);
  if (h < 0.372) return mix(c3, c4, (h - 0.223) / 0.149);
  if (h < 0.595) return mix(c4, c5, (h - 0.372) / 0.223);
  return mix(c5, c6, (h - 0.595) / 0.405);
}

// --- Hillshade ---
float hillshade(vec2 uv, vec2 texelSize) {
  float hL = texture2D(u_dem, uv - vec2(texelSize.x, 0.0)).r;
  float hR = texture2D(u_dem, uv + vec2(texelSize.x, 0.0)).r;
  float hD = texture2D(u_dem, uv - vec2(0.0, texelSize.y)).r;
  float hU = texture2D(u_dem, uv + vec2(0.0, texelSize.y)).r;

  vec3 normal = normalize(vec3(
    (hL - hR) * 12.0,
    (hD - hU) * 12.0,
    1.0
  ));

  // NW light, azimuth 315, altitude 45
  vec3 lightDir = normalize(vec3(-0.5, 0.5, 0.707));
  float shade = dot(normal, lightDir);

  // Deeper shadows, brighter highlights for punchy relief
  return mix(0.2, 1.3, shade * 0.5 + 0.5);
}

void main() {
  // Remap screen UV to DEM texture space
  vec2 demUV = remapUV(v_uv);

  // Parallax offset based on mouse + elevation
  vec2 mouseOffset = (u_mouse - 0.5) * vec2(2.0, -2.0);
  float elevation = texture2D(u_dem, demUV).r;

  // Higher terrain shifts more for parallax depth
  vec2 parallax = mouseOffset * elevation * 0.0075;
  vec2 uv = clamp(demUV + parallax, 0.0, 1.0);

  float h = texture2D(u_dem, uv).r;
  float mask = texture2D(u_mask, uv).r;

  // Terrain color
  vec3 color = terrainColor(h);

  // Hillshade lighting
  float shade = hillshade(uv, u_demTexelSize);
  color *= shade;

  // Subtle noise detail overlay
  float detail = snoise(uv * 60.0) * 0.02;
  color += detail;

  // Apply land mask: alpha = 0 over water
  float alpha = smoothstep(0.1, 0.5, mask);

  // Fade out near edges of valid DEM range to prevent edge artifacts
  float edgeFade = smoothstep(0.0, 0.02, demUV.x) * smoothstep(1.0, 0.98, demUV.x)
                 * smoothstep(0.0, 0.02, demUV.y) * smoothstep(1.0, 0.98, demUV.y);
  alpha *= edgeFade;

  gl_FragColor = vec4(color, alpha);
}
