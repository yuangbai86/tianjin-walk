import * as THREE from 'three'

export function createWater(w, d, segX, segZ, sunDir) {
  const geo = new THREE.PlaneGeometry(w, d, segX, segZ)
  geo.rotateX(-Math.PI / 2)
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color('#1f6f78') },
      uShallow: { value: new THREE.Color('#3f9f98') },
      uSky: { value: new THREE.Color('#cfe6dc') },
      uSun: { value: new THREE.Color('#ffd79a') },
      uSunDir: { value: sunDir.clone().normalize() },
    },
  ])
  const material = new THREE.ShaderMaterial({
    uniforms,
    fog: true,
    vertexShader: /* glsl */`
      uniform float uTime;
      varying vec3 vWorld;
      varying vec3 vNormal2;
      #include <fog_pars_vertex>
      float wave(vec2 p, vec2 dir, float freq, float speed, float amp, out vec2 grad) {
        float ph = dot(p, dir) * freq + uTime * speed;
        grad = dir * freq * amp * cos(ph);
        return amp * sin(ph);
      }
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vec2 g1, g2, g3;
        float h = wave(wp.xz, normalize(vec2(1.0, 0.3)), 0.35, 1.1, 0.07, g1)
                + wave(wp.xz, normalize(vec2(-0.4, 1.0)), 0.6, 1.6, 0.04, g2)
                + wave(wp.xz, normalize(vec2(0.8, -0.7)), 1.3, 2.3, 0.015, g3);
        wp.y += h;
        vec2 g = g1 + g2 + g3;
        vNormal2 = normalize(vec3(-g.x, 1.0, -g.y));
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uDeep, uShallow, uSky, uSun, uSunDir;
      uniform float uTime;
      varying vec3 vWorld;
      varying vec3 vNormal2;
      #include <fog_pars_fragment>
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      void main() {
        vec3 n = normalize(vNormal2);
        vec3 v = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 col = mix(uDeep, uShallow, 0.35 + 0.25 * sin(vWorld.x * 0.05 + vWorld.z * 0.08));
        col = mix(col, uSky, fres * 0.38);
        vec3 r = reflect(-v, n);
        float spec = pow(max(dot(r, normalize(uSunDir)), 0.0), 90.0);
        // 细碎闪光
        vec2 cell = floor(vWorld.xz * 1.6);
        float tw = step(0.985, hash(cell + floor(uTime * 2.0)));
        col += uSun * (spec * 1.3 + tw * spec * 3.0 + pow(max(dot(r, normalize(uSunDir)), 0.0), 8.0) * 0.12);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  })
  const mesh = new THREE.Mesh(geo, material)
  mesh.userData.noMerge = true
  return { mesh, update: (t) => { uniforms.uTime.value = t } }
}

export function createSky(sunDir) {
  const geo = new THREE.SphereGeometry(400, 32, 16)
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color('#7fb3d9') },
      uMid: { value: new THREE.Color('#f7d9b6') },
      uBottom: { value: new THREE.Color('#f3c89e') },
      uSunDir: { value: sunDir.clone().normalize() },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      uniform vec3 uTop, uMid, uBottom, uSunDir; varying vec3 vDir;
      void main(){
        float h = vDir.y;
        vec3 col = mix(uMid, uTop, smoothstep(0.02, 0.55, h));
        col = mix(uBottom, col, smoothstep(-0.1, 0.03, h));
        float s = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
        col += vec3(1.0, 0.8, 0.5) * (pow(s, 600.0) * 1.2 + pow(s, 12.0) * 0.18);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const m = new THREE.Mesh(geo, material)
  m.frustumCulled = false
  m.userData.noMerge = true
  m.renderOrder = -1
  return m
}
