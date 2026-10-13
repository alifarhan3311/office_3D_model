import { useMemo } from 'react'
import { Box3, CanvasTexture, SRGBColorSpace, Vector3 } from 'three'

export function inspectArchitecture(scene) {
  scene.updateMatrixWorld(true)
  const walls=[],doors=[],handles=[]
  scene.traverse(object=>{
    if(!object.isMesh)return
    const box=new Box3().setFromObject(object),size=box.getSize(new Vector3()),center=box.getCenter(new Vector3())
    const materials=Array.isArray(object.material)?object.material:[object.material]
    if(/_handle/.test(object.name))handles.push(center)
    if(object.name.startsWith('W_')&&materials.some(m=>m.name==='Wall')&&size.y>2)walls.push({name:object.name,center:center.toArray(),size:size.toArray()})
    if(!/^Door_/.test(object.name)||/handle|lbl|swing|_bot|_top|_st/.test(object.name)||size.y<2)return
    const position=object.geometry.attributes.position,points=[]
    let xx=0,zz=0,xz=0
    const mean=new Vector3()
    for(let i=0;i<position.count;i++){const p=new Vector3().fromBufferAttribute(position,i).applyMatrix4(object.matrixWorld);points.push(p);mean.add(p)}
    mean.divideScalar(points.length)
    for(const p of points){xx+=(p.x-mean.x)**2;zz+=(p.z-mean.z)**2;xz+=(p.x-mean.x)*(p.z-mean.z)}
    const angle=.5*Math.atan2(2*xz,xx-zz),tangent=new Vector3(Math.cos(angle),0,Math.sin(angle))
    const projections=points.map(p=>p.clone().sub(mean).dot(tangent))
    const width=Math.max(...projections)-Math.min(...projections)
    if(width>.6&&width<2.2)doors.push({name:object.name,position:[mean.x,box.min.y,mean.z],angle,width,height:size.y})
  })
  for(const door of doors){const center=new Vector3(...door.position);const nearest=handles.reduce((best,p)=>!best||p.distanceToSquared(center)<best.distanceToSquared(center)?p:best,null);door.handle=nearest?.toArray()}
  return {walls,doors}
}

const CEILING_LIGHTS=[[-33, -2],[-33,-12],[-16.5,-12],[-16.5,-4],[-16.3,5.5],[-33,5],[-24.5,5],[-24,-10]]
function Trim({position,size,color='#bcb8ad'}){return <mesh position={position} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.65}/></mesh>}
function DoorDetails({door}){
  const sign=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128
    const context=canvas.getContext('2d');context.fillStyle='#e9e8df';context.fillRect(0,0,512,128)
    context.fillStyle='#39443f';context.font='600 32px Arial';context.textAlign='center';context.textBaseline='middle'
    const label=/Bath/.test(door.name)?'RESTROOM':/Board/.test(door.name)?'MEETING ROOM':/CEO/.test(door.name)?'EXECUTIVE OFFICE':/Main/.test(door.name)?'ENTRANCE':'OFFICE'
    context.fillText(label,256,64)
    const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;return texture
  },[door.name])
  return <group>
  <group position={door.position} rotation={[0,-door.angle,0]}>
    {[.35,1.3,2.25].map(y=><group key={y} position={[-door.width*.47,y,.035]}><mesh castShadow><cylinderGeometry args={[.019,.019,.10,12]}/><meshStandardMaterial color="#abb4b6" metalness={.85} roughness={.24}/></mesh><Trim position={[.032,0,0]} size={[.045,.085,.008]} color="#8d9598"/></group>)}
    <Trim position={[0,door.height-.07,.036]} size={[door.width*.86,.028,.025]} color="#777b79"/>
    <Trim position={[0,2.12,.034]} size={[.39,.115,.018]} color="#7d8983"/>
    <mesh position={[0,2.12,.045]}><planeGeometry args={[.37,.095]}/><meshStandardMaterial map={sign} roughness={.6}/></mesh>
  </group>
  {door.handle&&<group position={door.handle} rotation={[0,-door.angle,0]}><Trim position={[0,0,.025]} size={[.075,.19,.014]} color="#939da1"/><mesh position={[0,-.055,.038]}><cylinderGeometry args={[.013,.013,.008,12]} rotation={[Math.PI/2,0,0]}/><meshStandardMaterial color="#333b3b" metalness={.65} roughness={.3}/></mesh></group>}
</group>}

export default function ArchitecturalDetails({scene,center}) {
  const details=useMemo(()=>inspectArchitecture(scene),[scene])
  return <group position={center.map(v=>-v)} name="Architectural finishes and lighting">
    {details.walls.map(wall=>{
      const [x,,z]=wall.center,[width,,depth]=wall.size,alongX=width>depth
      return <group key={wall.name}>
        {[-1,1].map(side=><group key={side}>
          <Trim position={[x+(alongX?0:side*(width/2+.015)),.17,z+(alongX?side*(depth/2+.015):0)]} size={alongX?[width,.14,.035]:[.035,.14,depth]}/>
          <Trim position={[x+(alongX?0:side*(width/2+.012)),2.85,z+(alongX?side*(depth/2+.012):0)]} size={alongX?[width,.055,.025]:[.025,.055,depth]} color="#d1cec4"/>
          <group position={[x+(alongX?0:side*(width/2+.025)),.46,z+(alongX?side*(depth/2+.025):0)]} rotation={[0,alongX?(side>0?0:Math.PI):(side>0?Math.PI/2:-Math.PI/2),0]}>
            <Trim position={[0,0,0]} size={[.09,.12,.018]} color="#eeeae1"/>
            {[-.021,.021].map(dx=><Trim key={dx} position={[dx,0,.01]} size={[.009,.027,.003]} color="#515b58"/>)}
            <Trim position={[0,.028,.01]} size={[.008,.017,.003]} color="#515b58"/>
          </group>
        </group>)}
      </group>
    })}
    {details.doors.map(door=><DoorDetails key={door.name} door={door}/>)}
    {CEILING_LIGHTS.map(([x,z],i)=><group key={i} position={[x,3.2,z]}>
      <Trim position={[0,.027,0]} size={[1.3,.065,.33]} color="#444b48"/>
      <mesh rotation={[Math.PI/2,0,0]}><planeGeometry args={[1.2,.27]}/><meshStandardMaterial color="#fff5df" emissive="#fff0cf" emissiveIntensity={2.2}/></mesh>
      <mesh position={[0,.064,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[1.2,.27]}/><meshStandardMaterial color="#c4c8c4" roughness={.55}/></mesh>
      {[-.46,.46].map(x=><mesh key={x} position={[x,.36,0]}><cylinderGeometry args={[.008,.008,.64,6]}/><meshStandardMaterial color="#8a9290" metalness={.75} roughness={.4}/></mesh>)}
    </group>)}
    {/* Four non-shadowed area fills supplement daylight without multiplying shadow renders. */}
    {[[-24.5,5],[-16.5,4],[-33,-4],[-24,-10]].map(([x,z],i)=><pointLight key={i} position={[x,3,z]} color="#ffe8c6" intensity={16} distance={13} decay={2}/>)}
    {[-26.3,-23.1].map(x=><group key={x} position={[x,1.85,-1.14]}><Trim position={[0,0,0]} size={[.12,.28,.08]} color="#555d56"/><mesh position={[0,0,.05]}><boxGeometry args={[.075,.21,.025]}/><meshStandardMaterial color="#fff0cd" emissive="#ffd28a" emissiveIntensity={1.8}/></mesh></group>)}
    <pointLight position={[-24.5,1.9,-.9]} color="#ffdeb0" intensity={7} distance={6} decay={2}/>
  </group>
}
