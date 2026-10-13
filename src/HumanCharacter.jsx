import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils } from 'three'
import { VISITOR_SPEED } from './tour'

function Part({ position, scale, color, roughness = .85, rotation }) {
  return <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow><sphereGeometry args={[1, 20, 16]}/><meshStandardMaterial color={color} roughness={roughness}/></mesh>
}

/** Proportioned office characters; the walking footprint stays within the route's clearance. */
export default function HumanCharacter({ shirt, moving = false, phase = 0, gait, receptionist = false, receptionState }) {
  const arms = [useRef(), useRef()], thighs = [useRef(), useRef()], knees = [useRef(), useRef()]
  const body = useRef(), head = useRef()
  const sitting = useRef(receptionist ? 1 : 0)
  const { invalidate, gl } = useThree()
  const skin = receptionist ? '#b77b59' : '#c18a64'
  const hair = receptionist ? '#30221e' : '#29241f'
  useFrame(({ clock }, delta) => {
    const target = receptionist && !receptionState?.current.standing ? 1 : 0
    if (!receptionState?.current.paused) sitting.current = MathUtils.damp(sitting.current, target, 4, Math.min(delta,.1))
    const sit = sitting.current
    if (Math.abs(sit-target) > .002 && !receptionState?.current.paused) invalidate()
    if (receptionist) gl.domElement.dataset.receptionistPose = sit > .98 ? 'seated' : sit < .02 ? 'standing' : 'transitioning'
    const t = gait ? gait.current.distance * 6.8 : clock.elapsedTime + phase
    const strength = moving ? Math.min(1, (gait?.current.speed ?? VISITOR_SPEED) / VISITOR_SPEED) : 0
    arms.forEach((ref, i) => { ref.current.rotation.x = Math.sin(t + i * Math.PI) * .28 * strength - .06 - sit*.5 })
    thighs.forEach((ref, i) => {
      const cycle = t + i * Math.PI
      ref.current.rotation.x = -Math.sin(cycle) * .32 * strength - sit*Math.PI/2
      knees[i].current.rotation.x = Math.max(0, Math.cos(cycle)) * .48 * strength + sit*Math.PI/2
    })
    body.current.position.y = Math.abs(Math.sin(t)) * .018 * strength - sit*.4
    body.current.position.z = -sit*.34
    head.current.rotation.y = Math.sin(clock.elapsedTime * .7 + phase) * .025
  })
  return <group ref={body}>
    <Part position={[0,.88,0]} scale={[.145,.13,.105]} color="#30343c"/>
    <mesh position={[0,.94,.095]}><boxGeometry args={[.25,.024,.022]}/><meshStandardMaterial color="#302a25" roughness={.5}/></mesh>
    <mesh position={[0,.94,.112]}><boxGeometry args={[.031,.029,.009]}/><meshStandardMaterial color="#a5a8aa" metalness={.8} roughness={.25}/></mesh>
    <mesh position={[0,1.13,0]} scale={[1,1,.64]} castShadow><cylinderGeometry args={[.205,.145,.43,20]}/><meshStandardMaterial color={shirt} roughness={.95}/></mesh>
    <Part position={[0,1.34,0]} scale={[.195,.065,.1]} color={shirt}/>
    <Part position={[0,1.39,0]} scale={[.055,.08,.054]} color={skin}/>
    {/* Shirt opening, folded lapels, buttons and pocket. */}
    <mesh position={[0,1.24,.122]}><planeGeometry args={[.105,.21]}/><meshStandardMaterial color="#e8e4dc" roughness={1}/></mesh>
    {[-1,1].map(side => <group key={side}>
      <mesh position={[side*.072,1.245,.126]} rotation={[0,0,side*.32]}><boxGeometry args={[.05,.18,.012]}/><meshStandardMaterial color={shirt}/></mesh>
      <Part position={[side*.128,1.245,.116]} scale={[.038,.006,.007]} color="#d0d1d0"/>
    </group>)}
    {[1.09,1.02].map(y=><Part key={y} position={[.018,y,.117]} scale={[.009,.009,.004]} color="#252a30"/ >)}
    <mesh position={[.11,1.19,.135]}><boxGeometry args={[.055,.08,.008]}/><meshStandardMaterial color="#f1eee5" roughness={.8}/></mesh>
    <mesh position={[.11,1.215,.141]}><boxGeometry args={[.042,.014,.003]}/><meshStandardMaterial color={shirt}/></mesh>
    {[1.19,1.177].map(y=><mesh key={y} position={[.11,y,.142]}><boxGeometry args={[.033,.003,.002]}/><meshStandardMaterial color="#606c6b"/></mesh>)}
    {!receptionist&&<group><mesh position={[0,1.245,.139]}><boxGeometry args={[.023,.12,.008]}/><meshStandardMaterial color="#2b3945" roughness={.7}/></mesh><Part position={[0,1.311,.14]} scale={[.021,.023,.008]} color="#2b3945"/></group>}
    <group ref={head} position={[0,1.56,0]}>
      <Part scale={[.105,.14,.105]} color={skin} roughness={.65}/>
      <Part position={[0,-.064,.024]} scale={[.082,.067,.082]} color={skin} roughness={.65}/>
      <Part position={[0,.074,-.018]} scale={[.108,.078,.098]} color={hair}/>
      <Part position={[-.035,.108,.022]} scale={[.076,.042,.082]} rotation={[0,0,-.18]} color={hair}/>
      {receptionist && <Part position={[0,.045,-.11]} scale={[.069,.082,.055]} color={hair}/ >}
      {[-1,1].map(side=><group key={side}>
        <Part position={[side*.108,-.005,0]} scale={[.017,.031,.018]} color={skin}/>
        <Part position={[side*.039,.018,.097]} scale={[.021,.01,.009]} color="#e5dfd3"/>
        <Part position={[side*.039,.018,.105]} scale={[.008,.008,.004]} color="#493b2c"/>
        <Part position={[side*.039,.018,.109]} scale={[.0035,.004,.002]} color="#171b20"/>
        <Part position={[side*.036,.021,.111]} scale={[.0017,.0017,.001]} color="#fffaf0"/>
        <Part position={[side*.039,.04,.094]} scale={[.027,.005,.007]} color={hair}/>
      </group>)}
      <Part position={[0,-.004,.109]} scale={[.018,.032,.021]} color={skin}/>
      <Part position={[0,-.061,.096]} scale={[.028,.006,.008]} color="#8e5145"/>
      <Part position={[0,-.069,.094]} scale={[.027,.005,.006]} color="#b17665"/>
      {receptionist&&[-1,1].map(side=><mesh key={side} position={[side*.11,-.027,.005]} rotation={[0,Math.PI/2,0]}><torusGeometry args={[.011,.003,6,16]}/><meshStandardMaterial color="#b9a56d" metalness={.75} roughness={.3}/></mesh>)}
    </group>
    {[-1,1].map((side,i)=><group key={side}>
      <group ref={arms[i]} position={[side*.215,1.30,0]} rotation={[0,0,side*.055]}>
        <Part position={[0,-.135,0]} scale={[.057,.165,.06]} color={shirt}/>
        <group position={[0,-.275,0]} rotation={[-.13,0,0]}>
          <Part position={[0,-.105,0]} scale={[.043,.135,.044]} color={shirt}/>
          <Part position={[0,-.228,0]} scale={[.043,.014,.044]} color="#e8e4dc"/>
          {i===0&&<group position={[0,-.205,.038]}><mesh><boxGeometry args={[.027,.034,.012]}/><meshStandardMaterial color="#b4babc" metalness={.7} roughness={.3}/></mesh><mesh position={[0,0,.007]}><planeGeometry args={[.020,.026]}/><meshStandardMaterial color="#27323c" roughness={.25}/></mesh></group>}
          <Part position={[0,-.28,.005]} scale={[.037,.059,.023]} color={skin}/>
          {[0,1,2,3].map(finger=><Part key={finger} position={[(finger-1.5)*.015,-.325,.006]} scale={[.008,.026,.011]} color={skin}/ >)}
          <Part position={[-side*.035,-.275,.012]} scale={[.012,.032,.012]} rotation={[0,0,-side*.4]} color={skin}/>
        </group>
      </group>
      <group ref={thighs[i]} position={[side*.082,.86,0]}>
        <Part position={[0,-.205,0]} scale={[.078,.225,.081]} color="#30343c"/>
        <group ref={knees[i]} position={[0,-.415,0]}>
          <Part position={[0,-.18,0]} scale={[.058,.20,.06]} color="#30343c"/>
          <Part position={[0,-.375,.047]} scale={[.061,.043,.12]} color="#242426" roughness={.45}/>
          <Part position={[0,-.398,.045]} scale={[.064,.014,.122]} color="#171718"/>
          {[0,1,2].map(lace=><mesh key={lace} position={[0,-.335,.035+lace*.025]} rotation={[.2,0,0]}><boxGeometry args={[.06,.004,.006]}/><meshStandardMaterial color="#737578" roughness={.9}/></mesh>)}
        </group>
      </group>
    </group>)}
  </group>
}
