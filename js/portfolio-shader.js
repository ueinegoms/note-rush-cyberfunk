// ══════════════════════════════════════════════
//  PORTFOLIO BUTTON — the background of the portfolio (wayne.blue)
//  The same WebGL shader as its home: a 100×100 mesh waving in the vertex
//  shader, dark mixed into the home's green with a grain in the fragment
//  shader. Only the first pass (the portfolio's "fried" post-process lives
//  in its projects zone, not on its home).
//  Animates only while the button is on screen; a still frame for
//  prefers-reduced-motion; no WebGL → the CSS fallback in footer.css.
// ══════════════════════════════════════════════

const COLOR = [0x45 / 255, 0xf2 / 255, 0x87 / 255]; // the portfolio's home ('ctas')
const WAVES = [0.25, 4.0, 0.05, 13.0, 0.02, 8.0];    // u_w1a, u_w1f, u_w2a, u_w2f, u_w3a, u_w3f
const SPEED = 0.4;                                   // as the portfolio's sTime

const VERT = `
  attribute vec2 a_pos; attribute vec2 a_uv; varying vec2 v_uv;
  uniform float u_t;
  uniform float u_ar;
  uniform float u_w1a,u_w1f,u_w2a,u_w2f,u_w3a,u_w3f;
  void main() {
    v_uv = a_uv;
    vec2 p = a_pos * 1.4;
    float targetAR = 16.0 / 9.0;
    float scale = u_ar / targetAR;
    vec2 pn = vec2(p.x * min(scale, 1.0), p.y * min(1.0 / scale, 1.0));
    float w = u_w1a*sin(u_w1f*pn.x+u_t*1.0)
            + u_w2a*cos(u_w2f*pn.y+u_t*0.7)
            + u_w3a*sin(u_w3f*(pn.x+pn.y)+u_t*0.5);
    p.y+=w; p.x+=w*0.5;
    gl_Position=vec4(p,0.0,1.0);
  }
`;
const FRAG = `
  precision highp float; varying vec2 v_uv; uniform float u_t;
  uniform vec3 u_col;
  float rnd(vec2 s){return fract(sin(dot(s,vec2(12.9898,78.233)))*43758.5453);}
  void main() {
    vec3 dark=vec3(0.031);
    float w=0.5*sin(u_t*0.7+v_uv.x*6.0)+0.3*cos(u_t*0.9+v_uv.y*8.0)+0.2*sin(u_t*0.5+(v_uv.x+v_uv.y)*10.0);
    float val=sin(w*0.5+v_uv.x*2.0-v_uv.y*2.0);
    vec3 c1=mix(dark,u_col,smoothstep(-0.5,10.0,val));
    vec3 c2=mix(dark,u_col,smoothstep(-0.5,0.3,val));
    vec3 final=mix(c2,c1,smoothstep(0.1,0.7,val)*0.9);
    final+=vec3(rnd(v_uv*(u_t*0.1+1.0))*0.06);
    gl_FragColor=vec4(final,1.0);
  }
`;

function start(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
  if (!gl) return false;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
  gl.useProgram(prog);

  const G = 100, pos = [], uv = [], idx = [];
  for (let y = 0; y <= G; y++) for (let x = 0; x <= G; x++) { pos.push(x / G * 2 - 1, y / G * 2 - 1); uv.push(x / G, y / G); }
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
    const i = y * (G + 1) + x;
    idx.push(i, i + 1, i + G + 1, i + 1, i + G + 2, i + G + 1);
  }
  const buf = (target, data, C) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, new C(data), gl.STATIC_DRAW); return b; };
  const attr = (b, name) => {
    const loc = gl.getAttribLocation(prog, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  };
  attr(buf(gl.ARRAY_BUFFER, pos, Float32Array), 'a_pos');
  attr(buf(gl.ARRAY_BUFFER, uv, Float32Array), 'a_uv');
  buf(gl.ELEMENT_ARRAY_BUFFER, idx, Uint16Array);

  const uT = gl.getUniformLocation(prog, 'u_t'), uAR = gl.getUniformLocation(prog, 'u_ar');
  ['u_w1a', 'u_w1f', 'u_w2a', 'u_w2f', 'u_w3a', 'u_w3f'].forEach((n, i) => gl.uniform1f(gl.getUniformLocation(prog, n), WAVES[i]));
  gl.uniform3f(gl.getUniformLocation(prog, 'u_col'), COLOR[0], COLOR[1], COLOR[2]);

  const resize = () => {
    const r = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * r));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * r));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  let t = 0, last = 0, raf = 0, visible = false;
  const draw = () => {
    gl.clearColor(0.04, 0.04, 0.04, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uT, t);
    gl.uniform1f(uAR, canvas.width / canvas.height);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
  };
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const loop = (ts) => {
    raf = visible && !still ? requestAnimationFrame(loop) : 0;
    t = (t + Math.min((ts - last) / 1000, 0.1) * SPEED) % 1000;   // (wrapped, as the portfolio: float precision)
    last = ts;
    draw();
  };
  resize();
  t = 3.0;                                                        // (a frame with some of the green in it)
  draw();
  new ResizeObserver(() => { resize(); draw(); }).observe(canvas);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf && !still) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }).observe(canvas);
  return true;
}

const canvas = document.getElementById('pf-canvas');
if (canvas && start(canvas)) canvas.parentElement.classList.add('has-shader');
