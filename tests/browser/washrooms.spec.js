import {test,expect} from '@playwright/test'

test('both washrooms have fittings inside their wall boundaries',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('.viewport')).toHaveAttribute('data-ready','true')
  const fixtures=await page.evaluate(async()=> (await import('/src/Washrooms.jsx')).WASHROOM_FIXTURES)
  expect(fixtures).toHaveLength(2)
  for(const [index,fixture] of fixtures.entries()) {
    const limits=index===0?[-27.17,-24.59]:[-24.38,-22.18]
    expect(fixture.toilet[0]-.55).toBeGreaterThan(limits[0])
    expect(fixture.toilet[0]+.25).toBeLessThan(limits[1])
    for(const position of [fixture.toilet,fixture.basin]) {
      expect(position[2]-.5).toBeGreaterThan(-6.06)
      expect(position[2]+.5).toBeLessThan(-1.45)
    }
  }
  await page.getByLabel('Render quality').selectOption('balanced')
  await page.getByRole('button',{name:'Top view',exact:true}).click()
  await page.waitForTimeout(1000)
  await page.screenshot({path:'test-results/washrooms-top-view.png',fullPage:true})
  expect(errors).toEqual([])
})
