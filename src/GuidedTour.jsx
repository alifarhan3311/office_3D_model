import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Quaternion, Vector3 } from 'three'
import Character from './HumanCharacter.jsx'
import { routeLength, sampleRoute } from './officeTour'

export default function GuidedTour({info,paused,onStop,onComplete}) {
  const guide=useRef(), visitor=useRef()
  const state=useRef({segment:-1,distance:0,wait:0,done:false})
  const guideGait=useRef({distance:0,speed:0}),visitorGait=useRef({distance:0,speed:0})
  const standing=useRef({standing:true,paused:false})
  const follow=useRef(true)
  const {invalidate,camera,controls,gl}=useThree()
  const center=new Vector3(...info.center)
  const data=info.officeTour
  const walkPath=useMemo(()=>data.stops.flatMap((stop,i)=>i?stop.path.slice(1):stop.path),[data])
  const lengths=useMemo(()=>data.stops.map(stop=>routeLength(stop.path)),[data])
  useEffect(()=>{
    onStop({name:'Leaving reception',description:'Follow the receptionist for a guided walk around the office.',index:0,total:data.stops.length})
    const manual=()=>{follow.current=false}
    controls?.addEventListener('start',manual)
    invalidate()
    return()=>controls?.removeEventListener('start',manual)
  },[controls,data,onStop,invalidate])
  useFrame((_,delta)=>{
    const s=state.current
    if(!guide.current||!visitor.current)return
    standing.current.paused=paused
    guideGait.current.speed=visitorGait.current.speed=0
    if(!paused&&!s.done) {
      const dt=Math.min(delta,.25)
      const returning=s.segment===data.stops.length
      const path=s.segment<0?data.departure:returning?data.staffReturn:data.stops[s.segment].path
      const length=routeLength(path)
      if(s.wait>0) {
        s.wait-=dt
        if(s.wait<=0) {
          s.segment++;s.distance=0
        }
      } else {
        s.distance=Math.min(length,s.distance+dt*1.05)
        const setPose=(ref,gait,distance,route=path)=>{
          const sample=sampleRoute(route,distance)
          ref.current.position.set(...sample.position).sub(center)
          ref.current.quaternion.slerp(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),sample.heading),1-Math.exp(-8*dt))
          gait.current.speed=1.05;gait.current.distance+=dt*1.05
        }
        setPose(guide,guideGait,s.distance)
        if(s.segment>=0&&!returning)setPose(visitor,visitorGait,Math.max(0,lengths.slice(0,s.segment).reduce((a,b)=>a+b,0)+s.distance-.9),walkPath)
        if(s.distance>=length) {
          if(returning){s.done=true;standing.current.standing=false;guideGait.current.speed=0;onComplete()}
          else if(s.segment<0){s.segment=0;s.distance=0;onStop({...data.stops[0],index:1,total:data.stops.length})}
          else {
            onStop({...data.stops[s.segment],index:s.segment+1,total:data.stops.length})
            s.wait=3
          }
        }
      }
      if(follow.current&&controls) {
        const target=guide.current.position.clone().lerp(visitor.current.position,.5).add(new Vector3(0,1,0))
        camera.position.lerp(target.clone().add(new Vector3(6,8,9)),1-Math.exp(-2*dt))
        controls.target.lerp(target,1-Math.exp(-3*dt));controls.update()
      }
      invalidate()
    }
    gl.domElement.dataset.guidedTourStop=String(s.segment)
    gl.domElement.dataset.guidedTourState=s.done?'complete':paused?'paused':'walking'
    gl.domElement.dataset.visitorWorldPosition=visitor.current.position.clone().add(center).toArray().join(',')
  })
  return <>
    <group ref={guide} position={data.start.map((v,i)=>v-info.center[i])}><Character receptionist shirt="#76526e" receptionState={standing} moving={!paused} gait={guideGait}/><Html center position={[0,1.95,0]} style={{pointerEvents:'none'}}><span className="character-label">Receptionist · Guide</span></Html></group>
    <group ref={visitor} position={data.meeting.map((v,i)=>v-info.center[i])}><Character shirt="#365a79" moving={!paused} gait={visitorGait}/><Html center position={[0,1.95,0]} style={{pointerEvents:'none'}}><span className="character-label">Visitor</span></Html></group>
  </>
}
