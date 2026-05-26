import { useMemo } from 'react'
import {
  navyBF, lbmAndFat, ffmi, caseyButtCeiling, reevesIdeals, weaknessScores,
  shoulderWaistRatio, frameSize, strengthTierForLift, leverageProfile, tdee, macros
} from '../../utils/calculations.js'
import { IconArrowUp, IconArrowDown, IconInfo } from '../shared/Icons.jsx'

function Row({ label, value, sub, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: '1px solid var(--bg4)' }}>
      <span style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontWeight: 600, color: accent || 'var(--text)' }}>{value}</span>
        {sub && <div style={{ fontSize: '0.6875rem', color: 'var(--text3)' }}>{sub}</div>}
      </div>
    </div>
  )
}

function GaugeBar({ value, min, max, color, label }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text3)', marginBottom: 4 }}>
        <span>{label}</span><span style={{ color }}>{value}</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg4)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

export default function BodyStatsPanel({ profile }) {
  const stats = useMemo(() => {
    if (!profile) return null
    const { bodyweight, height, wrist, ankle, neck, gender = 'male', age = 25,
            measurements = {}, segments = {}, liftMaxes = {}, unit, activityLevel = 'moderate' } = profile

    const toKg = (v) => unit === 'kg' ? v : v / 2.2046
    const toCm = (v) => unit === 'kg' ? v : v * 2.54

    const bw_kg  = toKg(bodyweight)
    const ht_cm  = toCm(height)
    const wrist_cm = wrist > 0 ? toCm(wrist) : null
    const ankle_cm = ankle > 0 ? toCm(ankle) : null
    const neck_cm  = neck  > 0 ? toCm(neck)  : null
    const waist_cm = measurements.waist > 0 ? toCm(measurements.waist) : null
    const hips_cm  = measurements.hips  > 0 ? toCm(measurements.hips)  : null
    const shoulder_cm = measurements.shoulders > 0 ? toCm(measurements.shoulders) : null
    const arms_cm  = measurements.arms  > 0 ? toCm(measurements.arms)  : null

    // Body fat
    let bf = null
    if (neck_cm && waist_cm && ht_cm) {
      try { bf = navyBF(waist_cm, neck_cm, ht_cm, gender, hips_cm || 0) } catch {}
    }

    const { lbm, fat } = bf != null ? lbmAndFat(bw_kg, bf) : { lbm: bw_kg * 0.82, fat: bw_kg * 0.18 }

    // FFMI
    const ffmiData = ffmi(lbm, ht_cm)

    // Genetic ceiling
    let ceiling = null
    if (wrist_cm && ankle_cm) {
      ceiling = caseyButtCeiling(ht_cm, wrist_cm, ankle_cm, 0.05)
    }

    // Ceiling progress
    const ceilingPct = ceiling ? Math.min(100, +(lbm / ceiling.maxLBM_kg * 100).toFixed(1)) : null

    // Reeves ideals
    let ideals = null, weakness = null
    if (wrist_cm && ankle_cm) {
      ideals = reevesIdeals(wrist_cm, ankle_cm)
      const curr = {
        arm: arms_cm, calf: measurements.calves > 0 ? toCm(measurements.calves) : null,
        chest: measurements.chest > 0 ? toCm(measurements.chest) : null,
        waist: waist_cm, shoulder: shoulder_cm,
        thigh: measurements.thighs > 0 ? toCm(measurements.thighs) : null,
        neck: neck_cm,
      }
      weakness = weaknessScores(curr, ideals)
    }

    // Shoulder-waist ratio
    const swr = shoulder_cm && waist_cm ? shoulderWaistRatio(shoulder_cm, waist_cm) : null

    // Frame
    const frame = wrist_cm ? frameSize(wrist_cm, gender) : null

    // TDEE
    const tdeeVal = tdee(bw_kg, ht_cm, age, gender, activityLevel)
    const macroData = macros(bw_kg, tdeeVal, 'bulk')

    // Strength tiers
    const tiers = {}
    if (bodyweight > 0) {
      Object.entries(liftMaxes).forEach(([lift, rm]) => {
        if (rm > 0) tiers[lift] = strengthTierForLift(lift, toKg(rm), bw_kg)
      })
    }

    // Leverage
    const lev = segments?.torsoLength > 0 ? leverageProfile(
      segments.femurLength > 0 ? toCm(segments.femurLength) : null,
      segments.torsoLength > 0 ? toCm(segments.torsoLength) : null,
      segments.armLength   > 0 ? toCm(segments.armLength)   : null,
    ) : null

    return { bf, lbm: +lbm.toFixed(1), fat: +fat.toFixed(1), ffmiData, ceiling, ceilingPct, ideals, weakness, swr, frame, tdeeVal, macroData, tiers, lev, unit }
  }, [profile])

  if (!stats) return null

  const { bf, lbm, fat, ffmiData, ceiling, ceilingPct, ideals, weakness, swr, frame, tdeeVal, macroData, tiers, lev, unit } = stats
  const u = unit === 'kg' ? 'kg' : 'lbs'
  const toCmLbl = (v) => unit === 'kg' ? `${v} cm` : `${(v / 2.54).toFixed(1)} in`

  const TIER_COLORS = { Untrained: 'var(--text3)', Novice: 'var(--red)', Intermediate: 'var(--yellow)', Advanced: 'var(--green)', Elite: 'var(--blue)', 'World Class': '#a78bfa' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* FFMI + BF card */}
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Body Composition</h3>
        {bf != null && <Row label="Body Fat %" value={`${bf}%`} sub="US Navy formula" accent={bf < 12 ? 'var(--green)' : bf < 20 ? 'var(--yellow)' : 'var(--red)'} />}
        <Row label="Lean Body Mass" value={`${lbm} ${u}`} />
        <Row label="Fat Mass" value={`${fat} ${u}`} />
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.25rem', color: ffmiData.normalized >= 22 ? 'var(--green)' : ffmiData.normalized >= 20 ? 'var(--yellow)' : 'var(--text)' }}>
                FFMI {ffmiData.normalized}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{ffmiData.rating}</div>
            </div>
            {frame && <div className="badge badge-blue" style={{ alignSelf: 'flex-start' }}>{frame} Frame</div>}
          </div>
          <GaugeBar value={ffmiData.normalized} min={15} max={26} label="15 (avg) — 25 (natural ceiling)" color={ffmiData.normalized >= 22 ? 'var(--green)' : 'var(--yellow)'} />
        </div>
      </div>

      {/* Genetic ceiling */}
      {ceiling && (
        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Genetic Ceiling</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: 14 }}>Casey Butt formula — max natural LBM at ~5% BF.</p>
          <Row label="Your Ceiling LBM" value={`${ceiling.maxLBM_kg} kg`} sub="at 5% body fat" accent="var(--green)" />
          <Row label="Current LBM" value={`${lbm} kg`} />
          <Row label="Remaining Potential" value={`${Math.max(0, ceiling.maxLBM_kg - lbm).toFixed(1)} kg`} accent="var(--blue)" />
          {ceilingPct != null && (
            <div style={{ marginTop: 14 }}>
              <GaugeBar value={ceilingPct} min={0} max={100} label={`${ceilingPct}% of genetic ceiling reached`} color={ceilingPct > 85 ? 'var(--red)' : ceilingPct > 60 ? 'var(--yellow)' : 'var(--green)'} />
            </div>
          )}
        </div>
      )}

      {/* Shoulder-waist ratio */}
      {swr && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3>Shoulder-Waist Ratio</h3>
            <span className={`badge ${swr.ratio >= 1.5 ? 'badge-green' : swr.ratio >= 1.3 ? 'badge-yellow' : 'badge-red'}`}>{swr.rating}</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: swr.ratio >= 1.5 ? 'var(--green)' : swr.ratio >= 1.3 ? 'var(--yellow)' : 'var(--red)' }}>{swr.ratio}</div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text3)', marginTop: 4 }}>1.4+ athletic · 1.6+ very aesthetic</p>
          <GaugeBar value={swr.ratio} min={1.0} max={1.8} label="V-taper index" color={swr.ratio >= 1.5 ? 'var(--green)' : 'var(--yellow)'} />
        </div>
      )}

      {/* Reeves ideal ratios */}
      {ideals && weakness && (
        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Steve Reeves Ideal Ratios</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: 14 }}>Golden ratio targets calibrated to your wrist size. Gap = % below ideal.</p>
          {Object.entries(ideals).map(([key, ideal]) => {
            const gap = weakness[key]
            if (gap == null) return null
            const label = key.charAt(0).toUpperCase() + key.slice(1)
            const color = gap <= 5 ? 'var(--green)' : gap <= 15 ? 'var(--yellow)' : 'var(--red)'
            return (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--bg4)' }}>
                <span style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>{label}</span>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>ideal {toCmLbl(ideal)}</span>
                  <span style={{ fontWeight: 600, color, minWidth: 50, textAlign: 'right' }}>
                    {gap <= 2 ? '✓' : `-${gap.toFixed(0)}%`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Strength tiers */}
      {Object.keys(tiers).length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>Strength Tiers</h3>
          {Object.entries(tiers).map(([lift, t]) => {
            if (!t) return null
            const LIFT_LABELS = { squat: 'Squat', bench: 'Bench', deadlift: 'Deadlift', row: 'Row', ohp: 'OHP' }
            const color = TIER_COLORS[t.tier] || 'var(--text)'
            return (
              <div key={lift} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--bg4)' }}>
                <span style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>{LIFT_LABELS[lift]}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{t.ratio}× BW</span>
                  <span className="badge" style={{ background: `${color}22`, color }}>{t.tier}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* TDEE & macros */}
      <div className="card">
        <h3 style={{ marginBottom: 14 }}>Nutrition Targets</h3>
        <Row label="TDEE" value={`${tdeeVal} kcal`} sub="Mifflin-St Jeor" />
        <Row label="Lean Bulk Target" value={`${macroData.targetCals} kcal`} accent="var(--green)" />
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[['Protein', macroData.protein_g, 'g', 'var(--red)'], ['Carbs', macroData.carbs_g, 'g', 'var(--yellow)'], ['Fat', macroData.fat_g, 'g', 'var(--blue)']].map(([n,v,s,c]) => (
            <div key={n} className="stat-block">
              <div className="val" style={{ color: c, fontSize: '1.25rem' }}>{v}{s}</div>
              <div className="lbl">{n}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Leverage analysis */}
      {lev && Object.keys(lev).length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Leverage Analysis</h3>
          {lev.femurTorso && <Row label="Femur:Torso Ratio" value={lev.femurTorso} sub={lev.squat} />}
          {lev.armTorso   && <Row label="Arm:Torso Ratio"   value={lev.armTorso}   sub={lev.bench} />}
        </div>
      )}
    </div>
  )
}
