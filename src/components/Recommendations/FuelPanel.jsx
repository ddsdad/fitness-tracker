import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { calculateTDEE, calculateMacroTargets, adaptiveTDEE, effectiveTDEE } from '../../utils/nutrition.js'
import { generateMealPlan, getSmartPicks } from '../../utils/mealPlanner.js'

const TODAY = new Date().toISOString().slice(0, 10)

// ── FUEL — the nutrition recommender that replaced the food logger ────────────
// No logging. It answers one question well: "what should I eat today to hit my
// goal?" — periodized for training vs rest days, with a generated blueprint.
export default function FuelPanel() {
  const { profile, sessions, nutritionLogs, measurementHistory } = useStore()
  const trainedToday = sessions.some(s => (s.date || '').slice(0, 10) === TODAY)
  const [dayType, setDayType] = useState(trainedToday ? 'training' : 'training') // default optimistic
  const [plan, setPlan] = useState(null)

  const bwKg = profile?.unit === 'kg' ? profile.bodyweight : profile.bodyweight / 2.2046

  // TDEE: estimate + any adaptive signal from legacy logs/weigh-ins
  const tdee = calculateTDEE(profile, sessions.filter(s => (s.date || '').slice(0, 10) === TODAY), [])
  const adaptive = useMemo(() => adaptiveTDEE(nutritionLogs, measurementHistory, profile?.unit), [nutritionLogs, measurementHistory, profile?.unit])
  const effT = effectiveTDEE(tdee.total, adaptive)

  const goal = (profile?.caloricMode === 'cut' || profile?.physiqueGoal === 'lean_athletic') ? 'fat_loss'
    : profile?.physiqueGoal === 'stronger_legs' ? 'strength' : 'muscle'
  const base = calculateMacroTargets(effT.value, goal, bwKg, profile?.caloricMode || 'lean_bulk')

  // Carb periodization: training days fuel the work; rest days favor recovery.
  const isTraining = dayType === 'training'
  const targets = useMemo(() => {
    const carbs = Math.round(base.carbs * (isTraining ? 1.15 : 0.8))
    const kcal = Math.round(base.kcal + (carbs - base.carbs) * 4)
    return { ...base, carbs, kcal }
  }, [base.kcal, base.protein, base.carbs, base.fat, isTraining])

  const perMeal = Math.round(bwKg * 0.4)   // leucine-threshold protein per main meal

  // "Eat this" picks scored against the full day's targets
  const picks = useMemo(
    () => getSmartPicks({ kcal: targets.kcal, protein: targets.protein, carbs: targets.carbs, fat: targets.fat }, {}, {}, 6),
    [targets.kcal, targets.protein, targets.carbs, targets.fat]
  )

  return (
    <div style={{ padding: '0 16px 14px' }}>
      {/* Day type — drives carb periodization */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[['training', '🏋️ Training day'], ['rest', '😴 Rest day']].map(([id, label]) => (
          <button key={id} onClick={() => setDayType(id)}
            style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1.5px solid ${dayType === id ? 'var(--green)' : 'var(--border)'}`, background: dayType === id ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', color: dayType === id ? 'var(--green)' : 'var(--text2)', fontSize: '0.78rem', fontWeight: dayType === id ? 700 : 400, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Targets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
        {[[targets.kcal, 'kcal'], [`${targets.protein}g`, 'protein'], [`${targets.carbs}g`, 'carbs'], [`${targets.fat}g`, 'fat']].map(([v, l]) => (
          <div key={l} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '10px 4px', textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--green)' }}>{v}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginBottom: 12, lineHeight: 1.5 }}>
        {isTraining ? `Carbs up ~15% to fuel the session — biggest carb meals before/after training.` : `Carbs trimmed ~20% on rest; protein stays high for repair.`}
        {' '}Aim ~<strong style={{ color: 'var(--text2)' }}>{perMeal}g protein per main meal</strong> (muscle-protein-synthesis threshold).
        {effT.source !== 'estimate' && ' · adaptive TDEE in use'}
      </div>

      {/* Day blueprint */}
      <button className="btn btn-secondary btn-full" style={{ marginBottom: 10 }} onClick={() => setPlan(generateMealPlan(targets))}>
        ✨ {plan ? 'Regenerate' : 'Generate'} day blueprint
      </button>
      {plan && (
        <div style={{ marginBottom: 12 }}>
          {Object.entries(plan).map(([meal, m]) => (
            <div key={meal} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '10px 12px', marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, textTransform: 'capitalize', marginBottom: 4 }}>
                <span>{meal}</span>
                <span style={{ color: 'var(--green)' }}>{m.total.kcal} kcal · {m.total.protein}g P</span>
              </div>
              {m.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text2)', padding: '2px 0' }}>
                  <span>{it.food.emoji} {it.food.name}</span>
                  <span style={{ color: 'var(--text3)' }}>{it.grams}g</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Best single foods for the goal */}
      {picks.length > 0 && (
        <>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '4px 0 8px' }}>
            Top foods for your goal
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {picks.map(p => (
              <div key={p.food.id} style={{ flexShrink: 0, width: 128, background: 'var(--bg3)', borderRadius: 10, padding: '10px' }}>
                <div style={{ fontSize: '1.3rem' }}>{p.food.emoji}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, lineHeight: 1.25, margin: '4px 0', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.food.name}</div>
                <div style={{ fontSize: '0.64rem', color: 'var(--text3)' }}>{p.grams}g · {p.macros.kcal} kcal</div>
                <div style={{ fontSize: '0.64rem', color: 'var(--green)', fontWeight: 700 }}>{p.macros.protein}g protein</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
