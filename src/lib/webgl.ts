// WebGL color grading for real-time canvas preview
// Applies LUTs, curves, and color corrections using GPU shaders

import type { ColorGrade } from '@/store/editor';

const VERT_SRC = `
  attribute vec2 a_position;
  attribute vec2 a_texcoord;
  varying vec2 v_texcoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texcoord = a_texcoord;
  }
`;

const FRAG_SRC = `
  precision mediump float;
  varying vec2 v_texcoord;
  uniform sampler2D u_image;
  uniform float u_brightness;
  uniform float u_contrast;
  uniform float u_saturation;
  uniform float u_temperature;
  uniform float u_tint;
  uniform float u_highlights;
  uniform float u_shadows;
  uniform float u_vignette;
  uniform float u_grain;
  uniform float u_sharpness;
  uniform vec2 u_resolution;

  vec3 adjustTemperature(vec3 color, float temp) {
    color.r += temp * 0.1;
    color.b -= temp * 0.1;
    return color;
  }

  vec3 adjustShadowsHighlights(vec3 color, float shadows, float highlights) {
    float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color += shadows * 0.1 * (1.0 - lum) * (1.0 - color);
    color += highlights * 0.1 * lum * (1.0 - color);
    return color;
  }

  float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = v_texcoord;
    vec4 color = texture2D(u_image, uv);
    vec3 rgb = color.rgb;

    // Brightness
    rgb += u_brightness * 0.01;

    // Contrast
    rgb = (rgb - 0.5) * (1.0 + u_contrast * 0.01) + 0.5;

    // Saturation
    float gray = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
    rgb = mix(vec3(gray), rgb, 1.0 + u_saturation * 0.01);

    // Temperature & Tint
    rgb = adjustTemperature(rgb, u_temperature * 0.01);
    rgb.g += u_tint * 0.005;

    // Shadows & Highlights
    rgb = adjustShadowsHighlights(rgb, u_shadows, u_highlights);

    // Vignette
    if (u_vignette > 0.0) {
      vec2 center = uv - 0.5;
      float dist = length(center);
      float vig = smoothstep(0.3, 0.7 + (1.0 - u_vignette * 0.01) * 0.3, dist);
      rgb *= 1.0 - vig * u_vignette * 0.015;
    }

    // Film grain
    if (u_grain > 0.0) {
      float noise = rand(uv + fract(u_grain)) * u_grain * 0.005;
      rgb += noise - u_grain * 0.0025;
    }

    rgb = clamp(rgb, 0.0, 1.0);
    gl_FragColor = vec4(rgb, color.a);
  }
`;

export class WebGLGrader {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private texture: WebGLTexture | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;
    this.program = this.createProgram();
    this.setupBuffers();
    this.cacheUniforms();
  }

  private createShader(type: number, src: string): WebGLShader {
    const { gl } = this;
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return sh;
  }

  private createProgram(): WebGLProgram {
    const { gl } = this;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, this.createShader(gl.VERTEX_SHADER, VERT_SRC));
    gl.attachShader(prog, this.createShader(gl.FRAGMENT_SHADER, FRAG_SRC));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    return prog;
  }

  private setupBuffers() {
    const { gl, program } = this;
    const pos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pos);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tex);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,1, 1,1, 0,0, 1,0]), gl.STATIC_DRAW);
    const texLoc = gl.getAttribLocation(program, 'a_texcoord');
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
  }

  private cacheUniforms() {
    const { gl, program } = this;
    ['u_brightness','u_contrast','u_saturation','u_temperature','u_tint','u_highlights','u_shadows','u_vignette','u_grain','u_sharpness','u_resolution'].forEach(name => {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    });
  }

  uploadFrame(source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) {
    const { gl } = this;
    if (!this.texture) {
      this.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  render(grade: ColorGrade, w: number, h: number) {
    const { gl } = this;
    gl.viewport(0, 0, w, h);
    gl.uniform1f(this.uniforms.u_brightness, grade.brightness);
    gl.uniform1f(this.uniforms.u_contrast, grade.contrast);
    gl.uniform1f(this.uniforms.u_saturation, grade.saturation);
    gl.uniform1f(this.uniforms.u_temperature, grade.temperature);
    gl.uniform1f(this.uniforms.u_tint, grade.tint);
    gl.uniform1f(this.uniforms.u_highlights, grade.highlights);
    gl.uniform1f(this.uniforms.u_shadows, grade.shadows);
    gl.uniform1f(this.uniforms.u_vignette, grade.vignette);
    gl.uniform1f(this.uniforms.u_grain, grade.grain);
    gl.uniform1f(this.uniforms.u_sharpness, grade.sharpness);
    gl.uniform2f(this.uniforms.u_resolution, w, h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  destroy() {
    if (this.texture) this.gl.deleteTexture(this.texture);
  }
}

// Apply CSS-based grade for non-WebGL fallback
export function getFilterCSS(grade: ColorGrade): string {
  const br = 1 + grade.brightness / 100;
  const ct = 1 + grade.contrast / 100;
  const st = 1 + grade.saturation / 100;
  const sh = 1 + grade.sharpness / 100;
  const temp = grade.temperature;
  const hue = temp * 0.3; // crude temperature via hue-rotate
  return `brightness(${br}) contrast(${ct}) saturate(${st}) hue-rotate(${hue}deg)`;
}
