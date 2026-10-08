import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { BoxGeometry, Mesh, MeshStandardMaterial, Group, PerspectiveCamera, Vector3 } from 'three'
import { fitDistance, fitBoxDistance, inspectModel, VIEW_DIRECTIONS } from '../src/model.js'

test('deployed GLB is byte-identical to the provided office model', async () => {
  const original = await readFile(new URL('../office plan.glb', import.meta.url))
  const deployed = await readFile(new URL('../public/models/office-plan.glb', import.meta.url))
  assert.equal(createHash('sha256').update(original).digest('hex'), createHash('sha256').update(deployed).digest('hex'))
  assert.equal(deployed.readUInt32LE(0), 0x46546c67)
  assert.equal(deployed.readUInt32LE(4), 2)
  assert.equal(deployed.readUInt32LE(8), deployed.length)
  const json = JSON.parse(deployed.subarray(20, 20 + deployed.readUInt32LE(12)).toString())
  assert.equal(json.meshes.length, 512)
  assert.equal(json.images.length, 40)
  assert.equal(json.animations?.length ?? 0, 0)
})

test('world bounds include nested transforms and shared mesh instances', () => {
  const group = new Group()
  group.position.set(-30, 2, 8)
  const geometry = new BoxGeometry(2, 4, 6)
  const material = new MeshStandardMaterial()
  const first = new Mesh(geometry, material)
  const second = new Mesh(geometry, material)
  second.position.x = 10
  group.add(first, second)
  const info = inspectModel(group)
  assert.deepEqual(info.center, [-25, 2, 8])
  assert.deepEqual(info.size, [12, 4, 6])
  assert.equal(info.meshes, 1)
  assert.equal(info.triangles, 24)
})

test('camera fitting accommodates narrow mobile aspect ratios', () => {
  const radius = 18
  const desktop = fitDistance(radius, 42, 1.7)
  const mobile = fitDistance(radius, 42, 0.6)
  assert.ok(mobile > desktop)
  const horizontalHalfAngle = Math.atan(Math.tan(42 * Math.PI / 360) * 0.6)
  assert.ok(mobile * Math.sin(horizontalHalfAngle) > radius)
})

test('all office corners stay within the viewport for every preset and mobile aspect', () => {
  const size = [24, 4, 25]
  for (const aspect of [1.5, 0.65, 2.5]) {
    for (const direction of Object.values(VIEW_DIRECTIONS)) {
      const camera = new PerspectiveCamera(42, aspect, 0.17, 600)
      camera.position.copy(new Vector3(...direction).normalize().multiplyScalar(fitBoxDistance(size, direction, 42, aspect)))
      camera.lookAt(0, 0, 0)
      camera.updateMatrixWorld()
      for (const x of [-12, 12]) for (const y of [-2, 2]) for (const z of [-12.5, 12.5]) {
        const projected = new Vector3(x, y, z).project(camera)
        assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1, `Clipped corner at aspect ${aspect} for ${direction}`)
        assert.ok(projected.z > -1 && projected.z < 1)
      }
    }
  }
  assert.ok(fitBoxDistance(size, VIEW_DIRECTIONS.perspective, 42, 1.5) < fitDistance(Math.hypot(...size) / 2, 42, 1.5))
})
