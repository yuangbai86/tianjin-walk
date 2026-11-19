import * as THREE from 'three'
import { getTexture, TEX_SCALE } from './Textures.js'

// 统一配色：温暖、圆润、略带复古
export const PALETTE = {
  cream: '#f3e2c7',
  apricot: '#efc9a0',
  peach: '#f2b896',
  brick: '#b85c45',
  brickDark: '#94473a',
  roof: '#a9473a',
  roofDark: '#7f3a33',
  stone: '#d9cdb8',
  stoneDark: '#b9ab94',
  pavement: '#d8c7ab',
  road: '#9a8f86',
  grass: '#8fb573',
  leaf: '#7fae6a',
  leafDark: '#5f9358',
  leafLight: '#a3c47a',
  trunk: '#7a5a43',
  water: '#3f9a9a',
  vintageBlue: '#3f6f9a',
  signYellow: '#f2c14e',
  white: '#fbf6ec',
  glass: '#4f6676',
  glassWarm: '#ffd9a0',
  iron: '#3d4447',
  wood: '#a0714f',
  woodLight: '#c99a6c',
  green: '#4e8a5c',
  red: '#d0573f',
}

const cache = new Map()

/** 共享材质：同色同参数只创建一次，便于合批 */
export function mat(color, opts = {}) {
  const K = ['roughness', 'metalness', 'flat', 'emissive', 'emissiveIntensity', 'transparent', 'opacity', 'side', 'tex', 'texScale', 'grime', 'vertexColors']
  const key = color + '|' + K.map((k) => opts[k] ?? '').join('|')
  if (cache.has(key)) return cache.get(key)
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0,
    flatShading: opts.flat ?? true,
    emissive: opts.emissive ? new THREE.Color(opts.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    vertexColors: !!opts.vertexColors,
  })
  m.name = key
  if (opts.tex) applyTriplanar(m, opts.tex, opts.texScale ?? TEX_SCALE[opts.tex] ?? 1, opts.grime ?? true)
  cache.set(key, m)
  return m
}

/**
 * 世界坐标三平面贴图：合并后的静态几何没有 UV 也能贴砖、贴瓦。
 * 墙根略微加深（像真实街道的墙脚污渍），让建筑更有“落地感”。
 */
function applyTriplanar(m, texName, scale, grime) {
  const tex = getTexture(texName)
  m.userData.tex = texName
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTex = { value: tex }
    shader.uniforms.uTexScale = { value: scale }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTPos;\nvarying vec3 vTNrm;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 tpw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          tpw = instanceMatrix * tpw;
        #endif
        vTPos = (modelMatrix * tpw).xyz;
        vTNrm = normalize(mat3(modelMatrix) * objectNormal);`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTPos;\nvarying vec3 vTNrm;\nuniform sampler2D uTex;\nuniform float uTexScale;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 tw = pow(abs(normalize(vTNrm)), vec3(6.0));
          tw /= (tw.x + tw.y + tw.z + 1e-5);
          vec3 tp = vTPos * uTexScale;
          vec4 tc = texture2D(uTex, tp.zy) * tw.x + texture2D(uTex, tp.xz) * tw.y + texture2D(uTex, tp.xy) * tw.z;
          diffuseColor.rgb *= tc.rgb;
          ${grime ? 'diffuseColor.rgb *= mix(1.0, mix(0.78, 1.0, smoothstep(0.05, 1.1, vTPos.y)), 1.0 - tw.y);' : ''}
        }`)
  }
  m.customProgramCacheKey = () => 'tri-' + texName + (grime ? 'g' : '')
}

export function allMaterials() {
  return [...cache.values()]
}
