import { test, expect } from '@playwright/test'
import { VISITOR_PATH } from '../../src/tour.js'
test('visitor route clears actual lobby furniture', async ({ page }) => {
  await page.goto('/')
  const obstacles = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js')
    const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js')
    const gltf = await new GLTFLoader().loadAsync('/models/office-plan.glb')
    gltf.scene.updateMatrixWorld(true)
    const names = ['TABLE', 'SOFA', 'CUSHION_CHAIR', 'CUSHION_CHAIR001', 'RECEPTION_DESK']
    const obstacles = []
    gltf.scene.traverse(object => {
      if (!names.includes(object.name) && !object.name.startsWith('CUSHION_CHAIR')) return
      const box = new THREE.Box3().setFromObject(object)
      obstacles.push({name:object.name, min:box.min.toArray(), max:box.max.toArray()})
    })
    return obstacles
  })
  expect(obstacles.length).toBe(5)
  for (let segment=1;segment<VISITOR_PATH.length;segment++) {
    for(let sample=0;sample<=100;sample++) {
      const t=sample/100, a=VISITOR_PATH[segment-1], b=VISITOR_PATH[segment]
      const x=a[0]+(b[0]-a[0])*t,z=a[2]+(b[2]-a[2])*t
      for(const obstacle of obstacles) {
        const inside = x>obstacle.min[0]-.32 && x<obstacle.max[0]+.32 && z>obstacle.min[2]-.32 && z<obstacle.max[2]+.32
        expect(inside,`${obstacle.name} intersects route at ${x.toFixed(2)},${z.toFixed(2)}`).toBe(false)
      }
    }
  }
})
