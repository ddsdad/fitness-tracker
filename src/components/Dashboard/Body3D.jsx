import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'
import { getHeatColor } from '../../utils/heatmap.js'

// ── Helpers ──────────────────────────────────────────────────────────────────
function hex(rgba) {
  const m = rgba.match(/\d+/g)
  if (!m || m.length < 3) return '#444'
  return '#' + m.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('')
}

const SKIN = '#231e18'
const SM   = { roughness: 0.84, metalness: 0.0, color: SKIN }

// ── Base body — anatomically detailed primitives ─────────────────────────────
function BodyBase() {
  return (
    <group>

      {/* ── HEAD ──────────────────────────────────────────────────────── */}
      {/* Cranium — slightly flatter front-back */}
      <mesh position={[0, 1.080, 0]} scale={[0.96, 1.04, 0.90]}>
        <sphereGeometry args={[0.158, 32, 32]} />
        <meshStandardMaterial {...SM} />
      </mesh>
      {/* Lower face / jaw */}
      <mesh position={[0, 0.965, 0.022]} scale={[0.84, 0.50, 0.80]}>
        <sphereGeometry args={[0.158, 20, 16]} />
        <meshStandardMaterial {...SM} />
      </mesh>

      {/* ── NECK ──────────────────────────────────────────────────────── */}
      <mesh position={[0, 0.856, 0]}>
        <cylinderGeometry args={[0.060, 0.073, 0.190, 16]} />
        <meshStandardMaterial {...SM} />
      </mesh>

      {/* ── CLAVICLE / UPPER CHEST SHELF ──────────────────────────────── */}
      <mesh position={[0, 0.740, 0.030]} scale={[1.74, 0.46, 0.78]}>
        <sphereGeometry args={[0.162, 20, 14]} />
        <meshStandardMaterial {...SM} />
      </mesh>
      {/* Trap rises — rear neck-to-shoulder shelf */}
      <mesh position={[0, 0.775, -0.048]} scale={[1.38, 0.40, 0.70]}>
        <sphereGeometry args={[0.140, 18, 12]} />
        <meshStandardMaterial {...SM} />
      </mesh>

      {/* ── DELTOID CAPS (left & right) ───────────────────────────────── */}
      {[-1, 1].map((s, i) => (
        <mesh key={i} position={[s * 0.348, 0.655, -0.010]} scale={[0.90, 0.88, 0.94]}>
          <sphereGeometry args={[0.110, 22, 18]} />
          <meshStandardMaterial {...SM} />
        </mesh>
      ))}

      {/* ── CHEST / UPPER TORSO ───────────────────────────────────────── */}
      {/* Core torso capsule */}
      <mesh position={[0, 0.530, 0]} scale={[0.972, 1, 0.775]}>
        <capsuleGeometry args={[0.228, 0.330, 8, 24]} />
        <meshStandardMaterial {...SM} />
      </mesh>
      {/* Pectoral volume — twin lobes, slightly proud of torso */}
      {[-1, 1].map((s, i) => (
        <mesh key={i} position={[s * 0.110, 0.522, 0.175]} scale={[0.84, 0.65, 0.58]}>
          <sphereGeometry args={[0.162, 18, 14]} />
          <meshStandardMaterial {...SM} />
        </mesh>
      ))}
      {/* Lat flare — widen back at mid-torso */}
      {[-1, 1].map((s, i) => (
        <mesh key={i} position={[s * 0.265, 0.352, -0.122]} scale={[0.72, 1.22, 0.52]}>
          <sphereGeometry args={[0.142, 16, 12]} />
          <meshStandardMaterial {...SM} />
        </mesh>
      ))}

      {/* ── WAIST ─────────────────────────────────────────────────────── */}
      <mesh position={[0, 0.148, 0]} scale={[0.702, 1, 0.732]}>
        <capsuleGeometry args={[0.200, 0.218, 8, 16]} />
        <meshStandardMaterial {...SM} />
      </mesh>

      {/* ── PELVIS / HIP BLOCK ────────────────────────────────────────── */}
      <mesh position={[0, -0.115, 0]} scale={[0.888, 0.825, 0.812]}>
        <capsuleGeometry args={[0.225, 0.155, 8, 16]} />
        <meshStandardMaterial {...SM} />
      </mesh>
      {/* Gluteal volume built into base (back of pelvis) */}
      {[-1, 1].map((s, i) => (
        <mesh key={i} position={[s * 0.135, -0.195, -0.192]} scale={[0.80, 0.88, 0.84]}>
          <sphereGeometry args={[0.172, 16, 14]} />
          <meshStandardMaterial {...SM} />
        </mesh>
      ))}

      {/* ── ARMS ──────────────────────────────────────────────────────── */}
      {[-1, 1].map((s, i) => {
        const rz = s * -0.182  // slight natural outward splay
        return (
          <group key={i}>
            {/* Upper arm */}
            <mesh position={[s * 0.425, 0.415, 0.008]} rotation={[0, 0, rz]}>
              <capsuleGeometry args={[0.078, 0.365, 8, 16]} />
              <meshStandardMaterial {...SM} />
            </mesh>
            {/* Elbow joint */}
            <mesh position={[s * 0.443, 0.082, 0.006]}>
              <sphereGeometry args={[0.068, 12, 10]} />
              <meshStandardMaterial {...SM} />
            </mesh>
            {/* Forearm — tapers toward wrist */}
            <mesh position={[s * 0.446, -0.095, 0.006]} rotation={[0, 0, rz * 0.38]}>
              <capsuleGeometry args={[0.057, 0.280, 8, 14]} />
              <meshStandardMaterial {...SM} />
            </mesh>
            {/* Hand */}
            <mesh position={[s * 0.450, -0.268, 0.005]} scale={[0.90, 0.62, 0.50]}>
              <sphereGeometry args={[0.058, 12, 10]} />
              <meshStandardMaterial {...SM} />
            </mesh>
          </group>
        )
      })}

      {/* ── LEGS ──────────────────────────────────────────────────────── */}
      {[-1, 1].map((s, i) => (
        <group key={i}>
          {/* Thigh */}
          <mesh position={[s * 0.148, -0.468, 0.008]}>
            <capsuleGeometry args={[0.120, 0.415, 8, 16]} />
            <meshStandardMaterial {...SM} />
          </mesh>
          {/* Knee */}
          <mesh position={[s * 0.140, -0.735, 0.010]}>
            <sphereGeometry args={[0.095, 12, 10]} />
            <meshStandardMaterial {...SM} />
          </mesh>
          {/* Shin / lower leg */}
          <mesh position={[s * 0.132, -0.908, 0.005]} scale={[0.90, 1, 0.92]}>
            <capsuleGeometry args={[0.080, 0.322, 8, 16]} />
            <meshStandardMaterial {...SM} />
          </mesh>
          {/* Gastrocnemius bulge built into base */}
          <mesh position={[s * 0.130, -0.875, -0.066]} scale={[0.75, 0.72, 0.64]}>
            <sphereGeometry args={[0.094, 12, 10]} />
            <meshStandardMaterial {...SM} />
          </mesh>
          {/* Ankle */}
          <mesh position={[s * 0.124, -1.085, 0.008]} scale={[1, 0.58, 0.88]}>
            <sphereGeometry args={[0.068, 12, 10]} />
            <meshStandardMaterial {...SM} />
          </mesh>
          {/* Foot */}
          <mesh position={[s * 0.121, -1.152, 0.055]} scale={[0.98, 0.40, 1.62]}>
            <capsuleGeometry args={[0.062, 0.092, 6, 10]} />
            <meshStandardMaterial {...SM} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ── Muscle material — fully opaque so Z-buffer correctly occludes back muscles ──
function MuscleMat({ color, active }) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={0.62}
      metalness={0.04}
      emissive={color}
      emissiveIntensity={active ? 0.55 : 0.04}
    />
  )
}

// ── Muscle overlays — flat ellipsoids sitting ON the body surface ─────────────
function Muscles({ vol, goalId, weights, active, onClick }) {
  const c   = (m) => hex(getHeatColor(m, vol[m] || 0, goalId, weights))
  const isA = (m) => active === m

  function Bi({ name, lx, y, z, sx, sy, sz }) {
    const color = c(name); const act = isA(name)
    const geo = <sphereGeometry args={[1, 24, 20]} />
    const click = (e) => { e.stopPropagation(); onClick(name) }
    return (
      <>
        <mesh position={[ lx, y, z]} scale={[sx, sy, sz]} onClick={click}>
          {geo}<MuscleMat color={color} active={act} />
        </mesh>
        <mesh position={[-lx, y, z]} scale={[sx, sy, sz]} onClick={click}>
          {geo}<MuscleMat color={color} active={act} />
        </mesh>
      </>
    )
  }

  function Uni({ name, x, y, z, sx, sy, sz }) {
    const color = c(name); const act = isA(name)
    return (
      <mesh position={[x, y, z]} scale={[sx, sy, sz]}
            onClick={e => { e.stopPropagation(); onClick(name) }}>
        <sphereGeometry args={[1, 24, 20]} />
        <MuscleMat color={color} active={act} />
      </mesh>
    )
  }

  return (
    <group>

      {/* ── FRONT ──────────────────────────────────────────────────── */}

      {/* Pectoralis major — flat lobes on pec surface */}
      <Bi name="chest"       lx={-0.108} y={0.515} z={0.195} sx={0.155} sy={0.125} sz={0.052} />

      {/* Anterior deltoid */}
      <Bi name="front_delts" lx={-0.348} y={0.648} z={0.080} sx={0.088} sy={0.092} sz={0.072} />

      {/* Lateral deltoid */}
      <Bi name="side_delts"  lx={-0.400} y={0.638} z={0.006} sx={0.080} sy={0.108} sz={0.088} />

      {/* Biceps brachii */}
      <Bi name="biceps"      lx={-0.432} y={0.388} z={0.066} sx={0.065} sy={0.162} sz={0.058} />

      {/* Forearm flexors */}
      <Bi name="forearms"    lx={-0.435} y={-0.070} z={0.038} sx={0.050} sy={0.125} sz={0.038} />

      {/* Rectus abdominis — 6 segments */}
      {[-0.052, 0.052].flatMap((x, xi) =>
        [0.132, 0.228, 0.322].map((y, yi) => {
          const color = c('abs'); const act = isA('abs')
          return (
            <mesh key={`abs${xi}${yi}`}
              position={[x, y, 0.158]} scale={[0.055, 0.052, 0.032]}
              onClick={e => { e.stopPropagation(); onClick('abs') }}>
              <sphereGeometry args={[1, 20, 16]} />
              <MuscleMat color={color} active={act} />
            </mesh>
          )
        })
      )}

      {/* Quadriceps */}
      <Bi name="quads"       lx={-0.148} y={-0.460} z={0.118} sx={0.118} sy={0.215} sz={0.088} />

      {/* ── BACK ───────────────────────────────────────────────────── */}

      {/* Trapezius — upper back diamond */}
      <Uni name="traps"      x={0} y={0.625} z={-0.192} sx={0.238} sy={0.165} sz={0.055} />

      {/* Posterior deltoid */}
      <Bi name="rear_delts"  lx={-0.348} y={0.648} z={-0.118} sx={0.082} sy={0.090} sz={0.068} />

      {/* Latissimus dorsi — centered nearer spine, stays inside silhouette */}
      <Bi name="lats"        lx={-0.195} y={0.285} z={-0.192} sx={0.128} sy={0.268} sz={0.068} />

      {/* Rhomboids */}
      <Uni name="rhomboids"  x={0} y={0.482} z={-0.205} sx={0.158} sy={0.138} sz={0.052} />

      {/* Triceps */}
      <Bi name="triceps"     lx={-0.432} y={0.388} z={-0.094} sx={0.068} sy={0.168} sz={0.060} />

      {/* Erector spinae — twin pillars */}
      <Bi name="lower_back"  lx={-0.058} y={0.080} z={-0.222} sx={0.058} sy={0.198} sz={0.046} />

      {/* Gluteus maximus */}
      <Bi name="glutes"      lx={-0.128} y={-0.202} z={-0.240} sx={0.155} sy={0.165} sz={0.130} />

      {/* Hamstrings */}
      <Bi name="hamstrings"  lx={-0.148} y={-0.465} z={-0.155} sx={0.112} sy={0.218} sz={0.082} />

      {/* Gastrocnemius */}
      <Bi name="calves"      lx={-0.105} y={-0.848} z={-0.120} sx={0.068} sy={0.172} sz={0.072} />

    </group>
  )
}

// ── Canvas wrapper ────────────────────────────────────────────────────────────
export default function Body3D({ muscleVolume, goalId, customWeights, activeMuscle, onMuscleClick }) {
  return (
    <div style={{ height: 480, position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#080810' }}>
      <Canvas
        camera={{ position: [0, 0.10, 3.0], fov: 46 }}
        dpr={[1, 2]}
        frameloop="demand"
      >
        {/* 4-point studio lighting rig */}
        <ambientLight intensity={0.20} />
        {/* Key light — front-top-right, warm white */}
        <directionalLight position={[1.8, 4.0, 3.8]} intensity={1.40}
          castShadow shadow-mapSize={[2048, 2048]} color="#fff5e5" />
        {/* Fill light — front-left, cool blue */}
        <directionalLight position={[-2.8, 1.8, 2.0]} intensity={0.30} color="#3355bb" />
        {/* Rim light — behind, cool for silhouette depth */}
        <directionalLight position={[-0.5, 2.0, -4.5]} intensity={0.28} color="#7799ee" />
        {/* Ground bounce — warm amber */}
        <directionalLight position={[0, -2.5, 1.5]} intensity={0.13} color="#cc7733" />

        <group>
          <BodyBase />
          <Muscles
            vol={muscleVolume}
            goalId={goalId}
            weights={customWeights}
            active={activeMuscle}
            onClick={onMuscleClick}
          />
        </group>

        <ContactShadows
          position={[0, -1.26, 0]}
          opacity={0.55}
          scale={2.8}
          blur={2.8}
          far={1.8}
        />

        <OrbitControls
          enablePan={false}
          minDistance={1.6}
          maxDistance={5.5}
          target={[0, 0.08, 0]}
          minPolarAngle={Math.PI * 0.05}
          maxPolarAngle={Math.PI * 0.90}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>

      <div style={{
        position: 'absolute', bottom: 10, left: 0, right: 0,
        textAlign: 'center', fontSize: '0.625rem',
        color: 'rgba(255,255,255,0.28)', pointerEvents: 'none',
        letterSpacing: '0.04em',
      }}>
        drag to rotate · pinch to zoom
      </div>
    </div>
  )
}
