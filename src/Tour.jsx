import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Vector3, Quaternion, MathUtils } from 'three'
import { VISITOR_PATH, VISITOR_SPEED, PATH_LENGTH, sampleVisitorPath, RECEPTIONIST_POSITION, TOUR_QUESTIONS, receptionResponse } from './tour'

function Character({ shirt, seated = false, moving = false, phase = 0, gait }) {
  const leftArm = useRef(), rightArm = useRef(), leftLeg = useRef(), rightLeg = useRef(), head = useRef()
  useFrame(({ clock }) => {
    const t = gait ? gait.current.distance * 6.8 : clock.elapsedTime + phase
    const strength = moving ? (gait?.current.speed ?? 1) / VISITOR_SPEED : 0
    const swing = Math.sin(t) * 0.3 * strength
    leftArm.current.rotation.x = swing
    rightArm.current.rotation.x = -swing
    leftLeg.current.rotation.x = seated ? -Math.PI / 2 : -swing
    rightLeg.current.rotation.x = seated ? -Math.PI / 2 : swing
    head.current.rotation.y = moving ? Math.sin(t*.5)*.025 : Math.sin(clock.elapsedTime*.8+phase)*.035
  })
  const limb = (color, length = .42) => <mesh position={[0, -length / 2, 0]} castShadow><capsuleGeometry args={[.075, length - .15, 4, 8]}/><meshStandardMaterial color={color} roughness={.8}/></mesh>
  return <group>
    <mesh position={[0, 1.04, 0]} castShadow><capsuleGeometry args={[.19, .36, 4, 10]}/><meshStandardMaterial color={shirt} roughness={.75}/></mesh>
    <group ref={head} position={[0, 1.56, 0]}><mesh castShadow><sphereGeometry args={[.16, 12, 10]}/><meshStandardMaterial color="#c98f69"/></mesh><mesh position={[0,.085,-.025]}><sphereGeometry args={[.15,12,8,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#302926"/></mesh><mesh position={[-.052,.018,.149]}><sphereGeometry args={[.013,6,6]}/><meshStandardMaterial color="#26242b"/></mesh><mesh position={[.052,.018,.149]}><sphereGeometry args={[.013,6,6]}/><meshStandardMaterial color="#26242b"/></mesh></group>
    <group ref={leftArm} position={[-.24,1.22,0]}>{limb(shirt,.48)}<mesh position={[0,-.52,0]}><sphereGeometry args={[.07,8,8]}/><meshStandardMaterial color="#c98f69"/></mesh></group>
    <group ref={rightArm} position={[.24,1.22,0]}>{limb(shirt,.48)}<mesh position={[0,-.52,0]}><sphereGeometry args={[.07,8,8]}/><meshStandardMaterial color="#c98f69"/></mesh></group>
    {[[-.105,leftLeg],[.105,rightLeg]].map(([x,ref]) => <group key={x} ref={ref} position={[x,.73,0]}>{limb('#263a55',.37)}<group position={[0,-.37,0]} rotation={[seated ? Math.PI / 2 : 0,0,0]}>{limb('#263a55',.35)}<mesh position={[0,-.34,.06]} castShadow><boxGeometry args={[.15,.1,.26]}/><meshStandardMaterial color="#232735"/></mesh></group></group>)}
  </group>
}

export function TourActors({ info, stage, paused, onArrive }) {
  const visitor = useRef()
  const elapsed = useRef(0)
  const arrived = useRef(false)
  const gait = useRef({distance:0,speed:0})
  const facing = useRef(new Quaternion())
  const { invalidate } = useThree()
  useEffect(() => { elapsed.current = 0; arrived.current = false; invalidate() }, [invalidate])
  useFrame((_, delta) => {
    if (!visitor.current) return
    const dt=Math.min(delta,.1)
    if (stage === 'walking' && !paused) {
      const remaining=PATH_LENGTH-gait.current.distance
      const desiredSpeed=VISITOR_SPEED*Math.min(1, Math.max(.2,remaining/.8))
      gait.current.speed=MathUtils.damp(gait.current.speed,desiredSpeed,5,dt)
      gait.current.distance=Math.min(PATH_LENGTH,gait.current.distance+gait.current.speed*dt)
      const sample=sampleVisitorPath(gait.current.distance)
      visitor.current.position.set(...sample.position).sub(new Vector3(...info.center))
      facing.current.setFromAxisAngle(new Vector3(0,1,0),sample.heading)
      visitor.current.quaternion.slerp(facing.current,1-Math.exp(-7*dt))
      if (gait.current.distance>=PATH_LENGTH-.015 && !arrived.current) {
        gait.current.distance=PATH_LENGTH
        gait.current.speed=0
        visitor.current.position.set(...VISITOR_PATH.at(-1)).sub(new Vector3(...info.center))
        arrived.current=true
        onArrive()
      }
    }
    if (stage !== 'walking') {
      const end=VISITOR_PATH.at(-1)
      const heading=Math.atan2(RECEPTIONIST_POSITION[0]-end[0],RECEPTIONIST_POSITION[2]-end[2])
      facing.current.setFromAxisAngle(new Vector3(0,1,0),heading)
      visitor.current.quaternion.slerp(facing.current,1-Math.exp(-5*dt))
    }
    if (!paused) invalidate()
  })
  return <>
    <group ref={visitor} position={VISITOR_PATH[0].map((v,i)=>v-info.center[i])}><Character shirt="#228bd1" moving={stage === 'walking' && !paused} gait={gait}/><Html center position={[0,1.95,0]} style={{pointerEvents:'none'}}><span className="character-label">Visitor</span></Html></group>
    <group position={RECEPTIONIST_POSITION.map((v,i)=>v-info.center[i])}><Character shirt="#a253c9" phase={2}/><Html center position={[0,1.95,0]} style={{pointerEvents:'none'}}><span className="character-label">Receptionist</span></Html></group>
  </>
}

export function TourDialog({ stage, paused, question, answers, onAnswer, onClose, onRestart, onPause }) {
  if (stage === 'idle') return null
  const current = TOUR_QUESTIONS[question]
  return <section className="tour-dialog" aria-label="Reception tour" aria-live="polite">
    <div className="tour-dialog-heading"><span>{stage === 'walking' ? 'GATE → RECEPTION' : 'RECEPTION DESK'}</span><button onClick={onClose} aria-label="End reception tour">×</button></div>
    {stage === 'walking' ? <><h3>Visitor reception ki taraf aa raha hai…</h3><p>Gate se andar aakar visitor reception desk par rukega.</p><button className="tour-secondary" onClick={onPause}>{paused ? 'Resume walk' : 'Pause walk'}</button></> : stage === 'complete' ? <><h3>Shukriya! Welcome to our office.</h3><p>{receptionResponse(answers)}</p><dl>{TOUR_QUESTIONS.map(item=><div key={item.id}><dt>{item.id}</dt><dd>{answers[item.id]}</dd></div>)}</dl><small>Yeh interactive demo hai; koi real booking submit nahi hoti.</small><button className="tour-secondary" onClick={onRestart}>Restart reception tour</button></> : <><span className="question-progress">Question {question + 1} / {TOUR_QUESTIONS.length}</span><h3>{current.text}</h3><div className="tour-answers">{current.options.map(option=><button key={option} onClick={()=>onAnswer(current.id,option)}>{option}</button>)}</div></>}
  </section>
}
