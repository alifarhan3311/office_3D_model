import { CanvasTexture, Float32BufferAttribute, RepeatWrapping, Vector3 } from 'three'

function grainTexture(kind) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128
  const context=canvas.getContext('2d'),pixels=context.createImageData(128,128)
  let seed=47
  for(let y=0;y<128;y++)for(let x=0;x<128;x++) {
    seed=(seed*1664525+1013904223)>>>0
    const noise=(seed/4294967296-.5)*24
    const weave=kind==='fabric'?((x%4<2?8:-8)+(y%4<2?8:-8)):kind==='wood'?Math.sin(x*.24+Math.sin(y*.06))*18:0
    const value=Math.max(0,Math.min(255,150+noise+weave)),i=(y*128+x)*4
    pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255
  }
  context.putImageData(pixels,0,0)
  const texture=new CanvasTexture(canvas);texture.wrapS=texture.wrapT=RepeatWrapping;texture.repeat.set(kind==='wood'?3:12,kind==='wood'?1:12)
  return texture
}

export function enhanceInteriorMaterials(scene) {
  scene.updateMatrixWorld(true)
  const surfaces={plaster:grainTexture('plaster'),fabric:grainTexture('fabric'),wood:grainTexture('wood')}
  const materials=new Map()
  scene.traverse(object=>{
    if(!object.isMesh)return
    const enhance=source=>{
      if(materials.has(source))return materials.get(source)
      const material=source.clone(),name=source.name.toLowerCase()
      material.envMapIntensity=.65
      if(name==='wall') {
        material.color.set('#e5e1d8');material.roughness=.93;material.metalness=0
        if(!material.bumpMap){material.bumpMap=surfaces.plaster;material.bumpScale=.008}
      } else if(name==='glass'||name==='basic_glass') {
        material.roughness=.09;material.metalness=0;material.transparent=true;material.opacity=.18;material.depthWrite=false
      } else if(/carpet|fabric|cloth|upholstery/.test(name)) {
        material.roughness=.92;material.metalness=0
        if(!material.bumpMap){material.bumpMap=surfaces.fabric;material.bumpScale=.012}
      } else if(/wood/.test(name)) {
        material.roughness=.52;material.metalness=0
        if(!material.bumpMap){material.bumpMap=surfaces.wood;material.bumpScale=.006}
      } else if(name==='floorlobby'||name==='floorkitchen') {material.roughness=.4;material.metalness=0}
      materials.set(source,material);return material
    }
    object.material=Array.isArray(object.material)?object.material.map(enhance):enhance(object.material)
    const objectMaterials=Array.isArray(object.material)?object.material:[object.material]
    if(!object.geometry.attributes.uv && objectMaterials.some(material=>material.bumpMap)) {
      object.geometry=object.geometry.clone()
      const position=object.geometry.attributes.position,normal=object.geometry.attributes.normal
      const uv=new Float32Array(position.count*2),point=new Vector3(),direction=new Vector3()
      for(let i=0;i<position.count;i++) {
        point.fromBufferAttribute(position,i).applyMatrix4(object.matrixWorld)
        if(normal)direction.fromBufferAttribute(normal,i).transformDirection(object.matrixWorld)
        else direction.set(0,1,0)
        const x=Math.abs(direction.x),y=Math.abs(direction.y),z=Math.abs(direction.z)
        uv[i*2]=x>y&&x>z?point.z:point.x
        uv[i*2+1]=y>x&&y>z?point.z:point.y
      }
      object.geometry.setAttribute('uv',new Float32BufferAttribute(uv,2))
    }
    // Retain all original color maps; soften imported furniture's faceted shading.
    if(/sofa|cushion|chair/i.test(object.name)&&object.geometry.attributes.normal) {
      object.geometry=object.geometry.clone();object.geometry.computeVertexNormals()
    }
  })
}
