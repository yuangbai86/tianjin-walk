import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** 将静态网格按“材质 + 空间格子 + 是否投影”合并，减少绘制调用 */
export function mergeStatic(root, cell = 64) {
  root.updateMatrixWorld(true)
  const groups = new Map()
  const remove = []
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return
    let p = o, skip = false
    while (p) { if (p.userData.noMerge) { skip = true; break } p = p.parent }
    if (skip) return
    if (Array.isArray(o.material)) return
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name)
    if (!g.attributes.normal) g.computeVertexNormals()
    g.applyMatrix4(o.matrixWorld)
    const wp = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld)
    const key = `${o.material.uuid}|${Math.floor(wp.x / cell)}|${Math.floor(wp.z / cell)}|${o.castShadow ? 1 : 0}`
    if (!groups.has(key)) groups.set(key, { material: o.material, cast: o.castShadow, geos: [] })
    groups.get(key).geos.push(g)
    remove.push(o)
  })
  for (const o of remove) o.parent.remove(o)
  const out = new THREE.Group()
  out.name = 'merged-static'
  for (const { material, cast, geos } of groups.values()) {
    const merged = mergeGeometries(geos, false)
    geos.forEach((g) => g.dispose())
    if (!merged) continue
    merged.computeBoundingSphere()
    const mesh = new THREE.Mesh(merged, material)
    mesh.castShadow = cast
    mesh.receiveShadow = true
    mesh.matrixAutoUpdate = false
    out.add(mesh)
  }
  root.add(out)
  return out.children.length
}
