import { Box3, Vector3 } from 'three'
import { RECEPTIONIST_POSITION, VISITOR_PATH } from './tour'

const CELL = .25
const CLEARANCE = .30
export const RECEPTION_EXIT_X = -23.1
export const OFFICE_STOPS = [
  { name:'Welcome lounge', object:'SOFA', description:'This lounge provides a comfortable waiting area for visitors.' },
  { name:'Private offices', object:'Door_L1', description:'These private offices provide quiet spaces for focused work and individual meetings.' },
  { name:'Executive offices', object:'Door_CEO_bot', description:'The executive offices are located in this section of the office.' },
  { name:'Team offices', object:'Door_R1', description:'The team offices support day-to-day collaboration across departments.' },
  { name:'Meeting room', object:'MEETING_TABLE', point:[-16.25,.12,2.4], description:'This meeting room and boardroom hosts team discussions, presentations and scheduled meetings.' },
  { name:'Reception', object:'RECEPTION_DESK', description:'We are back at reception. Thank you for joining the office tour!' },
]

/** Rasterize real geometry at body height, then route through connected free cells. */
export function buildOfficeTour(scene, debug = false) {
  scene.updateMatrixWorld(true)
  const bounds = new Box3().setFromObject(scene)
  const width = Math.ceil((bounds.max.x-bounds.min.x)/CELL)
  const depth = Math.ceil((bounds.max.z-bounds.min.z)/CELL)
  const blocked = new Uint8Array(width*depth)
  const world = id => [bounds.min.x+(id%width+.5)*CELL, .12, bounds.min.z+(Math.floor(id/width)+.5)*CELL]
  const markSegment = (a,b) => {
    const minX=Math.max(0,Math.floor((Math.min(a.x,b.x)-CLEARANCE-bounds.min.x)/CELL))
    const maxX=Math.min(width-1,Math.floor((Math.max(a.x,b.x)+CLEARANCE-bounds.min.x)/CELL))
    const minZ=Math.max(0,Math.floor((Math.min(a.z,b.z)-CLEARANCE-bounds.min.z)/CELL))
    const maxZ=Math.min(depth-1,Math.floor((Math.max(a.z,b.z)+CLEARANCE-bounds.min.z)/CELL))
    const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz
    for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++) {
      const px=bounds.min.x+(x+.5)*CELL,pz=bounds.min.z+(z+.5)*CELL
      const t=len?Math.max(0,Math.min(1,((px-a.x)*dx+(pz-a.z)*dz)/len)):0
      if(Math.hypot(px-a.x-t*dx,pz-a.z-t*dz)<CLEARANCE+CELL*.55)blocked[z*width+x]=1
    }
  }
  const a=new Vector3(),b=new Vector3(),c=new Vector3()
  scene.traverse(object=>{
    if(!object.isMesh || !object.visible || /swing|lbl|handle/i.test(object.name))return
    const geometry=object.geometry,position=geometry.attributes.position,index=geometry.index
    let ancestor=object,isReception=false
    while(ancestor){if(ancestor.name==='RECEPTION_DESK')isReception=true;ancestor=ancestor.parent}
    const meshBounds=new Box3().setFromObject(object)
    if(meshBounds.max.y<.4 || meshBounds.min.y>1.4)return
    const count=index?index.count:position.count
    for(let i=0;i<count;i+=3) {
      a.fromBufferAttribute(position,index?index.getX(i):i).applyMatrix4(object.matrixWorld)
      b.fromBufferAttribute(position,index?index.getX(i+1):i+1).applyMatrix4(object.matrixWorld)
      c.fromBufferAttribute(position,index?index.getX(i+2):i+2).applyMatrix4(object.matrixWorld)
      for(const height of [.5,1.1]) {
        if(Math.min(a.y,b.y,c.y)>height || Math.max(a.y,b.y,c.y)<height)continue
        const hits=[]
        for(const [p,q] of [[a,b],[b,c],[c,a]]) {
          if((p.y<=height&&q.y>height)||(q.y<=height&&p.y>height)) {
            const t=(height-p.y)/(q.y-p.y);hits.push({x:p.x+t*(q.x-p.x),z:p.z+t*(q.z-p.z)})
          }
        }
        if(hits.length===2) {
          if(isReception) {
            if(hits.every(p=>p.x>RECEPTION_EXIT_X))continue
            for(let k=0;k<2;k++)if(hits[k].x>RECEPTION_EXIT_X) {
              const other=hits[1-k],t=(RECEPTION_EXIT_X-other.x)/(hits[k].x-other.x)
              hits[k]={x:RECEPTION_EXIT_X,z:other.z+t*(hits[k].z-other.z)}
            }
          }
          markSegment(hits[0],hits[1])
        }
      }
    }
  })
  // Keep routes inside the footprint, rather than allowing a detour outside the building.
  for(let z=0;z<depth;z++)for(let x=0;x<width;x++)if(x<2||z<2||x>=width-2||z>=depth-2)blocked[z*width+x]=1
  const nearest = (point, allowed) => {
    let best=-1,distance=Infinity
    for(let id=0;id<blocked.length;id++)if(!blocked[id]&&(!allowed||allowed[id])) {
      const p=world(id),d=(p[0]-point[0])**2+(p[2]-point[2])**2
      if(d<distance){distance=d;best=id}
    }
    return best
  }
  const neighbors=id=>{
    const x=id%width,z=Math.floor(id/width),result=[]
    if(x>0)result.push(id-1);if(x<width-1)result.push(id+1)
    if(z>0)result.push(id-width);if(z<depth-1)result.push(id+width)
    return result.filter(n=>!blocked[n])
  }
  const start=nearest(RECEPTIONIST_POSITION)
  if(start<0)throw new Error('No clear office tour route is available.')
  const connected=new Uint8Array(blocked.length),queue=[start];connected[start]=1
  for(let i=0;i<queue.length;i++)for(const n of neighbors(queue[i]))if(!connected[n]){connected[n]=1;queue.push(n)}
  const pathTo=(from,to)=>{
    const previous=new Int32Array(blocked.length).fill(-1),queue=[from];previous[from]=from
    for(let i=0;i<queue.length&&previous[to]<0;i++)for(const n of neighbors(queue[i]))if(previous[n]<0){previous[n]=queue[i];queue.push(n)}
    if(previous[to]<0)throw new Error('An office tour stop cannot be reached safely.')
    const route=[to];while(route.at(-1)!==from)route.push(previous[route.at(-1)])
    const cells=route.reverse()
    // String-pull the grid path: use direct, collision-checked segments instead of stair-step turns.
    const clear=(from,to)=>{
      const a=world(from),b=world(to),steps=Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/(CELL*.2))
      for(let i=0;i<=steps;i++) {
        const t=steps?i/steps:0,x=Math.floor((a[0]+(b[0]-a[0])*t-bounds.min.x)/CELL),z=Math.floor((a[2]+(b[2]-a[2])*t-bounds.min.z)/CELL)
        if(blocked[z*width+x])return false
      }
      return true
    }
    const smooth=[cells[0]]
    for(let i=0;i<cells.length-1;){let next=cells.length-1;while(next>i+1&&!clear(cells[i],cells[next]))next--;smooth.push(cells[next]);i=next}
    return smooth.map(world)
  }
  const meeting=nearest(VISITOR_PATH.at(-1),connected)
  // Leave space for the trailing visitor on the public side before staff returns behind the desk.
  const returnPoint=nearest([VISITOR_PATH.at(-1)[0],.12,VISITOR_PATH.at(-1)[2]+1.2],connected)
  const departure=pathTo(start,meeting)
  let from=meeting
  const stops=OFFICE_STOPS.map(stop=>{
    // Blender names are sanitized by GLTFLoader.
    const object=scene.getObjectByName(stop.object) || scene.getObjectByName(stop.object.replaceAll('_',''))
    if(!object)throw new Error(`Office tour landmark missing: ${stop.object}`)
    const center=new Box3().setFromObject(object).getCenter(new Vector3())
    const target=stop.name==='Reception'?returnPoint:nearest(stop.point || center.toArray(),connected)
    const path=pathTo(from,target);from=target
    return {...stop,path}
  })
  return {stops, staffReturn:pathTo(returnPoint,start), start:world(start), departure, meeting:world(meeting), ...(debug ? {grid:{width,depth,blocked:Array.from(blocked),connected:Array.from(connected),min:bounds.min.toArray()}} : {})}
}

export function routeLength(path) { return path.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-path[i][0],p[2]-path[i][2]),0) }
export function sampleRoute(path,distance) {
  let remaining=Math.max(0,distance)
  for(let i=1;i<path.length;i++) {
    const a=path[i-1],b=path[i],length=Math.hypot(b[0]-a[0],b[2]-a[2])
    if(remaining<=length||i===path.length-1){const t=Math.min(1,remaining/length);return {position:a.map((v,k)=>v+(b[k]-v)*t),heading:Math.atan2(b[0]-a[0],b[2]-a[2])}}
    remaining-=length
  }
  return {position:path[0],heading:0}
}
