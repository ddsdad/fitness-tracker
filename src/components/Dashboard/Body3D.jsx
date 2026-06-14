import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
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
  return <meshStandardMaterial color={SKIN} roughness={0.5} metalness={0.04} />
}

// ── Lofted-surface builder ────────────────────────────────────────────────────
// Stitches a stack of elliptical cross-section "rings" into ONE smooth, closed,
// vertex-welded surface (no seams, no overlapping blobs). Each ring: { y, rx,
// rz, cz } — half-width, half-depth, and a front/back centre offset. A smooth
// bell taper caps both ends so torso/limbs close cleanly.
function loftGeometry(rings, radial = 32) {
  const geo = new THREE.BufferGeometry()
  const rows = rings.length
  const pos = [], norm = [], idx = []

  for (let r = 0; r < rows; r++) {
    const ring = rings[r]
    for (let a = 0; a <= radial; a++) {
      const t = (a / radial) * Math.PI * 2
      const cs = Math.cos(t), sn = Math.sin(t)
      pos.push(ring.rx * cs, ring.y, ring.cz + ring.rz * sn)
      // approximate outward normal from the ellipse
      const nx = cs / ring.rx, nz = sn / ring.rz
      const len = Math.hypot(nx, nz) || 1
      norm.push(nx / len, 0.12, nz / len)
    }
  }
  const ringLen = radial + 1
  for (let r = 0; r < rows - 1; r++) {
    for (let a = 0; a < radial; a++) {
      const c = r * ringLen + a, n = c + ringLen
      idx.push(c, n, c + 1, c + 1, n, n + 1)
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

// A smooth tapered limb segment (truncated-cone-ish) as a closed lathe surface.
function limbRings(yTop, yBot, rTop, rBot, bulge = 0, segs = 10) {
  const rings = []
  for (let i = 0; i <= segs; i++) {
    const f = i / segs
    const y = yTop + (yBot - yTop) * f
    // sine bulge gives a muscle belly mid-segment
    const b = 1 + Math.sin(f * Math.PI) * bulge
    const rr = (rTop + (rBot - rTop) * f) * b
    rings.push({ y, rx: rr, rz: rr * 0.92, cz: 0 })
  }
  return rings
}

// ── Parametric body — one continuous skin, driven by measurements ─────────────
function BodyBase({ P }) {
  const shx = P.sh, armR = P.arm, thighR = P.thigh, calfR = P.calf
  const female = P.g === 'female'

  // TORSO silhouette: a single lofted tube flowing neck→traps→chest→waist→hips.
  // Each ring's rx (width) / rz (depth) comes straight from the proportions, so
  // a wide-shoulder / narrow-waist build reads as a real V-taper, not blobs.
  const torso = useMemo(() => {
    const W = (k) => 0.5 * k          // helper: half-width
    const rings = [
      { y: 0.86, rx: W(0.13) * P.neck,         rz: W(0.12) * P.neck,        cz: 0 },     // base of neck
      { y: 0.80, rx: W(0.30) * shx,            rz: W(0.20),                 cz: 0 },     // clavicle shelf
      { y: 0.74, rx: W(0.46) * shx,            rz: W(0.27) * P.chest,       cz: 0.012 }, // shoulders (widest)
      { y: 0.66, rx: W(0.44) * shx,            rz: W(0.30) * P.chest,       cz: 0.018 }, // upper chest
      { y: 0.56, rx: W(0.41) * P.chest,        rz: W(0.31) * P.chest,       cz: 0.02 },  // mid chest (pecs)
      { y: 0.46, rx: W(0.37) * P.chest,        rz: W(0.28) * P.chest,       cz: 0.01 },  // lower ribcage
      { y: 0.34, rx: W(0.31) * P.waist,        rz: W(0.235) * P.waist,      cz: 0 },     // upper abs
      { y: 0.22, rx: W(0.285) * P.waist,       rz: W(0.225) * P.waist,      cz: 0 },     // waist (narrowest)
      { y: 0.10, rx: W(0.33) * P.hips,         rz: W(0.25) * P.hips,        cz: -0.004 },// lower abs
      { y: -0.02, rx: W(0.40) * P.hips,        rz: W(0.30) * P.hips,        cz: -0.01 }, // hips
      { y: -0.13, rx: W(0.40) * P.hips,        rz: W(0.32) * P.hips,        cz: -0.02 }, // glutes/seat
      { y: -0.22, rx: W(0.30) * P.hips,        rz: W(0.26) * P.hips,        cz: -0.01 }, // crotch taper
    ]
    if (female) { rings.forEach(r => { if (r.y > 0.1 && r.y < 0.4) r.rx *= 0.92 }) }   // narrower female torso
    return loftGeometry(rings, 40)
  }, [P.neck, shx, P.chest, P.waist, P.hips, female])

  const neckGeo  = useMemo(() => loftGeometry(limbRings(0.95, 0.85, 0.060 * P.neck, 0.075 * P.neck, 0), 24), [P.neck])
  const upperArm = useMemo(() => loftGeometry(limbRings(0.0, -0.36, 0.082 * armR, 0.060 * armR, 0.18), 20), [armR])
  const foreArm  = useMemo(() => loftGeometry(limbRings(0.0, -0.30, 0.058 * armR, 0.044, 0.14), 18), [armR])
  const thighGeo = useMemo(() => loftGeometry(limbRings(0.0, -0.42, 0.135 * thighR, 0.092 * thighR, 0.14), 22), [thighR])
  const shinGeo  = useMemo(() => loftGeometry(limbRings(0.0, -0.40, 0.082 * calfR, 0.050, 0.28), 20), [calfR])

  const ax = 0.40 * shx       // shoulder joint x
  const lx = 0.135 * P.hips   // hip joint x

  return (
    <group scale={[1, P.height, 1]}>
      {/* HEAD */}
      <mesh position={[0, 1.085, 0.01]} scale={[0.92, 1.06, 0.94]}>
        <sphereGeometry args={[0.15, 48, 48]} /><Skin />
      </mesh>
      <mesh position={[0, 0.97, 0.03]} scale={[0.78, 0.56, 0.74]}>
        <sphereGeometry args={[0.15, 32, 24]} /><Skin />
      </mesh>

      {/* NECK */}
      <mesh geometry={neckGeo}><Skin /></mesh>

      {/* TORSO — single lofted skin */}
      <mesh geometry={torso}><Skin /></mesh>

      {/* DELTOID caps blend the arm into the shoulder */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * ax, 0.70, 0.012]} scale={[0.96, 0.86, 0.96]}>
          <sphereGeometry args={[0.10 * Math.max(armR, 0.92), 28, 22]} /><Skin />
        </mesh>
      ))}

      {/* ARMS — smooth tapered tubes, tucked close with a slight outward splay */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * ax, 0.66, -0.005]} rotation={[0, 0, s * 0.10]}>
          <mesh geometry={upperArm}><Skin /></mesh>
          <mesh position={[0, -0.36, 0]} scale={[0.92, 1, 0.92]}>
            <sphereGeometry args={[0.062 * armR, 18, 14]} /><Skin />
          </mesh>
          <mesh geometry={foreArm} position={[0, -0.37, 0]} rotation={[0, 0, s * -0.05]}><Skin /></mesh>
          <mesh position={[0, -0.70, 0.01]} scale={[0.85, 0.7, 0.5]}>
            <sphereGeometry args={[0.06, 16, 12]} /><Skin />
          </mesh>
        </group>
      ))}

      {/* LEGS — thigh + calf tubes, knee/ankle/foot caps */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * lx, -0.24, 0.005]}>
          <mesh geometry={thighGeo}><Skin /></mesh>
          <mesh position={[0, -0.43, 0.005]} scale={[0.95, 0.92, 0.98]}>
            <sphereGeometry args={[0.085 * thighR, 18, 14]} /><Skin />
          </mesh>
          <mesh geometry={shinGeo} position={[0, -0.45, 0]}><Skin /></mesh>
          {/* gastroc bulge */}
          <mesh position={[0, -0.62, -0.05]} scale={[0.7, 0.95, 0.6]}>
            <sphereGeometry args={[0.082 * calfR, 16, 14]} /><Skin />
          </mesh>
          <mesh position={[0, -0.86, 0.0]} scale={[1, 0.55, 0.9]}>
            <sphereGeometry args={[0.062, 14, 12]} /><Skin />
          </mesh>
          {/* foot */}
          <mesh position={[0, -0.90, 0.06]} scale={[0.95, 0.4, 1.7]}>
            <sphereGeometry args={[0.06, 16, 12]} /><Skin />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ── One interactive muscle — hover glow, selected pulse ──────────────────────
// Untrained muscles render in this gray (from getHeatColor at volume 0).
const UNTRAINED_HEX = '#464646'

function MuscleMesh({ name, position, scale, color, active, hovered, setHovered, onClick, heightS }) {
  const ref = useRef()
  const isHover = hovered === name
  // An untrained muscle should DISSOLVE into the skin (a clean body), not sit on
  // it as a gray lump. Trained muscles read as flat colored "decals" hugging the
  // surface — so the figure looks painted-on, not assembled from blobs.
  const untrained = color.toLowerCase() === UNTRAINED_HEX
  const dispColor = untrained ? SKIN : color

  useFrame(({ clock }) => {
    if (!ref.current) return
    const mat = ref.current.material
    // Opacity: trained = visible decal; untrained = barely-there (melts into skin)
    const baseOpacity = untrained ? (isHover ? 0.5 : 0.0) : (active ? 1 : isHover ? 0.96 : 0.9)
    mat.opacity += (baseOpacity - mat.opacity) * 0.2
    const emTarget = untrained ? (isHover ? 0.3 : 0) : active ? 0.9 + Math.sin(clock.elapsedTime * 5) * 0.3 : isHover ? 0.55 : 0.22
    mat.emissiveIntensity += (emTarget - mat.emissiveIntensity) * 0.18
    // Only the active muscle gently pulses; others stay flush to the body
    const sPulse = active ? 1 + Math.sin(clock.elapsedTime * 5) * 0.04 : 1
    ref.current.scale.set(scale[0] * sPulse, scale[1] * sPulse, scale[2] * sPulse)
  })

  return (
    <mesh
      ref={ref}
      position={[position[0], position[1] * heightS, position[2]]}
      scale={scale}
      renderOrder={2}
      onClick={(e) => { e.stopPropagation(); onClick(name) }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(name) }}
      onPointerOut={() => setHovered(h => (h === name ? null : h))}
    >
      <sphereGeometry args={[1, 24, 18]} />
      <meshStandardMaterial color={dispColor} roughness={0.45} metalness={0.0}
        emissive={dispColor} emissiveIntensity={0.2} transparent opacity={untrained ? 0 : 0.9}
        depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  )
}

// ── Muscle overlays — anchored to the SAME proportion system as the body ─────
function Muscles({ P, vol, goalId, weights, active, onClick }) {
  const [hovered, setHovered] = useState(null)
  useCursor(!!hovered)
  const c = (m) => hex(getHeatColor(m, vol[m] || 0, goalId, weights))
  const shx = P.sh, armR = P.arm, thighR = P.thigh, calfR = P.calf
  // Match the base body's joint anchors so overlays sit on the new lofted skin
  const ax = 0.40 * shx       // shoulder joint x (was 0.425)
  const lx = 0.135 * P.hips   // hip joint x (was 0.148)

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

  // Overlays are flattened (thin sz) and pressed slightly INTO the surface so
  // trained muscles read as colored skin zones, never protruding lumps.
  const FLAT = 0.6   // global depth squash for the decal look
  return (
    <group>
      {/* FRONT */}
      <M name="chest"       x={0.10} y={0.52} z={0.165 * P.chest} sx={0.15 * P.chest} sy={0.12} sz={0.04 * FLAT} />
      <M name="front_delts" x={0.36 * shx} y={0.685} z={0.05} sx={0.085} sy={0.09} sz={0.06 * FLAT} />
      <M name="side_delts"  x={0.40 * shx} y={0.675} z={-0.01} sx={0.075} sy={0.1} sz={0.07 * FLAT} />
      <M name="biceps"      x={ax * 1.0 + 0.005} y={0.45} z={0.06} sx={0.06 * armR} sy={0.15} sz={0.05 * FLAT} />
      <M name="forearms"    x={ax * 1.05} y={0.10} z={0.045} sx={0.048 * armR} sy={0.12} sz={0.038 * FLAT} />
      {/* abs — single interactive sheet w/ 6-pack relief */}
      {[-0.05, 0.05].flatMap((x) =>
        [0.16, 0.25, 0.34].map((y) => (
          <MuscleMesh key={`abs${x}${y}`} name="abs" color={c('abs')} active={active === 'abs'}
            hovered={hovered} setHovered={setHovered} onClick={onClick} heightS={P.height}
            position={[x, y, 0.135 * P.waist]} scale={[0.05, 0.05, 0.025]} />
        ))
      )}
      <M name="quads"       x={lx} y={-0.44} z={0.10 * thighR} sx={0.11 * thighR} sy={0.2} sz={0.06 * FLAT} />

      {/* BACK */}
      <M name="traps"       x={0} y={0.66} z={-0.16} sx={0.22 * shx} sy={0.15} sz={0.05 * FLAT} both={false} />
      <M name="rear_delts"  x={0.36 * shx} y={0.685} z={-0.10} sx={0.08} sy={0.088} sz={0.06 * FLAT} />
      <M name="lats"        x={0.18 * P.chest} y={0.33} z={-0.16} sx={0.12 * P.chest} sy={0.26} sz={0.05 * FLAT} />
      <M name="rhomboids"   x={0} y={0.50} z={-0.17} sx={0.15} sy={0.13} sz={0.045 * FLAT} both={false} />
      <M name="triceps"     x={ax * 1.0 + 0.005} y={0.45} z={-0.085} sx={0.062 * armR} sy={0.155} sz={0.05 * FLAT} />
      <M name="lower_back"  x={0.055} y={0.12} z={-0.18 * P.waist} sx={0.055} sy={0.18} sz={0.04 * FLAT} />
      <M name="glutes"      x={0.12 * P.hips} y={-0.04} z={-0.21 * P.hips} sx={0.14 * P.hips} sy={0.15} sz={0.1 * FLAT} />
      <M name="hamstrings"  x={lx} y={-0.45} z={-0.13 * thighR} sx={0.105 * thighR} sy={0.2} sz={0.06 * FLAT} />
      <M name="calves"      x={lx} y={-0.86} z={-0.10} sx={0.062 * calfR} sy={0.16} sz={0.06 * FLAT} />
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
