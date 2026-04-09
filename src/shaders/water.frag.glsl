precision highp float;

varying vec2 v_uv;

uniform sampler2D u_mask;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform vec4 u_demUV; // x=uMin, y=vMin, z=uMax, w=vMax

vec2 remapUV(vec2 screenUV) {
  return mix(u_demUV.xy, u_demUV.zw, screenUV);
}

// --- Noise ---
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

void main() {
  vec2 demUV = remapUV(v_uv);

  // Outside DEM range = deep ocean (mask 0.0), no discard
  bool outsideDEM = demUV.x < 0.0 || demUV.x > 1.0 || demUV.y < 0.0 || demUV.y > 1.0;
  float mask = outsideDEM ? 0.0 : texture2D(u_mask, clamp(demUV, 0.0, 1.0)).r;

  // Water only where mask < 0.5 (ocean)
  float waterAlpha = smoothstep(0.5, 0.1, mask);
  if (waterAlpha < 0.01) discard;

  // Distance from nearest land for depth gradient
  float coastDist = 1.0 - smoothstep(0.0, 0.4, mask);

  // Water colors
  vec3 coastColor = vec3(0.45, 0.68, 0.75);  // brighter teal coast
  vec3 midColor   = vec3(0.22, 0.44, 0.54);  // richer mid blue
  vec3 deepColor  = vec3(0.12, 0.24, 0.34);  // deeper ocean

  // Depth gradient
  vec3 baseColor = mix(coastColor, midColor, smoothstep(0.0, 0.5, coastDist));
  baseColor = mix(baseColor, deepColor, smoothstep(0.5, 1.0, coastDist));

  // Animated ripples - multi-octave
  float ripple1 = snoise(v_uv * 20.0 + vec2(u_time * 0.04, u_time * 0.02)) * 0.5 + 0.5;
  float ripple2 = snoise(v_uv * 35.0 - vec2(u_time * 0.06, u_time * 0.015)) * 0.5 + 0.5;
  float ripple3 = snoise(v_uv * 50.0 + vec2(u_time * 0.03, -u_time * 0.04)) * 0.5 + 0.5;
  float ripples = ripple1 * 0.5 + ripple2 * 0.3 + ripple3 * 0.2;

  // Ripple influence on color
  baseColor += ripples * 0.04;

  // Fresnel-like sheen on ripple peaks — slowly drifts over time
  float sheenShift = snoise(v_uv * 12.0 + u_time * 0.02) * 0.08;
  float sheen = smoothstep(0.65 + sheenShift, 0.85 + sheenShift, ripples);
  baseColor += sheen * 0.08;

  // Subtle parallax offset for foam — mouse shifts the foam pattern slightly
  vec2 mouseOffset = (u_mouse - 0.5) * vec2(1.0, -1.0);
  vec2 foamUV = v_uv + mouseOffset * 0.004;

  // Shore foam
  float foamZone = smoothstep(0.4, 0.15, mask) * smoothstep(0.0, 0.1, mask);
  float foamNoise = snoise(foamUV * 80.0 + vec2(u_time * 0.06, u_time * 0.02)) * 0.5 + 0.5;
  float foamPulse = sin(u_time * 0.8) * 0.2 + 0.8;
  float foam = foamZone * smoothstep(0.3, 0.7, foamNoise) * foamPulse;
  baseColor = mix(baseColor, vec3(1.0), foam * 0.3);

  gl_FragColor = vec4(baseColor, waterAlpha);
}
