import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls, useAnimations, useGLTF, useProgress } from '@react-three/drei'
import { ACESFilmicToneMapping, Vector3, TOUCH, PCFSoftShadowMap } from 'three'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { fitBoxDistance, inspectModel, VIEW_DIRECTIONS } from './model'

export const MODEL_URL = '/models/office-plan.glb'
export function clearModelCache() { useGLTF.clear(MODEL_URL) }

function Office({ onReady, onClips, animation, playing, shadows }) {
  const gltf = useGLTF(MODEL_URL)
  const scene = useMemo(() => clone(gltf.scene), [gltf.scene])
  const info = useMemo(() => inspectModel(scene, gltf.animations), [scene, gltf.animations])
  const { actions, names } = useAnimations(gltf.animations, scene)
  const { gl, invalidate } = useThree()
  useEffect(() => { onReady(info); onClips(names) }, [info, names, onReady, onClips])
  useEffect(() => {
    scene.traverse(object => {
      if (!object.isMesh) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      const transparent = materials.some(material => material.transparent || material.transmission > 0)
      object.castShadow = shadows && !transparent
      object.receiveShadow = shadows && !transparent
      object.frustumCulled = true
      for (const material of materials) {
        for (const texture of Object.values(material)) {
          if (texture?.isTexture && texture.anisotropy !== Math.min(8, gl.capabilities.getMaxAnisotropy())) {
            texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
            texture.needsUpdate = true
          }
        }
      }
    })
    invalidate()
  }, [scene, shadows, gl, invalidate])
  useEffect(() => {
    const action = actions[animation]
    if (!action) return
    action.reset().fadeIn(0.2).play()
    return () => { action.fadeOut(0.2); action.stop() }
  }, [actions, animation])
  useEffect(() => { if (actions[animation]) actions[animation].paused = !playing }, [actions, animation, playing])
  return <group position={info.center.map(value => -value)}><primitive object={scene} dispose={null} /></group>
}

function CameraRig({ info, command, autoRotate, view, onCamera }) {
  const controls = useRef()
  const { camera, size, invalidate } = useThree()
  const transition = useRef(null)
  const lastReport = useRef(0)
  const move = (direction, factor = 1) => {
    if (!info || !controls.current) return
    const distance = fitBoxDistance(info.size, direction, camera.fov, size.width / size.height) * factor
    camera.near = Math.max(info.radius / 100, 0.05)
    camera.far = info.radius * 30
    camera.updateProjectionMatrix()
    // Flush residual orbit damping before a programmatic camera transition.
    controls.current.enableDamping = false
    controls.current.update()
    transition.current = { from: camera.position.clone(), to: new Vector3(...direction).normalize().multiplyScalar(distance), targetFrom: controls.current.target.clone(), start: performance.now() }
    invalidate()
  }
  useEffect(() => { move(VIEW_DIRECTIONS[view]) }, [info, size.width, size.height, view])
  useEffect(() => {
    if (!info || !command) return
    if (command.type === 'reset') move(VIEW_DIRECTIONS[view])
    if (command.type === 'in' || command.type === 'out') {
      const target = controls.current.target
      const delta = camera.position.clone().sub(target)
      const distance = Math.min(info.radius * 12, Math.max(info.radius * 0.08, delta.length() * (command.type === 'in' ? 0.78 : 1.28)))
      transition.current = { from: camera.position.clone(), to: delta.normalize().multiplyScalar(distance).add(target), targetFrom: target.clone(), targetTo: target.clone(), start: performance.now() }
      invalidate()
    }
  }, [command])
  useFrame(() => {
    const t = transition.current
    if (t && controls.current) {
      const progress = Math.min((performance.now() - t.start) / 550, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      camera.position.lerpVectors(t.from, t.to, eased)
      controls.current.target.lerpVectors(t.targetFrom, t.targetTo ?? new Vector3(), eased)
      controls.current.update()
      if (progress === 1) {
        transition.current = null
        controls.current.enableDamping = true
        onCamera({ position: camera.position.toArray(), distance: camera.position.distanceTo(controls.current.target) })
      }
      else invalidate()
    }
    if (autoRotate) invalidate()
    if (performance.now() - lastReport.current > 250) {
      lastReport.current = performance.now()
      onCamera({ position: camera.position.toArray(), distance: controls.current ? camera.position.distanceTo(controls.current.target) : 0 })
    }
  })
  return <OrbitControls ref={controls} makeDefault zoomToCursor enableDamping dampingFactor={0.08} autoRotate={autoRotate && !transition.current} autoRotateSpeed={0.55} minDistance={info ? info.radius * 0.08 : 0.1} maxDistance={info ? info.radius * 12 : 500} maxPolarAngle={Math.PI / 2 - 0.015} touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }} onStart={() => { transition.current = null; controls.current.enableDamping = true }} />
}

function RenderSettings({ exposure }) {
  const { gl, invalidate } = useThree()
  useEffect(() => { gl.toneMappingExposure = exposure; invalidate() }, [gl, exposure, invalidate])
  return null
}

function Screenshot({ command }) {
  const { gl, scene, camera, invalidate } = useThree()
  const pending = useRef(false)
  useEffect(() => { if (command?.type === 'snapshot') { pending.current = true; invalidate() } }, [command, invalidate])
  useFrame(() => {
    if (!pending.current) return
    pending.current = false
    gl.render(scene, camera)
    const link = document.createElement('a')
    link.download = 'office-view.png'
    link.href = gl.domElement.toDataURL('image/png')
    link.click()
  })
  return null
}

function AnimationFrames({ active }) {
  const invalidate = useThree(state => state.invalidate)
  useFrame(() => { if (active) invalidate() })
  useEffect(() => { if (active) invalidate() }, [active, invalidate])
  return null
}

function ContextGuard({ onFailure }) {
  const { gl } = useThree()
  useEffect(() => {
    const handler = event => { event.preventDefault(); onFailure(new Error('The graphics context was interrupted. Reload the viewer to reconnect.')) }
    gl.domElement.addEventListener('webglcontextlost', handler)
    return () => gl.domElement.removeEventListener('webglcontextlost', handler)
  }, [gl, onFailure])
  return null
}

function WebGLFallback({ onFailure }) {
  return <div className="error-card">WebGL is unavailable. Enable hardware acceleration or open this page in a browser that supports WebGL.</div>
}

export function LoadingOverlay({ ready }) {
  const { progress, active } = useProgress()
  if (ready) return null
  return <div className="loading-overlay" role="status" aria-live="polite"><div className="loading-orbit"/><h3>Preparing your workspace</h3><p>{active ? 'Loading geometry & original textures' : 'Building the scene'}</p><div className="progress-track"><div style={{ width: `${progress}%` }}/></div><span>{Math.round(progress)}%</span></div>
}

export default function Viewer(props) {
  const [dpr] = useState(() => Math.min(window.devicePixelRatio || 1, 2))
  const shadows = props.quality === 'high'
  return <Canvas frameloop="demand" shadows={shadows ? PCFSoftShadowMap : false} dpr={props.quality === 'high' ? dpr : 1} camera={{ position: [30, 30, 40], fov: 42, near: 0.15, far: 600 }} gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping }} fallback={<WebGLFallback onFailure={props.onFailure}/>} onCreated={({ gl }) => { gl.setClearColor('#eceee8'); gl.toneMappingExposure = 0.9 }}>
    <ambientLight intensity={0.25}/>
    <hemisphereLight args={['#ffffff', '#b6bda8', 0.7]}/>
    <directionalLight position={[15, 28, 12]} intensity={1.8} castShadow={shadows} shadow-mapSize={[2048, 2048]} shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={22} shadow-camera-bottom={-22} shadow-camera-near={1} shadow-camera-far={65} shadow-bias={-0.00015} shadow-normalBias={0.025}/>
    <Suspense fallback={null}>
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={1.5} position={[0, 12, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[25, 25, 1]}/>
        <Lightformer form="rect" intensity={1} position={[-16, 5, 0]} rotation={[0, Math.PI / 2, 0]} scale={[20, 10, 1]}/>
        <Lightformer form="rect" intensity={0.8} position={[16, 5, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[20, 10, 1]}/>
      </Environment>
      <Office {...props} shadows={shadows}/>
    </Suspense>
    {props.info && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -props.info.size[1] / 2 - 0.035, 0]} receiveShadow><planeGeometry args={[160, 160]}/><shadowMaterial transparent opacity={0.16}/></mesh>}
    {props.grid && props.info && <gridHelper args={[80, 40, '#c2c9bd', '#dce0d6']} position={[0, -props.info.size[1] / 2 - 0.05, 0]}/>}
    <CameraRig {...props}/>
    <RenderSettings exposure={props.exposure}/>
    <Screenshot command={props.command}/>
    <AnimationFrames active={Boolean(props.animation) && props.playing}/>
    <ContextGuard onFailure={props.onFailure}/>
  </Canvas>
}
