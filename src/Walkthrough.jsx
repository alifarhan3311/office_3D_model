import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

export function canWalk(grid, x, z) {
  const column=Math.floor((x-grid.min[0])/grid.cell),row=Math.floor((z-grid.min[2])/grid.cell)
  if(column<0||row<0||column>=grid.width||row>=grid.depth)return false
  const index=row*grid.width+column
  return !grid.blocked[index] && Boolean(grid.connected[index])
}

export function WalkthroughRig({info,input,onStatus}) {
  const {camera,gl,invalidate}=useThree()
  const state=useRef({x:info.officeTour.navigation.spawn[0],z:info.officeTour.navigation.spawn[2],yaw:0,pitch:0,report:0,reset:0})
  const grid=info.officeTour.navigation
  useEffect(()=>{
    const canvas=gl.domElement,keys=input.current.keys
    const previous={fov:camera.fov,near:camera.near,far:camera.far,tabIndex:canvas.tabIndex}
    camera.fov=65;camera.near=.04;camera.far=250;camera.updateProjectionMatrix()
    canvas.tabIndex=0;canvas.focus({preventScroll:true});canvas.style.touchAction='none'
    let drag=null
    const editable=event=>/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)
    const down=event=>{if(event.code==='Escape'&&document.pointerLockElement===canvas)document.exitPointerLock();if(editable(event)||event.ctrlKey||event.metaKey||event.altKey)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(event.code)){event.preventDefault();keys.add(event.code);invalidate()}if(event.code==='KeyR'){input.current.reset++;invalidate()}}
    const up=event=>keys.delete(event.code)
    const clear=()=>{keys.clear();input.current.buttons={}}
    const look=event=>{
      if(document.pointerLockElement!==canvas&&!drag)return
      const dx=document.pointerLockElement===canvas?event.movementX:event.clientX-drag.x
      const dy=document.pointerLockElement===canvas?event.movementY:event.clientY-drag.y
      state.current.yaw-=dx*.0025;state.current.pitch=Math.max(-1.35,Math.min(1.35,state.current.pitch-dy*.0025))
      if(drag)drag={x:event.clientX,y:event.clientY};invalidate()
    }
    const begin=event=>{if(event.button!==0)return;canvas.focus({preventScroll:true});drag={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);if(event.pointerType==='mouse'&&!document.pointerLockElement){try{canvas.requestPointerLock()?.catch(()=>{})}catch{/* Drag look remains available. */}}}
    const end=()=>{drag=null}
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear)
    canvas.addEventListener('pointerdown',begin);canvas.addEventListener('pointermove',look);canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end)
    invalidate()
    return ()=>{clear();if(document.pointerLockElement===canvas)document.exitPointerLock();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);canvas.removeEventListener('pointerdown',begin);canvas.removeEventListener('pointermove',look);canvas.removeEventListener('pointerup',end);canvas.removeEventListener('pointercancel',end);camera.fov=previous.fov;camera.near=previous.near;camera.far=previous.far;camera.updateProjectionMatrix();canvas.tabIndex=previous.tabIndex;delete canvas.dataset.walkPosition;delete canvas.dataset.walkYaw;invalidate()}
  },[camera,gl,info,input,invalidate])
  useFrame((_,delta)=>{
    const s=state.current,{keys,buttons,reset}=input.current
    if(s.reset!==reset){s.x=grid.spawn[0];s.z=grid.spawn[2];s.yaw=0;s.pitch=0;s.reset=reset}
    const pressed=(code,arrow,name)=>keys.has(code)||keys.has(arrow)||buttons[name]
    let forward=Number(Boolean(pressed('KeyW','ArrowUp','forward')))-Number(Boolean(pressed('KeyS','ArrowDown','back')))
    let side=Number(Boolean(pressed('KeyD','ArrowRight','right')))-Number(Boolean(pressed('KeyA','ArrowLeft','left')))
    const length=Math.hypot(forward,side)
    if(length){forward/=length;side/=length;const distance=Math.min(delta,.08)*(keys.has('ShiftLeft')||keys.has('ShiftRight')?3:1.6)
      const dx=(-Math.sin(s.yaw)*forward+Math.cos(s.yaw)*side)*distance,dz=(-Math.cos(s.yaw)*forward-Math.sin(s.yaw)*side)*distance
      const steps=Math.ceil(distance/.04)
      for(let i=0;i<steps;i++){if(canWalk(grid,s.x+dx/steps,s.z))s.x+=dx/steps;if(canWalk(grid,s.x,s.z+dz/steps))s.z+=dz/steps}
      invalidate()
    }
    camera.position.set(s.x-info.center[0],1.72-info.center[1],s.z-info.center[2]);camera.rotation.set(s.pitch,s.yaw,0,'YXZ')
    gl.domElement.dataset.walkPosition=[s.x,1.72,s.z].join(',');gl.domElement.dataset.walkYaw=String(s.yaw)
    if(performance.now()-s.report>100){s.report=performance.now();onStatus({x:s.x,z:s.z,yaw:s.yaw})}
  })
  return null
}

export function WalkthroughHUD({info,input,status,onExit}) {
  const [map,setMap]=useState(true),canvas=useRef()
  useEffect(()=>{
    if(!map||!canvas.current||!status)return
    const grid=info.officeTour.navigation,context=canvas.current.getContext('2d'),scale=180/Math.max(grid.width,grid.depth)
    context.clearRect(0,0,180,180);context.fillStyle='#eef1e7';context.fillRect(0,0,180,180)
    context.fillStyle='#596653'
    for(let z=0;z<grid.depth;z++)for(let x=0;x<grid.width;x++)if(grid.blocked[z*grid.width+x])context.fillRect(x*scale,z*scale,scale,scale)
    const x=(status.x-grid.min[0])/grid.cell*scale,z=(status.z-grid.min[2])/grid.cell*scale
    context.save();context.translate(x,z);context.rotate(-status.yaw);context.fillStyle='#ef883f';context.beginPath();context.moveTo(0,-8);context.lineTo(5,5);context.lineTo(-5,5);context.closePath();context.fill();context.restore()
  },[info,status,map])
  const hold=(name,value)=>{input.current.buttons[name]=value}
  return <>
    <div className="walk-help"><strong>First-person walkthrough</strong><span>WASD / arrows to walk · Shift to run</span><span>Click or drag to look · Esc releases cursor</span><div><button onClick={()=>input.current.reset++}>Back to entrance</button><button onClick={()=>setMap(n=>!n)}>{map?'Hide map':'Show map'}</button><button onClick={onExit}>Exit walkthrough</button></div></div>
    <div className="walk-crosshair" aria-hidden="true">+</div>
    {map&&<canvas ref={canvas} width="180" height="180" className="walk-map" aria-label="Office map and your location"/>}
    <div className="walk-pad" aria-label="Walk controls">{[['forward','↑'],['left','←'],['back','↓'],['right','→']].map(([name,label])=><button key={name} aria-label={`Walk ${name}`} onPointerDown={event=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);hold(name,true)}} onPointerUp={()=>hold(name,false)} onPointerCancel={()=>hold(name,false)} onLostPointerCapture={()=>hold(name,false)}>{label}</button>)}</div>
  </>
}
