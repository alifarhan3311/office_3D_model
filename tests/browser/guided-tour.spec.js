import {test,expect} from '@playwright/test'

test('Office tour follows a model-derived route and questions appear only at reception',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('.viewport')).toHaveAttribute('data-ready','true')
  const route=await page.evaluate(async()=>{
    const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js')
    const {buildOfficeTour,routeLength}=await import('/src/officeTour.js')
    const g=await new GLTFLoader().loadAsync('/models/office-plan.glb')
    for(const name of ['Object_2','Object_2001','Object_2002','Object_2004'])g.scene.getObjectByName(name).visible=false
    const data=buildOfficeTour(g.scene)
    return {departure:routeLength(data.departure),stops:data.stops.map(s=>({name:s.name,length:routeLength(s.path),end:s.path.at(-1)}))}
  })
  console.log('Guided route:',JSON.stringify(route))
  expect(route.stops).toHaveLength(6)
  expect(route.stops.filter(stop=>stop.name==='Meeting room')).toHaveLength(1)
  expect(route.stops.find(stop=>stop.name==='Meeting room').length).toBeLessThan(25)
  expect(route.stops.at(-1).end[2]).toBeGreaterThan(2)
  expect(Math.max(...route.stops.map(s=>s.end[2]))-Math.min(...route.stops.map(s=>s.end[2]))).toBeGreaterThan(10)
  await page.getByLabel('Render quality').selectOption('balanced')
  await page.getByRole('button',{name:'Start reception tour'}).click()
  await expect(page.getByRole('region',{name:'Reception tour'})).toBeHidden()
  await expect(page.getByText('Welcome! What brings you here today?')).toBeHidden()
  await expect(page.getByText('Welcome! What brings you here today?')).toBeVisible({timeout:30000})
  await page.getByRole('button',{name:'Office tour',exact:true}).click()
  await expect(page.getByRole('region',{name:'Reception tour'})).toBeHidden()
  await expect(page.getByText('Which department would you like to visit?')).toBeHidden()
  await expect(page.getByText('Receptionist · Guide',{exact:true})).toBeVisible()
  await expect(page.locator('canvas')).toHaveAttribute('data-guided-tour-state','walking')
  await page.getByRole('button',{name:'Pause tour',exact:true}).click()
  await expect(page.locator('canvas')).toHaveAttribute('data-guided-tour-state','paused')
  await page.getByRole('button',{name:'Resume tour',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Office tour complete',exact:true})).toBeVisible({timeout:240000})
  await expect(page.locator('canvas')).toHaveAttribute('data-guided-tour-state','complete')
  expect(Number((await page.locator('canvas').getAttribute('data-visitor-world-position')).split(',')[2])).toBeGreaterThan(2)
  await page.screenshot({path:'test-results/guided-office-tour.png',fullPage:true})
  await page.getByRole('button',{name:'End reception tour'}).click()
  await expect(page.getByRole('region',{name:'Guided office tour'})).toBeHidden()
  expect(errors).toEqual([])
})


