import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import Character from './HumanCharacter.jsx'
import { Vector3, Quaternion, MathUtils } from 'three'
import { VISITOR_PATH, VISITOR_SPEED, PATH_LENGTH, sampleVisitorPath, RECEPTIONIST_POSITION, TOUR_QUESTIONS, receptionResponse } from './tour'

export function TourActors({ info, stage, paused, onArrive, receptionState }) {
  const visitor = useRef()
  const elapsed = useRef(0)
  const arrived = useRef(false)
  const gait = useRef({distance:0,speed:0})
  const facing = useRef(new Quaternion())
  const { invalidate } = useThree()
  useEffect(() => { elapsed.current = 0; arrived.current = false; receptionState.current.standing = false; invalidate() }, [invalidate, receptionState])
  useFrame((_, delta) => {
    if (!visitor.current) return
    const dt=Math.min(delta,.1)
    if (stage === 'walking' && !paused) {
      const remaining=PATH_LENGTH-gait.current.distance
      const desiredSpeed=VISITOR_SPEED*Math.min(1, Math.max(.2,remaining/.8))
      gait.current.speed=MathUtils.damp(gait.current.speed,desiredSpeed,5,dt)
      gait.current.distance=Math.min(PATH_LENGTH,gait.current.distance+gait.current.speed*dt)
      const sample=sampleVisitorPath(gait.current.distance)
      // Greet only when the visitor reaches the clear approach to the desk.
      if (Math.hypot(sample.position[0]-RECEPTIONIST_POSITION[0],sample.position[2]-RECEPTIONIST_POSITION[2]) < 3.1) receptionState.current.standing = true
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
    <group ref={visitor} position={VISITOR_PATH[0].map((v,i)=>v-info.center[i])}><Character shirt="#365a79" moving={stage === 'walking' && !paused} gait={gait}/><Html center position={[0,1.95,0]} style={{pointerEvents:'none'}}><span className="character-label">Visitor</span></Html></group>
    <group position={RECEPTIONIST_POSITION.map((v,i)=>v-info.center[i])}><Html center position={[0,1.95,0]} style={{pointerEvents:'none'}}><span className="character-label">Receptionist</span></Html></group>
  </>
}

export function TourDialog({ stage, paused, question, answers, onAnswer, onClose, onRestart, onPause }) {
  if (stage === 'idle') return null
  const current = TOUR_QUESTIONS[question]
  return <section className="tour-dialog" aria-label="Reception tour" aria-live="polite">
    <div className="tour-dialog-heading"><span>{stage === 'walking' ? 'GATE → RECEPTION' : 'RECEPTION DESK'}</span><button onClick={onClose} aria-label="End reception tour">×</button></div>
    {stage === 'walking' ? <><h3>The visitor is approaching reception…</h3><p>The visitor will enter through the gate and stop at the reception desk.</p><button className="tour-secondary" onClick={onPause}>{paused ? 'Resume walk' : 'Pause walk'}</button></> : stage === 'complete' ? <><h3>Thank you! Welcome to our office.</h3><p>{receptionResponse(answers)}</p><dl>{TOUR_QUESTIONS.map(item=><div key={item.id}><dt>{item.id}</dt><dd>{answers[item.id]}</dd></div>)}</dl><small>This is an interactive demo. No actual booking is submitted.</small><button className="tour-secondary" onClick={onRestart}>Restart reception tour</button></> : <><span className="question-progress">Question {question + 1} / {TOUR_QUESTIONS.length}</span><h3>{current.text}</h3><div className="tour-answers">{current.options.map(option=><button key={option} onClick={()=>onAnswer(current.id,option)}>{option}</button>)}</div></>}
  </section>
}


