import {test,expect} from '@playwright/test'

test('architectural details align with real office doors and walls',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('.viewport')).toHaveAttribute('data-ready','true')
  const details=await page.evaluate(async()=>{
    const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js')
    const {inspectArchitecture}=await import('/src/ArchitecturalDetails.jsx')
    const g=await new GLTFLoader().loadAsync('/models/office-plan.glb')
    return inspectArchitecture(g.scene)
  })
  expect(details.walls.length).toBeGreaterThanOrEqual(8)
  expect(details.doors.length).toBeGreaterThanOrEqual(12)
  for(const door of details.doors){expect(Number.isFinite(door.angle)).toBe(true);expect(door.width).toBeGreaterThan(.6);expect(door.height).toBeGreaterThan(2);expect(door.handle).toHaveLength(3)}
  await page.getByLabel('Render quality').selectOption('balanced')
  await page.waitForTimeout(800)
  await page.screenshot({path:'test-results/architectural-details.png',fullPage:true})
  expect(errors).toEqual([])
})
