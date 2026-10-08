import { Box3, Vector3 } from 'three'

export function inspectModel(scene, animations = []) {
  scene.updateMatrixWorld(true)
  const bounds = new Box3().setFromObject(scene)
  const size = bounds.getSize(new Vector3())
  const center = bounds.getCenter(new Vector3())
  const meshes = new Set(), materials = new Set(), textures = new Set()
  let objects = 0, triangles = 0
  scene.traverse(object => {
    objects++
    if (!object.isMesh) return
    meshes.add(object.geometry)
    triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material)
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value)
    }
  })
  return { size: size.toArray(), center: center.toArray(), radius: size.length() / 2, objects, meshes: meshes.size, materials: materials.size, textures: textures.size, triangles: Math.round(triangles), animations: animations.map(clip => ({ name: clip.name, duration: clip.duration })) }
}

export function fitDistance(radius, verticalFov, aspect) {
  const halfVertical = verticalFov * Math.PI / 360
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * aspect)
  return radius / Math.sin(Math.min(halfVertical, halfHorizontal)) * 1.08
}

export const VIEW_DIRECTIONS = {
  perspective: [1, 1.3, 1.2],
  top: [0, 1, 0.001],
  front: [0, 0.22, 1],
  side: [1, 0.22, 0],
}

// Fit all eight bounding-box corners in the camera's actual orientation.
// A bounding sphere leaves too much empty space around a flat office plan.
export function fitBoxDistance(size, direction, verticalFov, aspect, padding = 1.12) {
  const towardCamera = new Vector3(...direction).normalize()
  const right = new Vector3().crossVectors(new Vector3(0, 1, 0), towardCamera).normalize()
  const up = new Vector3().crossVectors(towardCamera, right).normalize()
  const tanVertical = Math.tan(verticalFov * Math.PI / 360)
  const tanHorizontal = tanVertical * aspect
  let distance = 0
  for (const x of [-size[0] / 2, size[0] / 2]) {
    for (const y of [-size[1] / 2, size[1] / 2]) {
      for (const z of [-size[2] / 2, size[2] / 2]) {
        const corner = new Vector3(x, y, z)
        const depth = corner.dot(towardCamera)
        distance = Math.max(distance, depth + Math.abs(corner.dot(right)) / tanHorizontal * padding, depth + Math.abs(corner.dot(up)) / tanVertical * padding)
      }
    }
  }
  return distance
}
