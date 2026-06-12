import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, ContactShadows, useCursor } from '@react-three/drei'
import { getHeatColor } from '../../utils/heatmap.js'
import { useStore } from '../../store/useStore.js'

// ════════════════════════════════════════════════════════════════════════════
//  Body3D v2 — YOUR body, not a mannequin.
//  Every dimension is driven by the measurements you entered: shoulder width,
//  chest/waist/hip girth, arm/thigh/calf size, neck, height, BMI. Change your
//  stats and the model changes with you. Muscles glow on hover, pulse when
//  selected, and the figure breathes.
// ════════════════════════════════════════════════════════════════════════════

function hex(rgba) {
  const m = rgba.match(/\d+/g)
  if (!m || m.length < 3) return '#444'
  return '#' + m.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('')
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// ── Measurement → proportion engine ──────────────────────────────────────────
// Reference girths (cm) for an average-athletic build; your measurement vs the
// reference scales that body part. Circumference scales radius linearly.
const REF = {
  male:   { neck: 38, shoulders: 115, chest: 100, waist: 83, hips: 96, arms: 35, thighs: 57, calves: 37, height: 176 },
  female: { neck: 32, shoulders: 101, chest: 90,  waist: 72, hips: 99, arms: 28, thighs: 56, calves: 36, height: 163 },
}

export function buildProportions(profile) {
  const g = profile?.gender === 'female' ? 'female' : 'male'
  const R = REF[g]
  const isLbs = profile?.unit === 'lbs'
  const cm = (v) => (v ? (isLbs ? v * 2.54 : v) : 0)          // girths stored in in / cm
  const m = profile?.measurements || {}

  const heightCm = isLbs ? (profile?.height || 0) * 2.54 : (profile?.height || 0)
  const bwKg     = isLbs ? (profile?.bodyweight || 0) / 2.2046 : (profile?.bodyweight || 0)
  const bmi      = heightCm > 0 && bwKg > 0 ? bwKg / ((heightCm / 100) ** 2) : 23.5
  const flesh    = clamp(bmi / 23.5, 0.86, 1.28)               // global softness/thickness

  const s = (val, ref, lo = 0.78, hi = 1.4) => (val > 0 ? clamp(val / ref, lo, hi) : flesh)

  return {
    g,
    height: clamp(heightCm > 0 ? heightCm / R.height : 1, 0.93, 1.07),
    sh:     s(cm(m.shoulders), R.shoulders, 0.85, 1.25),       // shoulder breadth
    chest:  s(cm(m.chest),     R.chest),                       // ribcage + pec girth
    waist:  s(cm(m.waist),     R.waist),
    hips:   s(cm(m.hips),      R.hips),
    arm:    s(cm(m.arms),      R.arms),
    thigh:  s(cm(m.thighs),    R.thighs),
    calf:   s(cm(m.calves),    R.calves),
    neck:   s(cm(profile?.neck), R.neck, 0.85, 1.25),
    flesh,
  }
}

// ── Skin material — warm bronze, soft sheen (reads well in dark & light) ─────
const SKIN = '#9a6b4f'
function Skin() {
  return <meshStandardMaterial color={SKIN} roughness={0.55} metalness={0.05} />
}

// ── Parametric body ───────────────────────────────────────────────────────────
function BodyBase({ P }) {
  const shx = P.sh                       // lateral shoulder/arm multiplier
  const armR = P.arm, thighR = P.thigh, calfR = P.calf
  const female = P.g === 'female'

  return (
    <group scale={[1, P.height, 1]}>
      {/* HEAD */}
      <mesh position={[0, 1.080, 0]} scale={[0.96, 1.05, 0.92]}>
        <sphereGeometry args={[0.155, 48, 48]} /><Skin />
      </mesh>
      <mesh position={[0, 0.962, 0.020]} scale={[0.82, 0.52, 0.78]}>
        <sphereGeometry args={[0.155, 32, 24]} /><Skin />
      </mesh>

      {/* NECK */}
      <mesh position={[0, 0.856, 0]}>
        <cylinderGeometry args={[0.058 * P.neck, 0.072 * P.neck, 0.190, 24]} /><Skin />
      </mesh>

      {/* CLAVICLE SHELF + TRAPS */}
      <mesh position={[0, 0.742, 0.028]} scale={[1.70 * shx, 0.46, 0.76]}>
        <sphereGeometry args={[0.162, 32, 20]} /><Skin />
      </mesh>
      <mesh position={[0, 0.778, -0.046]} scale={[1.34 * shx, 0.42, 0.70]}>
        <sphereGeometry args={[0.140, 28, 18]} /><Skin />
      </mesh>

      {/* DELTOID CAPS */}
      {[-1, 1].map((s, i) => (
        <mesh key={i} position={[s * 0.348 * shx, 0.655, -0.008]} scale={[0.92, 0.90, 0.96]}>
          <sphereGeometry args={[0.108 * Math.max(armR, 0.9), 32, 24]} /><Skin />
        </mesh>
      ))}

      {/* TORSO — ribcage tapering into waist */}
      <mesh position={[0, 0.530, 0]} scale={[0.95 * P.chest * (female ? 0.93 : 1), 1, 0.74 * P.chest]}>
        <capsuleGeometry args={[0.230, 0.330, 12, 36]} /><Skin />
      </mesh>
      {/* Pec / chest plates */}
      {[-1, 1].map((s, i) => (
        <mesh key={i} position={[s * 0.110, 0.522, 0.168 * P.chest]} scale={[0.86, female ? 0.72 : 0.64, 0.60]}>
          <sphereGeometry args={[0.160 * P.chest, 28, 20]} /><Skin />
        </mesh>
      ))}
      {/* Lat flare */}
      {[-1, 1].map((s, i) => (
        <mesh key={i} position={[s * 0.262 * P.chest, 0.352, -0.118]} scale={[0.74, 1.24, 0.54]}>
          <sphereGeometry args={[0.142 * P.chest, 24, 16]} /><Skin />
        </mesh>
      ))}

      {/* WAIST */}
      <mesh position={[0, 0.148, 0]} scale={[0.70 * P.waist, 1, 0.72 * P.waist]}>
        <capsuleGeometry args={[0.202, 0.218, 12, 28]} /><Skin />
      </mesh>

      {/* PELVIS + GLUTES */}
      <mesh position={[0, -0.115, 0]} scale={[0.88 * P.hips, 0.83, 0.80 * P.hips]}>
        <capsuleGeometry args={[0.226, 0.155, 12, 28]} /><Skin />
      </mesh>
      {[-1, 1].map((s, i) => (
        <mesh key={i} position={[s * 0.132 * P.hips, -0.196, -0.186 * P.hips]} scale={[0.82, 0.90, 0.86]}>
          <sphereGeometry args={[0.172 * P.hips, 24, 18]} /><Skin />
        </mesh>
      ))}

      {/* ARMS */}
      {[-1, 1].map((s, i) => {
        const rz = s * -0.185
        const ax = 0.425 * shx
        return (
          <group key={i}>
            <mesh position={[s * ax, 0.415, 0.008]} rotation={[0, 0, rz]}>
              <capsuleGeometry args={[0.077 * armR, 0.365, 12, 24]} /><Skin />
            </mesh>
            <mesh position={[s * (ax + 0.018), 0.082, 0.006]}>
              <sphereGeometry args={[0.066 * armR, 20, 16]} /><Skin />
            </mesh>
            <mesh position={[s * (ax + 0.021), -0.095, 0.006]} rotation={[0, 0, rz * 0.38]}>
              <capsuleGeometry args={[0.056 * Math.max(armR * 0.92, 0.8), 0.280, 12, 22]} /><Skin />
            </mesh>
            <mesh position={[s * (ax + 0.025), -0.268, 0.005]} scale={[0.90, 0.62, 0.50]}>
              <sphereGeometry args={[0.058, 16, 12]} /><Skin />
            </mesh>
          </group>
        )
      })}

      {/* LEGS */}
      {[-1, 1].map((s, i) => {
        const lx = 0.148 * P.hips
        return (
          <group key={i}>
            <mesh position={[s * lx, -0.468, 0.008]}>
              <capsuleGeometry args={[0.118 * thighR, 0.415, 12, 26]} /><Skin />
            </mesh>
            <mesh position={[s * (lx - 0.008), -0.735, 0.010]}>
              <sphereGeometry args={[0.090 * thighR, 18, 14]} /><Skin />
            </mesh>
            <mesh position={[s * (lx - 0.016), -0.908, 0.005]} scale={[0.90, 1, 0.92]}>
              <capsuleGeometry args={[0.078 * calfR, 0.322, 12, 24]} /><Skin />
            </mesh>
            <mesh position={[s * (lx - 0.018), -0.875, -0.064]} scale={[0.78, 0.74, 0.66]}>
              <sphereGeometry args={[0.094 * calfR, 18, 14]} /><Skin />
            </mesh>
            <mesh position={[s * (lx - 0.024), -1.085, 0.008]} scale={[1, 0.58, 0.88]}>
              <sphereGeometry args={[0.066, 16, 12]} /><Skin />
            </mesh>
            <mesh position={[s * (lx - 0.027), -1.152, 0.055]} scale={[0.98, 0.40, 1.62]}>
              <capsuleGeometry args={[0.062, 0.092, 8, 14]} /><Skin />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// ── One interactive muscle — hover glow, selected pulse ──────────────────────
function MuscleMesh({ name, position, scale, color, active, hovered, setHovered, onClick, heightS }) {
  const ref = useRef()
  const isHover = hovered === name

  useFrame(({ clock }) => {
    if (!ref.current) return
    const mat = ref.current.material
    const target = active ? 0.85 + Math.sin(clock.elapsedTime * 5) * 0.25 : isHover ? 0.5 : 0.1
    mat.emissiveIntensity += (target - mat.emissiveIntensity) * 0.18
    const sPulse = active ? 1 + Math.sin(clock.elapsedTime * 5) * 0.05 : isHover ? 1.06 : 1
    ref.current.scale.set(scale[0] * sPulse, scale[1] * sPulse, scale[2] * sPulse)
  })

  return (
    <mesh
      ref={ref}
      position={[position[0], position[1] * heightS, position[2]]}
      scale={scale}
      onClick={(e) => { e.stopPropagation(); onClick(name) }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(name) }}
      onPointerOut={() => setHovered(h => (h === name ? null : h))}
    >
      <sphereGeometry args={[1, 28, 22]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} emissive={color} emissiveIntensity={0.1} />
    </mesh>
  )
}

// ── Muscle overlays — anchored to the SAME proportion system as the body ─────
function Muscles({ P, vol, goalId, weights, active, onClick }) {
  const [hovered, setHovered] = useState(null)
  useCursor(!!hovered)
  const c = (m) => hex(getHeatColor(m, vol[m] || 0, goalId, weights))
  const shx = P.sh, armR = P.arm, thighR = P.thigh, calfR = P.calf
  const ax = 0.425 * shx
  const lx = 0.148 * P.hips

  const M = ({ name, x, y, z, sx, sy, sz, both = true }) => {
    const common = {
      name, color: c(name), active: active === name,
      hovered, setHovered, onClick, heightS: P.height,
    }
    return (
      <>
        <MuscleMesh {...common} position={[x, y, z]} scale={[sx, sy, sz]} />
        {both && <MuscleMesh {...common} position={[-x, y, z]} scale={[sx, sy, sz]} />}
      </>
    )
  }

  return (
    <group>
      {/* FRONT */}
      <M name="chest"       x={0.108} y={0.515} z={0.178 * P.chest + 0.022} sx={0.155 * P.chest} sy={0.125} sz={0.052} />
      <M name="front_delts" x={0.348 * shx} y={0.648} z={0.082} sx={0.088} sy={0.092} sz={0.072} />
      <M name="side_delts"  x={0.402 * shx} y={0.638} z={0.004} sx={0.080} sy={0.108} sz={0.088} />
      <M name="biceps"      x={ax + 0.007} y={0.388} z={0.068} sx={0.064 * armR} sy={0.162} sz={0.058} />
      <M name="forearms"    x={ax + 0.012} y={-0.070} z={0.040} sx={0.050 * armR} sy={0.125} sz={0.038} />
      {/* abs — single interactive sheet w/ 6-pack relief */}
      {[-0.052, 0.052].flatMap((x) =>
        [0.132, 0.228, 0.322].map((y) => (
          <MuscleMesh key={`abs${x}${y}`} name="abs" color={c('abs')} active={active === 'abs'}
            hovered={hovered} setHovered={setHovered} onClick={onClick} heightS={P.height}
            position={[x, y, 0.150 * P.waist + 0.012]} scale={[0.055, 0.052, 0.032]} />
        ))
      )}
      <M name="quads"       x={lx} y={-0.460} z={0.105 * thighR + 0.015} sx={0.115 * thighR} sy={0.215} sz={0.088} />

      {/* BACK */}
      <M name="traps"       x={0} y={0.625} z={-0.192} sx={0.238 * shx} sy={0.165} sz={0.055} both={false} />
      <M name="rear_delts"  x={0.348 * shx} y={0.648} z={-0.118} sx={0.082} sy={0.090} sz={0.068} />
      <M name="lats"        x={0.195 * P.chest} y={0.285} z={-0.188} sx={0.128 * P.chest} sy={0.268} sz={0.068} />
      <M name="rhomboids"   x={0} y={0.482} z={-0.205} sx={0.158} sy={0.138} sz={0.052} both={false} />
      <M name="triceps"     x={ax + 0.007} y={0.388} z={-0.094} sx={0.067 * armR} sy={0.168} sz={0.060} />
      <M name="lower_back"  x={0.058} y={0.080} z={-0.215 * P.waist - 0.01} sx={0.058} sy={0.198} sz={0.046} />
      <M name="glutes"      x={0.128 * P.hips} y={-0.202} z={-0.235 * P.hips} sx={0.155 * P.hips} sy={0.165} sz={0.130} />
      <M name="hamstrings"  x={lx} y={-0.465} z={-0.145 * thighR - 0.012} sx={0.110 * thighR} sy={0.218} sz={0.082} />
      <M name="calves"      x={lx - 0.04} y={-0.848} z={-0.118} sx={0.066 * calfR} sy={0.172} sz={0.072} />
    </group>
  )
}

// ── Breathing — the figure is alive ───────────────────────────────────────────
function Breathing({ children }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const b = 1 + Math.sin(clock.elapsedTime * 1.1) * 0.006
    ref.current.scale.set(b, 1, b)
  })
  return <group ref={ref}>{children}</group>
}

// ── Canvas wrapper ────────────────────────────────────────────────────────────
export default function Body3D({ muscleVolume, goalId, customWeights, activeMuscle, onMuscleClick }) {
  const { profile } = useStore()
  const P = useMemo(() => buildProportions(profile), [
    profile?.gender, profile?.unit, profile?.height, profile?.bodyweight, profile?.neck,
    JSON.stringify(profile?.measurements || {}),
  ])

  return (
    <div style={{
      height: 480, position: 'relative', borderRadius: 12, overflow: 'hidden',
      // Theme-aware backdrop — adapts to dark AND light mode
      background: 'radial-gradient(circle at 50% 28%, var(--bg4) 0%, var(--bg) 78%)',
    }}>
      <Canvas
        camera={{ position: [0, 0.10, 3.0], fov: 46 }}
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        fallback={
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '0.8rem', textAlign: 'center', padding: 20 }}>
            🧍 3D view needs WebGL — not available on this device/browser.
          </div>
        }
      >
        {/* Studio rig */}
        <hemisphereLight intensity={0.55} color="#ffffff" groundColor="#46352a" />
        <directionalLight position={[2.2, 4.0, 3.6]} intensity={1.55} color="#fff2e0" />
        <directionalLight position={[-2.8, 1.6, 2.2]} intensity={0.35} color="#5577cc" />
        <directionalLight position={[-0.5, 2.2, -4.5]} intensity={0.65} color="#88aaff" />
        <directionalLight position={[0, -2.5, 1.5]} intensity={0.18} color="#cc8844" />

        <Breathing>
          <BodyBase P={P} />
          <Muscles
            P={P}
            vol={muscleVolume}
            goalId={goalId}
            weights={customWeights}
            active={activeMuscle}
            onClick={onMuscleClick}
          />
        </Breathing>

        <ContactShadows position={[0, -1.30, 0]} opacity={0.5} scale={3} blur={2.6} far={1.9} />

        <OrbitControls
          enablePan={false}
          minDistance={1.6}
          maxDistance={5.5}
          target={[0, 0.08, 0]}
          minPolarAngle={Math.PI * 0.05}
          maxPolarAngle={Math.PI * 0.90}
          enableDamping
          dampingFactor={0.08}
          autoRotate
          autoRotateSpeed={0.7}
        />
      </Canvas>

      <div style={{
        position: 'absolute', bottom: 10, left: 0, right: 0,
        textAlign: 'center', fontSize: '0.625rem',
        color: 'var(--text3)', pointerEvents: 'none', letterSpacing: '0.04em',
      }}>
        built from your measurements · drag to rotate · tap a muscle
      </div>
    </div>
  )
}
