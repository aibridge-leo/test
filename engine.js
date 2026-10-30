/* Aurora Arcade shared engine.
   Requires three@0.128.0 + postprocessing UMD scripts loaded before this file.
   Usage: const G = ENGINE.create({...}); see README comment at bottom of file. */
(function () {
'use strict';
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.random() * a.length | 0];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const reduceMotion = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
const $ = id => document.getElementById(id);

/* ================= shared UI css ================= */
const BASE_CSS = `
:root{color-scheme:dark}
[hidden]{display:none!important}
*{box-sizing:border-box}
html,body{height:100%;margin:0;overflow:hidden;background:var(--bg);color:var(--ink);font-family:var(--ui);touch-action:none;user-select:none;-webkit-user-select:none}
canvas#c{position:fixed;inset:0;width:100%;height:100%;display:block}
.hud{position:fixed;pointer-events:none;font-weight:600;letter-spacing:.08em;text-shadow:0 1px 10px rgba(0,0,0,.7);display:flex;flex-direction:column;gap:4px;z-index:5}
.lbl{font-size:11px;color:var(--dim);letter-spacing:.24em}
.num{font-variant-numeric:tabular-nums}
.hud.tl{top:calc(12px + env(safe-area-inset-top,0px));left:max(16px,env(safe-area-inset-left,0px))}
.hud.tr{top:calc(12px + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));align-items:flex-end}
.hud.bl{bottom:calc(14px + env(safe-area-inset-bottom,0px));left:max(16px,env(safe-area-inset-left,0px))}
.hud.br{bottom:calc(14px + env(safe-area-inset-bottom,0px));right:max(16px,env(safe-area-inset-right,0px));flex-direction:row;align-items:flex-end;gap:10px}
.hud.bc{bottom:calc(14px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);align-items:center}
.big{font-size:32px;line-height:1;font-weight:700}
.row{display:flex;gap:16px;align-items:flex-end}
.stat{display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.stat b{font-size:20px;line-height:1}
.btns{display:flex;gap:6px;margin-top:6px;pointer-events:auto}
.mini{font:600 11px var(--ui);letter-spacing:.14em;color:var(--ink);background:var(--panel);border:1px solid var(--line);padding:6px 9px;cursor:pointer;text-decoration:none;display:inline-block}
.mini:hover,.mini:focus-visible{border-color:var(--accent);outline:none}
.bar{width:140px;height:6px;background:rgba(255,255,255,.12);overflow:hidden;transform:skewX(-20deg)}
.bar>i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--accent),var(--accent2));box-shadow:0 0 10px var(--accent)}
.pips{display:flex;gap:5px}
.pips span{width:22px;height:8px;background:rgba(255,255,255,.12);transform:skewX(-20deg);transition:background .2s}
.pips span.on{background:var(--accent);box-shadow:0 0 10px var(--accent)}
.pips.low span.on{background:var(--warn);box-shadow:0 0 10px var(--warn)}
.round{pointer-events:auto;font:700 13px var(--ui);letter-spacing:.16em;color:var(--ink);border-radius:50%;cursor:pointer;display:grid;place-content:center;gap:2px;width:70px;height:70px;background:radial-gradient(circle at 50% 40%,var(--tint,rgba(255,255,255,.18)),var(--panel) 70%);border:1px solid var(--edge,var(--line))}
.round small{font-size:10px;color:var(--dim);letter-spacing:.2em}
.round:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.round:disabled{opacity:.35}
#banner{position:fixed;left:0;right:0;top:27%;text-align:center;pointer-events:none;z-index:6;--bc:var(--accent)}
#banner h2{font-family:var(--display);font-weight:400;margin:0;font-size:clamp(42px,9vw,104px);line-height:1;color:#fff;opacity:0;text-shadow:-4px 0 rgba(255,61,110,.75),4px 0 rgba(79,230,255,.75),0 0 34px var(--bc)}
#banner p{margin:10px 0 0;font-size:clamp(13px,2vw,17px);letter-spacing:.32em;color:var(--bc);opacity:0}
#banner .bl{height:2px;margin:12px auto;background:linear-gradient(90deg,transparent,var(--bc),transparent);width:0}
#banner.show h2{animation:bIn var(--dur,2.4s) cubic-bezier(.2,.8,.2,1) forwards}
#banner.show p{animation:pIn var(--dur,2.4s) ease forwards}
#banner.show .bl{animation:lIn var(--dur,2.4s) cubic-bezier(.2,.8,.2,1) forwards}
@keyframes bIn{0%{opacity:0;letter-spacing:.7em;transform:scale(1.5);filter:blur(10px)}14%{opacity:1;letter-spacing:.06em;transform:scale(1);filter:blur(0)}82%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.94);filter:blur(4px)}}
@keyframes pIn{0%,12%{opacity:0;transform:translateY(8px)}24%,82%{opacity:1;transform:none}100%{opacity:0}}
@keyframes lIn{0%{width:0;opacity:1}18%{width:min(80vw,760px)}82%{opacity:1;width:min(80vw,760px)}100%{opacity:0;width:min(90vw,900px)}}
#dmg{position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;background:radial-gradient(ellipse at center,transparent 45%,rgba(255,40,80,.55) 100%)}
#flash{position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;background:#fff4e6}
#pops{position:fixed;inset:0;pointer-events:none;z-index:4;overflow:hidden}
.pop{position:absolute;left:0;top:0;font-weight:700;white-space:nowrap;text-shadow:0 0 10px rgba(0,0,0,.7);will-change:transform,opacity}
.screen{position:fixed;inset:0;display:grid;place-items:center;text-align:center;z-index:8;padding:24px max(16px,env(safe-area-inset-right,0px)) 24px max(16px,env(safe-area-inset-left,0px));background:linear-gradient(180deg,rgba(3,4,12,.55),rgba(3,4,12,0) 30%,rgba(3,4,12,0) 60%,rgba(3,4,12,.72));overflow:auto}
.screen.title{place-items:end center;padding-bottom:calc(6vh + env(safe-area-inset-bottom,0px))}
.card{display:flex;flex-direction:column;align-items:center;gap:14px;max-width:640px}
.kicker{font-size:12px;letter-spacing:.42em;color:var(--accent)}
.screen h1{font-family:var(--display);font-weight:400;margin:0;font-size:clamp(52px,12vw,130px);line-height:.86;letter-spacing:.02em;background:linear-gradient(100deg,#fff 0%,var(--accent) 40%,#fff 48%,var(--accent2) 56%,#fff 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 26px var(--glow));animation:sheen 4.5s ease-in-out infinite}
.screen h1 span{display:block;font-size:.46em;letter-spacing:.42em;margin-top:.14em}
@keyframes sheen{0%,100%{background-position:100% 0}50%{background-position:0 0}}
.sub{margin:0;color:var(--ink);opacity:.85;font-size:15px;letter-spacing:.03em;max-width:46ch;text-wrap:balance}
.go{font:700 17px var(--ui);letter-spacing:.32em;color:#060812;background:linear-gradient(90deg,var(--accent),var(--accent2));border:0;padding:15px 44px;cursor:pointer;clip-path:polygon(14px 0,100% 0,calc(100% - 14px) 100%,0 100%);transition:transform .15s,filter .15s}
.go:hover{transform:translateY(-2px);filter:brightness(1.1)}
.go:focus-visible{outline:2px solid #fff;outline-offset:4px}
.keys{display:grid;grid-template-columns:auto auto;gap:6px 16px;font-size:13px;color:var(--dim);text-align:left;background:var(--panel);padding:12px 16px;border:1px solid var(--line)}
.keys kbd{font:600 12px var(--ui);color:var(--ink);border:1px solid var(--line);padding:1px 6px}
.result{display:grid;grid-template-columns:1fr 1fr;gap:10px 34px}
.result div{display:flex;flex-direction:column;gap:2px}
.result b{font-size:34px;font-variant-numeric:tabular-nums}
.over-title{font-family:var(--display);font-size:clamp(44px,10vw,92px);margin:0;line-height:1;color:var(--warn);text-shadow:0 0 30px var(--warn);font-weight:400}
.newbest{color:var(--accent2);letter-spacing:.3em;font-size:13px}
.err{color:var(--warn);font-size:14px}
.backlink{position:fixed;z-index:9;top:calc(12px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);opacity:.85}
@media (max-width:560px){.big{font-size:24px}.stat b{font-size:17px}.round{width:60px;height:60px}.keys{font-size:12px}}
@media (prefers-reduced-motion:reduce){.screen h1{animation:none}}
`;
function injectCSS() {
  if ($('engine-css')) return;
  const s = document.createElement('style'); s.id = 'engine-css'; s.textContent = BASE_CSS;
  document.head.insertBefore(s, document.head.firstChild);
}
function mountOverlays() {
  const add = (html) => { const d = document.createElement('div'); d.innerHTML = html; while (d.firstChild) document.body.appendChild(d.firstChild); };
  if (!$('dmg')) add('<div id="dmg"></div><div id="flash"></div><div id="pops"></div>');
  if (!$('banner')) add('<div id="banner"><div class="bl"></div><h2 id="bnT"></h2><p id="bnS"></p><div class="bl"></div></div>');
}

/* ================= shaders ================= */
const SKY_FS = `uniform vec3 sunDir, zen, mid, hor, sunCol; uniform float time, stars, aurora, nebula, sunSize; varying vec3 vD;
float hash(vec3 p){ p=fract(p*.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*n2(p); p*=2.03; a*=.5; } return s; }
void main(){
  float h = vD.y;
  vec3 c = mix(hor, mid, smoothstep(.0,.16,h));
  c = mix(c, zen, smoothstep(.12,.6,h));
  c = mix(c, hor*.65, smoothstep(.0,-.1,h));
  float st = step(.9965, hash(floor(vD*460.))) * (nebula > .5 ? 1. : smoothstep(.04,.4,h));
  c += st * stars * (.55 + .45*sin(time*3. + hash(floor(vD*460.)+3.)*40.));
  float az = atan(vD.x, -vD.z);
  if (aurora > 0.) {
    vec3 au = vec3(0.);
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float wv = sin(az*3. + time*.18 + fk*1.7)*.07 + n2(vec2(az*4. + fk*9., time*.12))*.09;
      float base = .2 + fk*.09 + wv;
      float band = smoothstep(base-.02, base, h) * (1. - smoothstep(base, base+.3+fk*.06, h));
      float rays = .45 + .55*n2(vec2(az*44. + fk*13., time*.6 + h*2.));
      float fade = smoothstep(-1.2,-.3,az) * (1. - smoothstep(.9,1.8,az));
      au += mix(vec3(.15,1.,.55), vec3(.6,.3,1.), smoothstep(base, base+.28, h)) * band * rays * fade * (.5 - fk*.1);
    }
    c += au * .85 * aurora;
  }
  if (nebula > 0.) {
    vec2 q = vec2(az*1.6, h*3.);
    float n = fbm(q*1.3 + time*.01), m = fbm(q*2.2 - 4.);
    c += vec3(.5,.12,.6)*pow(n,2.5)*nebula*1.4 + vec3(.05,.35,.6)*pow(m,3.)*nebula*1.6;
  }
  float s = max(dot(vD, sunDir), 0.);
  c += sunCol*pow(s,6.)*.35 + sunCol*pow(s,60.)*.5;
  c += smoothstep(1.-sunSize, 1.-sunSize*.6, s)*sunCol*1.4;
  gl_FragColor = vec4(c,1.);
}`;
const GROUND_FS = `uniform float time, scrollX, scrollZ, fogNear, fogFar, scale, bump, spec, gridA, waves, lava;
uniform vec3 sunDir, fogColor, colA, colB, specCol, gridCol; varying vec3 vW;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float H(vec2 p){ float t = time*waves; return noise(p+t*.12)*.55 + noise(p*2.3-t*.18)*.3 + noise(p*5.7+vec2(t*.35,0.))*.15; }
void main(){
  vec2 wp = vec2(vW.x + scrollX, vW.z - scrollZ);
  vec2 p = wp * scale;
  float h0 = H(p), hx = H(p+vec2(.04,0.)), hz = H(p+vec2(0.,.04));
  vec3 N = normalize(vec3((h0-hx)*bump, 1., (h0-hz)*bump));
  vec3 V = normalize(cameraPosition - vW);
  float fr = pow(1.-max(dot(N,V),0.), 4.);
  vec3 c = mix(colA, colB, clamp(h0*1.4-.2,0.,1.));
  c = mix(c, colB*1.2, fr*.6);
  float dif = max(dot(N, sunDir), 0.)*.35 + .65;
  c *= dif;
  vec3 R = reflect(-V, N);
  c += specCol*pow(max(dot(R, sunDir),0.), 140.)*3.*spec + specCol*pow(max(dot(R,sunDir),0.),12.)*.15*spec;
  if (lava > 0.) { float cr = smoothstep(.62,.7, noise(p*.7+3.)) * (1.-smoothstep(.7,.8,noise(p*.7+3.))); float pulse = .7+.3*sin(time*2.+p.x*3.); c += vec3(1.,.35,.05)*cr*lava*pulse*2.2; }
  if (gridA > 0.) { vec2 g = abs(fract(wp/12.)-.5); float gl = smoothstep(.47,.5,max(g.x,g.y)); c += gridCol*gl*gridA; }
  float d = length(vW.xz - cameraPosition.xz);
  c = mix(c, fogColor, smoothstep(fogNear, fogFar, d));
  gl_FragColor = vec4(c,1.);
}`;
const PV = `attribute float size; attribute vec4 col; uniform float scale; varying vec4 vC;
void main(){ vC = col; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = size*scale/max(.5,-mv.z); gl_Position = projectionMatrix*mv; }`;
const PFA = `varying vec4 vC; void main(){ float d = length(gl_PointCoord-.5); if(d>.5) discard; float a = smoothstep(.5,0.,d); a*=a;
  vec3 c = mix(vC.rgb, vec3(1.), smoothstep(.22,0.,d)*.75); gl_FragColor = vec4(c, vC.a*a); }`;
const PFS = `varying vec4 vC; void main(){ float d = length(gl_PointCoord-.5); if(d>.5) discard; float a = smoothstep(.5,.1,d); gl_FragColor = vec4(vC.rgb, vC.a*a*.9); }`;

const hexToArr = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

function create(opt) {
  opt = opt || {};
  injectCSS(); mountOverlays();
  if (!window.THREE) throw new Error('THREE missing');
  const canvas = opt.canvas || $('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const scene = new THREE.Scene();
  const FOG = new THREE.Color(opt.fog != null ? opt.fog : 0x0c2a3e);
  scene.fog = new THREE.Fog(FOG, opt.fogNear || 140, opt.fogFar || 1050);
  const baseFov = opt.fov || 66;
  const camera = new THREE.PerspectiveCamera(baseFov, 1, .5, opt.far || 2600);
  const SUN = new THREE.Vector3().fromArray(opt.sunDir || [-.46, .2, -1]).normalize();
  const L = Object.assign({ hemiSky: 0x7fd8ff, hemiGround: 0x0a2030, hemiI: .85, sun: 0xcfe6ff, sunI: 1.7, fill: 0x4dffb0, fillI: .55 }, opt.lights || {});
  scene.add(new THREE.HemisphereLight(L.hemiSky, L.hemiGround, L.hemiI));
  const sunL = new THREE.DirectionalLight(L.sun, L.sunI); sunL.position.copy(SUN).multiplyScalar(100); scene.add(sunL);
  const fillL = new THREE.DirectionalLight(L.fill, L.fillI); fillL.position.set(.3, 1, 1); scene.add(fillL);

  /* sky */
  const S = Object.assign({ zen: 0x01030b, mid: 0x05121f, hor: 0x0f3345, sunCol: 0xd8e8ff, stars: 1, aurora: 0, nebula: 0, sunSize: .0008 }, opt.sky || {});
  const skyU = { sunDir: { value: SUN }, time: { value: 0 }, zen: { value: new THREE.Color(S.zen) }, mid: { value: new THREE.Color(S.mid) }, hor: { value: new THREE.Color(S.hor) }, sunCol: { value: new THREE.Color(S.sunCol) }, stars: { value: S.stars }, aurora: { value: S.aurora }, nebula: { value: S.nebula }, sunSize: { value: S.sunSize } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: SKY_FS
  }));
  sky.renderOrder = -10; scene.add(sky);

  /* ground (optional) */
  let ground = null, groundU = null;
  if (opt.ground) {
    const g = Object.assign({ y: -22, colA: 0x020a14, colB: 0x0f3a46, specCol: 0xbfe0ff, gridCol: 0xff2bd6, scale: .045, bump: 5, spec: 1, grid: 0, waves: 1, lava: 0 }, opt.ground);
    groundU = { time: { value: 0 }, scrollX: { value: 0 }, scrollZ: { value: 0 }, sunDir: { value: SUN }, fogColor: { value: FOG }, fogNear: { value: (opt.fogNear || 140) + 20 }, fogFar: { value: (opt.fogFar || 1050) + 100 },
      scale: { value: g.scale }, bump: { value: g.bump }, spec: { value: g.spec }, gridA: { value: g.grid }, waves: { value: g.waves }, lava: { value: g.lava },
      colA: { value: new THREE.Color(g.colA) }, colB: { value: new THREE.Color(g.colB) }, specCol: { value: new THREE.Color(g.specCol) }, gridCol: { value: new THREE.Color(g.gridCol) } };
    ground = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.ShaderMaterial({
      uniforms: groundU, fog: false,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: GROUND_FS
    }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = g.y; ground.renderOrder = -5; scene.add(ground);
  }

  /* post */
  const composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  const B = Object.assign({ strength: .85, radius: .5, threshold: .78 }, opt.bloom || {});
  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), B.strength, B.radius, B.threshold);
  composer.addPass(bloom);
  const finalPass = new THREE.ShaderPass({
    uniforms: { tDiffuse: { value: null }, ca: { value: .0016 }, time: { value: 0 }, dmg: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float ca, time, dmg; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec2 d = vUv-.5; float r2 = dot(d,d); vec2 off = d*ca*(1.+r2*5.);
      vec3 c = vec3(texture2D(tDiffuse,vUv+off).r, texture2D(tDiffuse,vUv).g, texture2D(tDiffuse,vUv-off).b);
      c *= 1. - smoothstep(.16,.72,r2)*.6; c = mix(c, vec3(1.,.12,.28), dmg*smoothstep(.04,.45,r2));
      c += (h(vUv*vec2(1733.,977.)+fract(time))-.5)*.03; gl_FragColor = vec4(c,1.); }`
  });
  composer.addPass(finalPass);

  /* particles */
  class Pool {
    constructor(n, additive) {
      this.n = n; this.i = 0;
      const F = k => new Float32Array(n * k);
      this.pos = F(3); this.col = F(4); this.size = F(1); this.v = F(3);
      this.life = F(1); this.max = F(1); this.s0 = F(1); this.s1 = F(1); this.a0 = F(1); this.drag = F(1); this.grav = F(1);
      const g = new THREE.BufferGeometry();
      const at = (arr, k) => new THREE.BufferAttribute(arr, k).setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('position', at(this.pos, 3)); g.setAttribute('col', at(this.col, 4)); g.setAttribute('size', at(this.size, 1));
      this.mat = new THREE.ShaderMaterial({ uniforms: { scale: { value: 400 } }, vertexShader: PV, fragmentShader: additive ? PFA : PFS, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
      this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = additive ? 3 : 2;
      this.g = g; scene.add(this.pts);
    }
    emit(x, y, z, vx, vy, vz, life, s0, s1, r, gg, b, a, drag, grav) {
      const i = this.i; this.i = (i + 1) % this.n;
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
      this.life[i] = this.max[i] = life; this.s0[i] = s0; this.s1[i] = s1;
      this.col[i * 4] = r; this.col[i * 4 + 1] = gg; this.col[i * 4 + 2] = b; this.a0[i] = a;
      this.drag[i] = drag || 1; this.grav[i] = grav || 0;
    }
    update(dt) {
      const { pos, v, life, max, size, col, s0, s1, a0, drag, grav } = this;
      for (let i = 0; i < this.n; i++) {
        if (life[i] <= 0) { if (size[i] !== 0) size[i] = 0; continue; }
        life[i] -= dt;
        if (life[i] <= 0) { size[i] = 0; continue; }
        const k = life[i] / max[i];
        if (drag[i] !== 1) { const f = Math.pow(drag[i], dt * 60); v[i * 3] *= f; v[i * 3 + 1] *= f; v[i * 3 + 2] *= f; }
        v[i * 3 + 1] -= grav[i] * dt;
        pos[i * 3] += v[i * 3] * dt; pos[i * 3 + 1] += v[i * 3 + 1] * dt; pos[i * 3 + 2] += v[i * 3 + 2] * dt;
        size[i] = s1[i] + (s0[i] - s1[i]) * k;
        col[i * 4 + 3] = a0[i] * Math.min(1, k * 1.6);
      }
      this.g.attributes.position.needsUpdate = true; this.g.attributes.size.needsUpdate = true; this.g.attributes.col.needsUpdate = true;
    }
    clear() { this.life.fill(0); this.size.fill(0); }
  }
  const FX = new Pool(opt.fxCount || 6000, true), SMOKE = new Pool(opt.smokeCount || 1400, false);
  const COL = { orange: hexToArr(0xff7a2a), gold: hexToArr(0xffc861), red: hexToArr(0xff4d2e), cyan: hexToArr(0x4fe6ff), pink: hexToArr(0xff4f8b), purple: hexToArr(0xc77dff), white: [1, 1, 1], amber: hexToArr(0xffa04a), green: hexToArr(0x5dffb4), blue: hexToArr(0x4a8cff) };
  function glowP(x, y, z, vx, vy, vz, life, s0, s1, c, a, drag, grav) { FX.emit(x, y, z, vx, vy, vz, life, s0, s1, c[0], c[1], c[2], a == null ? 1 : a, drag, grav); }
  function smokeP(x, y, z, vx, vy, vz, life, s0, s1, c, a, drag) { c = c || [.08, .07, .1]; SMOKE.emit(x, y, z, vx, vy, vz, life, s0, s1, c[0], c[1], c[2], a == null ? .55 : a, drag || .97); }
  function sparks(x, y, z, c, n, sp, vx, vy, vz) {
    for (let i = 0; i < n; i++) glowP(x, y, z, rand(-1, 1) * sp + (vx || 0), rand(-1, 1) * sp + (vy || 0), rand(-1, 1) * sp + (vz || 0), rand(.12, .3), rand(.8, 1.4), .1, c, 1, .9);
  }

  /* rings / lights / debris */
  const ringGeo = new THREE.RingGeometry(.86, 1, 64);
  const rings = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.visible = false; m.renderOrder = 4; scene.add(m); rings.push({ m, life: 0 });
  }
  let ringI = 0;
  // flat=true lays the ring on the ground plane (top-down games); otherwise it faces the camera
  function ring(x, y, z, r0, r1, life, color, vx, vy, vz, flat) {
    const r = rings[ringI = (ringI + 1) % rings.length];
    Object.assign(r, { x, y, z, r0, r1, life, max: life, vx: vx || 0, vy: vy || 0, vz: vz || 0, flat: !!flat });
    r.m.material.color.set(color); r.m.visible = true;
  }
  const lights = [];
  for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffa060, 0, 140, 2); scene.add(l); lights.push(l); }
  let lightI = 0;
  function lightFlash(x, y, z, power, color) { const l = lights[lightI = (lightI + 1) % lights.length]; l.position.set(x, y, z); l.intensity = power; l.color.set(color || 0xffa060); }
  const debGeo = new THREE.TetrahedronGeometry(1);
  const debMat = new THREE.MeshStandardMaterial({ color: 0x2b2f44, emissive: 0xff5a1a, emissiveIntensity: .7, flatShading: true, metalness: .4, roughness: .6 });
  const debris = [];
  for (let i = 0; i < 90; i++) { const m = new THREE.Mesh(debGeo, debMat); m.visible = false; scene.add(m); debris.push({ m, life: 0, v: new THREE.Vector3(), s: new THREE.Vector3() }); }
  let debI = 0;
  let debrisFloor = -1e9; // games with a floor set G.setDebrisFloor(y)

  /* juice state */
  const J = { trauma: 0, hitStop: 0, slowT: 0, timeScale: 1, flashA: 0, dmgA: 0, fovKick: 0, worldVel: new THREE.Vector3() };
  function shake(v) { J.trauma = Math.min(1, J.trauma + (reduceMotion ? v * .25 : v)); }
  function flash(a) { J.flashA = Math.max(J.flashA, a); }
  function hurtFx(a) { J.dmgA = Math.max(J.dmgA, a == null ? 1 : a); }
  function hitStop(t) { J.hitStop = Math.max(J.hitStop, t); }
  function slowMo(t) { J.slowT = Math.max(J.slowT, t); }
  function fovKick(v) { J.fovKick = Math.max(J.fovKick, v); }

  // s = size (1 small, 3 big, 6 huge). vel = [vx,vy,vz] of the exploding thing (keeps fx moving with it).
  function explode(x, y, z, s, colr, vel) {
    s = s || 1; colr = colr || COL.orange; vel = vel || [0, 0, 0];
    const [vx, vy, vz] = vel, wv = J.worldVel;
    const rs = Math.sqrt(s);
    glowP(x, y, z, vx, vy, vz, .22, 26 * s, 40 * s, [1, .95, .85], 1);
    ring(x, y, z, 1, 14 * s, .55 * rs, 0xffc070, vx * .6, vy * .6, vz * .6);
    if (s > 2) ring(x, y, z, 2, 28 * s, .9 * rs, 0xff7040, vx * .4, vy * .4, vz * .4);
    for (let i = 0; i < 26 * s; i++) {
      const th = rand(0, TAU), ph = Math.acos(rand(-1, 1)), sp = rand(25, 90) * rs;
      glowP(x, y, z, Math.sin(ph) * Math.cos(th) * sp + vx, Math.cos(ph) * sp + vy, Math.sin(ph) * Math.sin(th) * sp + vz, rand(.3, .7), rand(1.2, 2.4), .2, Math.random() < .5 ? COL.gold : colr, 1, .93);
    }
    for (let i = 0; i < 10 * s; i++) {
      const r = 2.5 * rs;
      glowP(x + rand(-r, r), y + rand(-r, r), z + rand(-r, r), vx + rand(-12, 12), vy + rand(-12, 12), vz + rand(-12, 12), rand(.35, .8), rand(5, 10) * Math.pow(s, .6), rand(12, 18) * Math.pow(s, .6), pick([COL.orange, COL.red, COL.gold]), .8, .95);
    }
    for (let i = 0; i < 6 * s; i++) {
      const r = 2 * rs;
      SMOKE.emit(x + rand(-r, r), y + rand(-r, r), z + rand(-r, r), rand(-5, 5) + vx * .3 + wv.x, rand(2, 9) + wv.y, vz * .3 + wv.z, rand(1, 1.8), rand(4, 7) * Math.pow(s, .6), rand(16, 26) * Math.pow(s, .6), .08, .07, .1, .55, .97);
    }
    for (let i = 0; i < 4 * s && i < 24; i++) {
      const d = debris[debI = (debI + 1) % debris.length];
      d.life = rand(1, 1.8); d.m.visible = true; d.m.position.set(x, y, z);
      const sz = rand(.3, .9) * rs; d.m.scale.set(sz, sz * rand(.5, 1.2), sz);
      d.v.set(rand(-1, 1), rand(-.4, 1.2), rand(-1, 1)).multiplyScalar(rand(18, 50) * rs); d.v.x += vx; d.v.y += vy; d.v.z += vz;
      d.s.set(rand(-9, 9), rand(-9, 9), rand(-9, 9));
    }
    lightFlash(x, y, z, 6 * s, 0xffa060);
    shake(.1 * s);
  }

  /* model helpers */
  const GEO = {
    oct: new THREE.OctahedronGeometry(1, 0), box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
    cone: new THREE.ConeGeometry(1, 1, 10), sph: new THREE.SphereGeometry(1, 16, 12), ico: new THREE.IcosahedronGeometry(1, 0),
    tor: new THREE.TorusGeometry(1, .12, 8, 32), dod: new THREE.DodecahedronGeometry(1, 0),
  };
  function shapeGeo(pts, depth, axis) {
    const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]));
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2);
    if (axis === 'y') g.rotateX(Math.PI / 2); else if (axis === 'x') g.rotateY(-Math.PI / 2);
    return g;
  }
  const M = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, metalness: .55, roughness: .42, flatShading: true, side: THREE.DoubleSide }, o || {}));
  const E = color => new THREE.MeshBasicMaterial({ color });
  function part(g, geo, mat, p, s, r) {
    const m = new THREE.Mesh(geo, mat);
    if (p) m.position.set(p[0], p[1], p[2]); if (s) m.scale.set(s[0], s[1], s[2]); if (r) m.rotation.set(r[0], r[1], r[2]);
    g.add(m); return m;
  }
  const mirror = (g, geo, mat, p, s, r) => { part(g, geo, mat, p, s, r); const q = p ? [-p[0], p[1], p[2]] : null, ss = s ? [-s[0], s[1], s[2]] : [-1, 1, 1], rr = r ? [r[0], -r[1], -r[2]] : null; return part(g, geo, mat, q, ss, rr); };
  function rockGeo(jitter) {
    jitter = jitter == null ? .28 : jitter;
    const g = new THREE.IcosahedronGeometry(1, 1), pos = g.attributes.position, map = {};
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), k = x.toFixed(3) + ',' + y.toFixed(3) + ',' + z.toFixed(3);
      const o = map[k] || (map[k] = [rand(-jitter, jitter), rand(-jitter * .7, jitter * .7), rand(-jitter, jitter)]);
      pos.setXYZ(i, x + o[0], y + o[1], z + o[2]);
    }
    g.computeVertexNormals(); return g;
  }
  function matsOf(g) { const list = []; g.traverse(o => { if (o.isMesh && o.material.isMeshStandardMaterial && !list.includes(o.material)) list.push(o.material); }); return list; }
  function setFlash(mats, k) { for (const mt of mats) mt.emissive.setRGB(k, k, k); }
  function disposeGroup(g) { scene.remove(g); g.traverse(o => { if (o.isMesh && o.material && o.material !== debMat) o.material.dispose && o.material.dispose(); }); }
  function cloudTex(rgba) {
    const s = document.createElement('canvas'); s.width = s.height = 256; const g = s.getContext('2d');
    for (let i = 0; i < 26; i++) {
      const a = rand(0, TAU), d = Math.sqrt(Math.random()) * 70, x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d * .55, r = rand(30, 58);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,.42)'); gr.addColorStop(.6, 'rgba(255,255,255,.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    return new THREE.CanvasTexture(s);
  }
  function glowTex() {
    const s = document.createElement('canvas'); s.width = s.height = 128; const g = s.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(s);
  }

  /* audio */
  let AC = null, master = null, noiseBuf = null, muted = false, lastBoom = 0, droneGain = null;
  function initAudio() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = .45;
      const comp = AC.createDynamicsCompressor(); master.connect(comp); comp.connect(AC.destination);
      noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opt.droneFreq || 260;
      droneGain = AC.createGain(); droneGain.gain.value = 0;
      s.connect(f); f.connect(droneGain); droneGain.connect(master); s.start();
    } catch (e) { AC = null; }
  }
  function tone(f, dur, type, vol, f2, delay) {
    if (!AC || muted) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .05);
  }
  function noise(dur, vol, f, type, f2) {
    if (!AC || muted) return;
    const t = AC.currentTime, s = AC.createBufferSource(); s.buffer = noiseBuf;
    const fl = AC.createBiquadFilter(); fl.type = type || 'lowpass'; fl.frequency.setValueAtTime(f, t); fl.frequency.exponentialRampToValueAtTime(f2 || 50, t + dur);
    const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(master); s.start(t, rand(0, 1)); s.stop(t + dur);
  }
  function boom(dur, vol, f) { const now = performance.now(); if (now - lastBoom < 35) return; lastBoom = now; noise(dur, vol, f); }
  const sfx = {
    shoot: () => tone(rand(780, 860), .05, 'triangle', .028, 380),
    hit: () => tone(1500, .03, 'square', .018, 900),
    pop: () => { boom(.45, .38, 2400); tone(170, .22, 'sawtooth', .05, 55); },
    big: () => { boom(1.2, .75, 1600); tone(80, .7, 'sawtooth', .12, 28); },
    hurt: () => { boom(.45, .55, 700); tone(280, .3, 'square', .08, 70); },
    power: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .12, 'square', .045, 0, i * .06)),
    coin: () => { tone(1320, .07, 'square', .035); tone(1760, .12, 'square', .035, 0, .05); },
    bomb: () => { boom(1.8, .9, 3200); tone(55, 1.4, 'sine', .32, 22); },
    warn: () => [0, .4, .8, 1.2].forEach(d => tone(440, .28, 'sawtooth', .07, 330, d)),
    whoosh: () => noise(.7, .25, 300, 'bandpass', 3000),
    dash: () => noise(.45, .18, 2400, 'bandpass', 400),
    jump: () => tone(300, .18, 'triangle', .06, 700),
    enemyShot: () => tone(rand(300, 340), .08, 'sawtooth', .02, 160),
    start: () => { tone(330, .25, 'sawtooth', .06, 660); noise(.7, .25, 300, 'bandpass', 3000); },
  };
  function setMuted(m) { muted = m; if (droneGain) droneGain.gain.value = 0; }
  function setDrone(v) { if (droneGain && !muted) droneGain.gain.value = v; }

  /* screen projection / popups / banner */
  let W = 1, H = 1;
  const _v = new THREE.Vector3();
  function toScreen(x, y, z) { _v.set(x, y, z).project(camera); return [(_v.x * .5 + .5) * W, (-_v.y * .5 + .5) * H, _v.z < 1]; }
  const pops = [];
  function popText(x, y, z, text, color, size, vel) {
    if (pops.length > 24) { const o = pops.shift(); o.el.remove(); }
    const el = document.createElement('div'); el.className = 'pop'; el.textContent = text; el.style.color = color || '#fff'; el.style.fontSize = (size || 14) + 'px';
    $('pops').appendChild(el); const wv = vel || [J.worldVel.x * .25, 0, J.worldVel.z * .25];
    pops.push({ el, x, y, z, life: 1, vx: wv[0], vz: wv[2] });
  }
  function updatePops(dt) {
    for (let i = pops.length - 1; i >= 0; i--) {
      const q = pops[i]; q.life -= dt; q.y += 6 * dt; q.z += q.vz * dt; q.x += q.vx * dt;
      if (q.life <= 0) { q.el.remove(); pops.splice(i, 1); continue; }
      const [sx, sy, ok] = toScreen(q.x, q.y, q.z);
      q.el.style.opacity = ok ? Math.min(1, q.life * 2.5) : 0;
      q.el.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-50%) scale(${1 + (1 - q.life) * .2})`;
    }
  }
  function clearPops() { for (const q of pops) q.el.remove(); pops.length = 0; }
  function showBanner(text, sub, color, warn) {
    const b = $('banner'); const dur = warn ? 3.2 : 2.4;
    b.style.setProperty('--bc', color || 'var(--accent)'); b.style.setProperty('--dur', dur + 's');
    $('bnT').textContent = text; $('bnS').textContent = sub || '';
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  }

  /* best score */
  function loadBest(key) { try { return +localStorage.getItem(key) || 0; } catch (e) { return 0; } }
  function saveBest(key, v) { try { localStorage.setItem(key, String(v)); } catch (e) {} }

  /* camera shake helper: call after positioning + lookAt */
  function applyShake(rollExtra) {
    const tr = J.trauma * J.trauma * (reduceMotion ? .3 : 1);
    if (tr > 0) { camera.position.x += rand(-1, 1) * tr * 2.4; camera.position.y += rand(-1, 1) * tr * 2.4; camera.position.z += rand(-1, 1) * tr * 2.4; }
    camera.rotateZ((rollExtra || 0) + (tr > 0 ? rand(-1, 1) * tr * .04 : 0));
  }

  /* resize */
  function resize() {
    W = innerWidth; H = innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, 1.6);
    renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
    if (composer.setPixelRatio) composer.setPixelRatio(pr);
    composer.setSize(W, H);
    bloom.setSize(W * pr / 2, H * pr / 2);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    const sc = H * pr / (2 * Math.tan(camera.fov * Math.PI / 360));
    FX.mat.uniforms.scale.value = sc; SMOKE.mat.uniforms.scale.value = sc;
  }
  addEventListener('resize', resize);
  resize();

  /* internal fx update */
  const G = {
    THREE, scene, camera, renderer, composer, bloom, finalPass, sky, skyU, ground, groundU, SUN, FOG,
    FX, SMOKE, COL, C: hexToArr, glowP, smokeP, sparks, ring, lightFlash, explode, debris,
    GEO, M, E, part, mirror, shapeGeo, rockGeo, matsOf, setFlash, disposeGroup, cloudTex, glowTex,
    J, shake, flash, hurtFx, hitStop, slowMo, fovKick, applyShake,
    initAudio, tone, noise, boom, sfx, setMuted, setDrone, get muted() { return muted; },
    toScreen, popText, clearPops, showBanner, loadBest, saveBest,
    get W() { return W; }, get H() { return H; }, baseFov,
    paused: false, time: 0,
    setDebrisFloor(y) { debrisFloor = y; },
    clearFx() { FX.clear(); SMOKE.clear(); for (const r of rings) { r.life = 0; r.m.visible = false; } for (const d of debris) { d.life = 0; d.m.visible = false; } clearPops(); },
  };

  function fxUpdate(dt, rdt) {
    G.time += dt;
    skyU.time.value = G.time; if (groundU) groundU.time.value = G.time;
    for (const r of rings) {
      if (r.life <= 0) continue;
      r.life -= dt; if (r.life <= 0) { r.m.visible = false; continue; }
      const k = r.life / r.max, e = 1 - Math.pow(k, 3);
      r.x += r.vx * dt; r.y += r.vy * dt; r.z += r.vz * dt;
      r.m.position.set(r.x, r.y, r.z);
      if (r.flat) r.m.rotation.set(-Math.PI / 2, 0, 0); else r.m.lookAt(camera.position);
      const sc = r.r0 + (r.r1 - r.r0) * e; r.m.scale.set(sc, sc, sc);
      r.m.material.opacity = k * k;
    }
    const wv = J.worldVel;
    for (const d of debris) {
      if (d.life <= 0) continue;
      d.life -= dt; if (d.life <= 0) { d.m.visible = false; continue; }
      d.v.y -= 30 * dt; d.v.multiplyScalar(Math.pow(.985, dt * 60));
      d.m.position.addScaledVector(d.v, dt);
      if (d.m.position.y < debrisFloor) { d.m.position.y = debrisFloor; d.v.y *= -.35; d.v.x *= .7; d.v.z *= .7; }
      d.m.rotation.x += d.s.x * dt; d.m.rotation.y += d.s.y * dt; d.m.rotation.z += d.s.z * dt;
      if (Math.random() < .4) SMOKE.emit(d.m.position.x, d.m.position.y, d.m.position.z, wv.x * .5, 1 + wv.y * .5, wv.z * .5, .6, 1, 3, .1, .08, .1, .45, .97);
    }
    for (const l of lights) l.intensity *= Math.pow(.0005, dt);
    FX.update(dt); SMOKE.update(dt);
    updatePops(rdt);
    J.trauma = Math.max(0, J.trauma - rdt * 1.4);
    J.flashA = Math.max(0, J.flashA - rdt * 2.4);
    J.dmgA = Math.max(0, J.dmgA - rdt * 1.6);
    J.fovKick = Math.max(0, J.fovKick - rdt * 20);
    if (J.slowT > 0) J.slowT -= rdt;
  }

  /* main loop. hooks: update(dt, rdt), camera(rdt), draw(), hud() */
  G.start = function (hooks) {
    let last = performance.now();
    function frame(now) {
      requestAnimationFrame(frame);
      const rdt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
      if (!G.paused) {
        if (J.hitStop > 0) { J.hitStop -= rdt; J.trauma = Math.max(0, J.trauma - rdt); }
        else {
          const target = J.slowT > 0 ? .28 : 1;
          J.timeScale += (target - J.timeScale) * Math.min(1, rdt * (target < 1 ? 12 : 2.5));
          const dt = rdt * J.timeScale;
          if (hooks.update) hooks.update(dt, rdt);
          fxUpdate(dt, rdt);
        }
        if (hooks.camera) hooks.camera(rdt);
        const fov = baseFov + J.fovKick + (J.slowT > 0 ? -6 : 0);
        if (Math.abs(camera.fov - fov) > .05) { camera.fov += (fov - camera.fov) * damp(6, rdt); camera.updateProjectionMatrix(); }
        sky.position.copy(camera.position);
        finalPass.uniforms.time.value = now / 1000;
      }
      if (hooks.draw) hooks.draw();
      composer.render();
      $('flash').style.opacity = J.flashA.toFixed(3);
      $('dmg').style.opacity = J.dmgA.toFixed(3);
      finalPass.uniforms.dmg.value = J.dmgA * .6;
      finalPass.uniforms.ca.value = .0016 + J.trauma * .006 + J.dmgA * .004 + J.fovKick * .0002;
      if (hooks.hud) hooks.hud();
    }
    requestAnimationFrame(frame);
  };
  return G;
}

/* Common page wiring: pause on hidden tab, back link to the hub. */
function backLink() {
  const a = document.createElement('a');
  a.className = 'mini backlink'; a.href = '../index.html'; a.textContent = '← 게임 목록';
  a.addEventListener('click', e => { if (document.referrer && history.length > 1) { e.preventDefault(); history.back(); } });
  document.body.appendChild(a); return a;
}

window.ENGINE = { create, backLink, util: { TAU, rand, pick, clamp, lerp, damp, reduceMotion, $ } };
})();

/* ===== API summary (for game authors) =====
const { rand, clamp, damp, TAU, pick, lerp, $ } = ENGINE.util;
const G = ENGINE.create({
  fog: 0x.., fogNear: 140, fogFar: 1050, fov: 66, sunDir: [x,y,z],
  lights: { hemiSky, hemiGround, hemiI, sun, sunI, fill, fillI },
  sky: { zen, mid, hor, sunCol, stars: 0..1, aurora: 0..1, nebula: 0..1, sunSize: .0008 },
  ground: { y, colA, colB, specCol, scale, bump, spec, grid: 0..1, gridCol, waves: 0..1, lava: 0..1 },  // omit for no ground
  bloom: { strength, radius, threshold },
});
Scroll ground: G.groundU.scrollZ.value += speed*dt (world moving toward +z) ; G.ground.position.x/z follow camera.
G.J.worldVel.set(0,0,speed) so smoke/debris/popups drift with scenery.
Effects: G.explode(x,y,z,size,colorArr,[vx,vy,vz]); G.sparks(x,y,z,colArr,n,speed); G.glowP(x,y,z,vx,vy,vz,life,s0,s1,colArr,alpha,drag,grav);
  G.smokeP(...); G.ring(x,y,z,r0,r1,life,hex,vx,vy,vz,flat); G.lightFlash(x,y,z,power,hex);
  G.shake(v); G.flash(a); G.hurtFx(); G.hitStop(t); G.slowMo(t); G.fovKick(deg); G.applyShake(roll) after camera.lookAt.
Models: G.part(group, G.GEO.box, G.M(0xhex,{...}), [px,py,pz], [sx,sy,sz], [rx,ry,rz]); G.mirror(...); G.E(hex) glow material;
  G.shapeGeo(pts, depth, 'y'|'x'); G.rockGeo(); G.matsOf(group) -> mats; G.setFlash(mats, k); G.disposeGroup(group).
Audio: G.initAudio() on first click; G.sfx.shoot/hit/pop/big/hurt/power/coin/bomb/warn/whoosh/dash/jump/enemyShot/start; G.tone(); G.noise();
  G.setMuted(bool); G.setDrone(v).
UI: G.showBanner(title, sub, cssColor, warn); G.popText(x,y,z,text,color,size); G.toScreen(x,y,z) -> [sx,sy,visible];
  G.loadBest(key); G.saveBest(key,v); ENGINE.backLink(); G.paused = bool;
Loop: G.start({ update(dt, rdt){}, camera(rdt){}, draw(){}, hud(){} });
CSS vars each page must set on :root: --bg --ink --dim --accent --accent2 --warn --panel --line --glow --display --ui
Prebuilt classes: .hud.tl/.tr/.bl/.br/.bc .lbl .big .num .stat .row .btns .mini .bar>i .pips .round .screen(.title) .card .kicker h1>span .sub .go .keys kbd .result .over-title .newbest .err
*/
