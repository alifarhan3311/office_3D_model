import {test,expect} from '@playwright/test'

test('glass and overlapping frame rails have stable depth settings without geometry changes',async({page})=>{
  await page.goto('/')
  await expect(page.locator('.viewport')).toHaveAttribute('data-ready','true')
  const result=await page.evaluate(async()=>{
    const {Box3}=await import('/node_modules/three/build/three.module.js')
    const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js')
    const {enhanceInteriorMaterials}=await import('/src/interiorMaterials.js')
    const g=await new GLTFLoader().loadAsync('/models/office-plan.glb')
    g.scene.updateMatrixWorld(true)
    const rails=[];g.scene.traverse(o=>{if(o.isMesh&&o.material.name==='Frame'){const b=new Box3().setFromObject(o);rails.push({o,before:[...b.min.toArray(),...b.max.toArray()]})}})
    enhanceInteriorMaterials(g.scene)
    return rails.map(({o,before})=>{const b=new Box3().setFromObject(o);return {before,after:[...b.min.toArray(),...b.max.toArray()],offset:o.material.polygonOffset,units:o.material.polygonOffsetUnits,depthWrite:o.material.depthWrite,transparent:o.material.transparent}})
  })
  expect(result.length).toBeGreaterThan(20)
  expect(new Set(result.map(rail=>rail.units)).size).toBe(4)
  for(const rail of result){expect(rail.after).toEqual(rail.before);expect(rail.offset).toBe(true);expect(rail.units).toBeLessThan(0);expect(rail.depthWrite).toBe(true);expect(rail.transparent).toBe(false)}
  await page.getByLabel('Render quality').selectOption('balanced')
  await page.getByRole('button',{name:'Zoom in',exact:true}).click()
  await page.waitForTimeout(700)
  await page.screenshot({path:'test-results/frame-joints.png',fullPage:true})
})
