import { DoubleSide, Vector2 } from 'three'

export const WASHROOM_FIXTURES = [
  {toilet:[-26.25,.092,-2.2],rotation:Math.PI,basin:[-24.85,.092,-3.7],basinRotation:-Math.PI/2},
  {toilet:[-23.3,.092,-5.45],rotation:0,basin:[-22.45,.092,-3.9],basinRotation:-Math.PI/2},
]
function Ceramic(){return <meshPhysicalMaterial color="#f1f0eb" roughness={.19} metalness={0} clearcoat={.6} clearcoatRoughness={.15}/>}
function Chrome(){return <meshStandardMaterial color="#bfc7cb" metalness={.95} roughness={.17}/>}
function Toilet(){return <group name="Sanitary toilet">
  <mesh position={[0,.18,0]} scale={[.19,.18,.24]} castShadow receiveShadow><sphereGeometry args={[1,28,20]}/><Ceramic/></mesh>
  <mesh position={[0,.39,.07]} scale={[.235,.14,.32]} castShadow receiveShadow><sphereGeometry args={[1,32,24]}/><Ceramic/></mesh>
  <mesh position={[0,.493,.09]} rotation={[-Math.PI/2,0,0]} scale={[1,1.4,1]} castShadow><torusGeometry args={[.175,.033,12,40]}/><Ceramic/></mesh>
  <mesh position={[0,.491,.09]} rotation={[-Math.PI/2,0,0]} scale={[1,1.4,1]}><circleGeometry args={[.15,32]}/><meshStandardMaterial color="#858e8c" roughness={.2}/></mesh>
  <mesh position={[0,.56,-.23]} castShadow><boxGeometry args={[.43,.44,.19]}/><Ceramic/></mesh>
  <mesh position={[0,.79,-.23]} castShadow><boxGeometry args={[.45,.035,.21]}/><Ceramic/></mesh>
  <mesh position={[.1,.814,-.23]}><cylinderGeometry args={[.024,.024,.012,16]}/><Chrome/></mesh>
  <group position={[-.45,.62,-.19]}><mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.065,.065,.13,20]}/><meshStandardMaterial color="#eeece3" roughness={1}/></mesh><mesh position={[0,-.08,0]}><boxGeometry args={[.14,.01,.09]}/><Chrome/></mesh></group>
</group>}
function Basin(){return <group name="Sanitary washbasin">
  <mesh position={[0,.79,0]} castShadow receiveShadow><boxGeometry args={[.72,.12,.48]}/><Ceramic/></mesh>
  <mesh position={[0,.845,.035]} scale={[1,1,.68]} castShadow receiveShadow><latheGeometry args={[[new Vector2(.025,.005),new Vector2(.09,.01),new Vector2(.17,.035),new Vector2(.235,.09),new Vector2(.255,.11)],40]}/><meshPhysicalMaterial color="#f1f0eb" roughness={.19} clearcoat={.6} side={DoubleSide}/></mesh>
  <mesh position={[0,.853,.035]}><cylinderGeometry args={[.027,.027,.01,16]}/><Chrome/></mesh>
  <mesh position={[0,.54,-.15]} castShadow><cylinderGeometry args={[.07,.045,.45,20]}/><Ceramic/></mesh>
  <mesh position={[0,.95,-.17]} castShadow><cylinderGeometry args={[.019,.023,.24,16]}/><Chrome/></mesh>
  <mesh position={[0,1.063,-.10]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.019,.019,.15,16]}/><Chrome/></mesh>
  <mesh position={[0,1.065,-.025]}><sphereGeometry args={[.02,12,12]}/><Chrome/></mesh>
  <mesh position={[0,1.49,-.256]}><boxGeometry args={[.77,.81,.035]}/><Chrome/></mesh>
  <mesh position={[0,1.49,-.234]}><planeGeometry args={[.72,.76]}/><meshPhysicalMaterial color="#aebfc3" metalness={1} roughness={.04} side={DoubleSide}/></mesh>
  <mesh position={[.26,.94,-.08]} castShadow><boxGeometry args={[.065,.15,.065]}/><meshStandardMaterial color="#b7cec5" roughness={.3}/></mesh>
  <mesh position={[.26,1.027,-.08]}><boxGeometry args={[.065,.025,.03]}/><Chrome/></mesh>
</group>}
export default function Washrooms({center}){return <group position={center.map(v=>-v)} name="Added washroom sanitary fittings">{WASHROOM_FIXTURES.map((fixture,i)=><group key={i}><group position={fixture.toilet} rotation={[0,fixture.rotation,0]}><Toilet/></group><group position={fixture.basin} rotation={[0,fixture.basinRotation,0]}><Basin/></group></group>)}</group>}
