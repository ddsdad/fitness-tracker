import { useState, useMemo, useCallback } from 'react'
import { v4 as uuid } from 'uuid'
import { useStore } from '../../store/useStore.js'
import { FOODS, FOOD_CATEGORIES, searchFoods, getFoodMacros, proteinQualityLabel, nutrientChips } from '../../data/foods.js'
import {
  calculateTDEE, calculateMacroTargets,
  sumLogMacros, macroRemaining, EXTRA_ACTIVITIES, activityBurn,
  getMacroCoaching, calorieCalibration, DIET_OPTIONS,
  adaptiveTDEE, effectiveTDEE, mealProteinCheck,
} from '../../utils/nutrition.js'
import {
  getFoodRecommendations, generateMealPlan, getSmartPicks, findClosestFoods, detectFoodPatterns,
} from '../../utils/mealPlanner.js'
import { IconPlus, IconX, IconCheck, IconFlame } from '../shared/Icons.jsx'
import FoodPickerModal from './FoodPickerModal.jsx'

const TODAY = new Date().toISOString().split('T')[0]
const MEALS = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { id: 'lunch',     label: 'Lunch',     emoji: '🥗' },
  { id: 'dinner',    label: 'Dinner',    emoji: '🍽️' },
  { id: 'snacks',    label: 'Snacks',    emoji: '🍎' },
]

function genId() { return Math.random().toString(36).slice(2,10) }

// ─── Macro Ring SVG ──────────────────────────────────────────────────────────
function MacroRing({ consumed, target }) {
  const pct = target > 0 ? Math.min(1, consumed / target) : 0
  const r = 52, circ = 2 * Math.PI * r
  const dash = pct * circ
  const over = consumed > target
  return (
    <svg width={130} height={130} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={65} cy={65} r={r} fill="none" stroke="var(--bg3)" strokeWidth={10} />
      <circle
        cx={65} cy={65} r={r}
        fill="none"
        stroke={over ? '#f87171' : pct > 0.85 ? '#f59e0b' : 'var(--green)'}
        strokeWidth={10}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
    </svg>
  )
}

// ─── Macro Bar ───────────────────────────────────────────────────────────────
function MacroBar({ label, consumed, target, color }) {
  const pct = target > 0 ? Math.min(100, Math.round(consumed / target * 100)) : 0
  const over = consumed > target
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 4 }}>
        <span style={{ color: 'var(--text2)' }}>{label}</span>
        <span style={{ fontWeight: 600, color: over ? '#f87171' : 'var(--text)' }}>
          {consumed.toFixed(0)}<span style={{ color: 'var(--text3)', fontWeight: 400 }}>/{target}g</span>
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: 'var(--bg3)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: over ? '#f87171' : color, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}


// ─── Extra Activity Modal ─────────────────────────────────────────────────────
function ActivityModal({ bwKg, onAdd, onClose }) {
  const [type, setType]         = useState(EXTRA_ACTIVITIES[0].id)
  const [duration, setDuration] = useState('30')
  const meta = EXTRA_ACTIVITIES.find(a => a.id === type)
  const burn = meta ? activityBurn(type, parseInt(duration) || 30, bwKg) : 0
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'var(--bg2)', width: '100%', padding: '20px 16px 32px', borderRadius: 'var(--radius) var(--radius) 0 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>Log Extra Activity</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {EXTRA_ACTIVITIES.map(a => (
            <button key={a.id} onClick={() => setType(a.id)}
              style={{ padding: '8px 12px', borderRadius: 999, border: `1px solid ${type === a.id ? 'var(--green)' : 'var(--border)'}`, background: type === a.id ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', color: type === a.id ? 'var(--green)' : 'var(--text2)', fontSize: '0.8rem', cursor: 'pointer' }}>
              {a.emoji} {a.label}
            </button>
          ))}
        </div>
        <label style={{ fontSize: '0.875rem', color: 'var(--text2)' }}>Duration (minutes)</label>
        <input className="input" type="number" inputMode="numeric" value={duration} onChange={e => setDuration(e.target.value)} style={{ marginBottom: 12, marginTop: 6 }} />
        <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>Estimated burn</span>
          <span style={{ fontWeight: 700, color: 'var(--green)' }}>+{burn} kcal</span>
        </div>
        <button className="btn btn-primary btn-full" onClick={() => { onAdd({ id: genId(), type, label: meta?.label, emoji: meta?.emoji, duration: parseInt(duration) || 30, burn }); onClose() }}>
          <IconPlus /> Add Activity
        </button>
      </div>
    </div>
  )
}

// ─── Meal Section ─────────────────────────────────────────────────────────────
function MealSection({ meal, entries, onAdd, onRemove }) {
  const total = entries.reduce((a, e) => ({ kcal: a.kcal + e.macros.kcal, protein: +(a.protein + e.macros.protein).toFixed(1) }), { kcal: 0, protein: 0 })
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: entries.length > 0 ? 10 : 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '1.1rem' }}>{meal.emoji}</span>
          <span style={{ fontWeight: 600 }}>{meal.label}</span>
          {total.kcal > 0 && <span style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>{total.kcal} kcal · {total.protein}g P</span>}
        </div>
        <button onClick={onAdd} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid var(--green)', borderRadius: 999, padding: '5px 12px', color: 'var(--green)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
          + Add
        </button>
      </div>
      {entries.map(entry => (
        <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--bg3)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {entry.name}{entry.brand ? ` · ${entry.brand}` : ''}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>
              {entry.grams}g · {entry.macros.kcal} kcal · P:{entry.macros.protein}g · C:{entry.macros.carbs}g · F:{entry.macros.fat}g
            </div>
          </div>
          <button onClick={() => onRemove(entry.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '4px 8px', fontSize: '1rem', flexShrink: 0 }}>✕</button>
        </div>
      ))}
    </div>
  )
}

// ─── Food row used by picks & finder ──────────────────────────────────────────
function PickRow({ food, grams, macros, meta, onAdd }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
      <span style={{ fontSize: '1.3rem' }}>{food.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{food.name}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>
          {grams}g · {macros.kcal} kcal · <span style={{ color: 'var(--green)' }}>P:{macros.protein}g</span> · C:{macros.carbs}g · F:{macros.fat}g{meta ? ` · ${meta}` : ''}
        </div>
      </div>
      <button onClick={() => onAdd({ id: genId(), foodId: food.id, name: food.name, brand: food.brand, grams, macros })}
        style={{ background: 'var(--green)', border: 'none', borderRadius: 999, color: '#000', fontSize: '0.75rem', fontWeight: 700, padding: '5px 12px', cursor: 'pointer', flexShrink: 0 }}>+ Add</button>
    </div>
  )
}

// ─── Recommendations Panel (smart picks + diet prefs + macro finder) ──────────
function RecommendPanel({ remaining, onAdd, recentCounts }) {
  const { profile, setProfile } = useStore()
  const prefs = profile?.dietPrefs || { diet: 'none', clean: false, avoidFastFood: false }
  const setPref = (patch) => setProfile({ ...profile, dietPrefs: { ...prefs, ...patch } })

  const [mode, setMode] = useState('picks') // 'picks' | 'finder'
  const [mp, setMp] = useState(40), [mc, setMc] = useState(40), [mf, setMf] = useState(15)

  const picks = useMemo(() => getSmartPicks(remaining, prefs, recentCounts, 6), [remaining.kcal, remaining.protein, JSON.stringify(prefs), JSON.stringify(recentCounts)])
  const finds = useMemo(() => findClosestFoods({ protein: mp, carbs: mc, fat: mf }, prefs, 6), [mp, mc, mf, JSON.stringify(prefs)])

  return (
    <div style={{ marginTop: 4, marginBottom: 16 }}>
      {/* Diet preference chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {DIET_OPTIONS.map(d => (
          <button key={d.id} onClick={() => setPref({ diet: d.id })} style={{ fontSize: '0.68rem', padding: '4px 10px', borderRadius: 999, border: `1px solid ${prefs.diet === d.id ? 'var(--green)' : 'var(--border)'}`, background: prefs.diet === d.id ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', color: prefs.diet === d.id ? 'var(--green)' : 'var(--text2)', cursor: 'pointer' }}>{d.label}</button>
        ))}
        <button onClick={() => setPref({ clean: !prefs.clean })} style={{ fontSize: '0.68rem', padding: '4px 10px', borderRadius: 999, border: `1px solid ${prefs.clean ? 'var(--green)' : 'var(--border)'}`, background: prefs.clean ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', color: prefs.clean ? 'var(--green)' : 'var(--text2)', cursor: 'pointer' }}>🥗 Eat clean</button>
        <button onClick={() => setPref({ avoidFastFood: !prefs.avoidFastFood })} style={{ fontSize: '0.68rem', padding: '4px 10px', borderRadius: 999, border: `1px solid ${prefs.avoidFastFood ? 'var(--green)' : 'var(--border)'}`, background: prefs.avoidFastFood ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', color: prefs.avoidFastFood ? 'var(--green)' : 'var(--text2)', cursor: 'pointer' }}>🚫🍔</button>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 999, padding: 3, marginBottom: 12 }}>
        {[['picks','💡 Smart Picks'],['finder','🎯 Macro Finder']].map(([id,l]) => (
          <button key={id} onClick={() => setMode(id)} style={{ flex: 1, padding: '7px', borderRadius: 999, border: 'none', cursor: 'pointer', background: mode === id ? 'var(--bg2)' : 'transparent', color: mode === id ? 'var(--green)' : 'var(--text3)', fontWeight: mode === id ? 700 : 400, fontSize: '0.78rem' }}>{l}</button>
        ))}
      </div>

      {mode === 'picks' ? (
        <>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: 10 }}>
            {remaining.kcal} kcal left{remaining.protein > 20 ? ` · need ${remaining.protein.toFixed(0)}g protein` : ''} — ranked for your goals & variety
          </div>
          {picks.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>No picks fit your remaining budget & filters.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {picks.map(p => <PickRow key={p.food.id} {...p} onAdd={onAdd} />)}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: 8 }}>
            Set target macros — finds the closest-matching food & serving (least-squares match):
          </div>
          {[['Protein', mp, setMp, 'var(--green)', 100], ['Carbs', mc, setMc, '#f59e0b', 200], ['Fat', mf, setMf, '#f87171', 80]].map(([lbl, val, set, col, max]) => (
            <div key={lbl} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 2 }}>
                <span style={{ color: 'var(--text2)' }}>{lbl}</span><span style={{ fontWeight: 700, color: col }}>{val}g</span>
              </div>
              <input type="range" min={0} max={max} step={5} value={val} onChange={e => set(+e.target.value)} />
            </div>
          ))}
          <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginBottom: 10 }}>≈ {mp*4 + mc*4 + mf*9} kcal target</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {finds.map(p => <PickRow key={p.food.id} {...p} meta={`±${p.err} off`} onAdd={onAdd} />)}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Meal Plan Tab ────────────────────────────────────────────────────────────
function MealPlanTab({ targets, onApply }) {
  const [plan, setPlan] = useState(null)

  const generate = () => setPlan(generateMealPlan(targets))

  const applyToLog = () => {
    if (!plan) return
    const entries = []
    for (const [meal, { items }] of Object.entries(plan)) {
      for (const { food, grams, macros } of items) {
        entries.push({ meal, entry: { id: genId(), foodId: food.id, name: food.name, brand: food.brand, grams, macros } })
      }
    }
    onApply(entries)
  }

  const MEAL_LABELS = { breakfast: '🍳 Breakfast', lunch: '🥗 Lunch', dinner: '🍽️ Dinner', snacks: '🍎 Snacks' }

  return (
    <div>
      <div style={{ marginBottom: 16, fontSize: '0.875rem', color: 'var(--text2)', lineHeight: 1.6 }}>
        Generates a complete {targets.kcal} kcal day plan optimized for <strong>{targets.protein}g protein</strong>, based on your current goals and settings.
      </div>
      <button className="btn btn-primary btn-full" style={{ marginBottom: 20 }} onClick={generate}>
        ✨ Generate My Meal Plan
      </button>

      {plan && (
        <>
          {Object.entries(plan).map(([mealId, { items, total, targetKcal }]) => (
            <div key={mealId} className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 700 }}>{MEAL_LABELS[mealId]}</span>
                <div style={{ textAlign: 'right', fontSize: '0.8125rem' }}>
                  <span style={{ fontWeight: 600 }}>{total.kcal} kcal</span>
                  <span style={{ color: 'var(--text3)' }}> / {targetKcal} target</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: '0.75rem', color: 'var(--text2)', marginBottom: 10 }}>
                <span style={{ color: 'var(--green)' }}>P: {total.protein}g</span>
                <span>C: {total.carbs}g</span>
                <span>F: {total.fat}g</span>
              </div>
              {items.map(({ food, grams, macros }) => (
                <div key={food.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--bg3)', fontSize: '0.875rem' }}>
                  <span>{food.emoji} {food.name}</span>
                  <span style={{ color: 'var(--text2)', flexShrink: 0, marginLeft: 8 }}>{grams}g · {macros.kcal} kcal</span>
                </div>
              ))}
            </div>
          ))}
          <button className="btn btn-primary btn-full" onClick={applyToLog} style={{ marginTop: 8 }}>
            <IconCheck /> Apply This Plan to Today's Log
          </button>
        </>
      )}
    </div>
  )
}

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({ logs, targets }) {
  const days = Object.entries(logs)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 14)

  if (!days.length) return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
      <p>No nutrition history yet.</p>
      <p style={{ fontSize: '0.875rem', marginTop: 8 }}>Start logging food in the Today tab.</p>
    </div>
  )

  return (
    <div>
      {days.map(([date, log]) => {
        const consumed = sumLogMacros(log.meals)
        const pct = targets.kcal > 0 ? Math.round(consumed.kcal / targets.kcal * 100) : 0
        const color = pct >= 90 && pct <= 115 ? 'var(--green)' : pct < 70 ? '#f59e0b' : '#f87171'
        const label = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        return (
          <div key={date} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>{label}</span>
              <span style={{ fontWeight: 700, color }}>{pct}%</span>
            </div>
            <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, borderRadius: 999 }} />
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: '0.8125rem', color: 'var(--text2)' }}>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{consumed.kcal} kcal</span>
              <span><span style={{ color: 'var(--green)' }}>P</span> {consumed.protein}g</span>
              <span><span style={{ color: '#f59e0b' }}>C</span> {consumed.carbs}g</span>
              <span><span style={{ color: '#f87171' }}>F</span> {consumed.fat}g</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Daily weigh-in + 7-day rolling-average trend ─────────────────────────────
function WeighInCard({ measurementHistory, unit, onLog }) {
  const [val, setVal] = useState('')
  const bw = (measurementHistory || []).filter(r => r.metric === 'bodyweight').sort((a, b) => a.date.localeCompare(b.date))
  // 7-day rolling average series (last ~21 points)
  const series = bw.map((r, i) => {
    const window = bw.slice(Math.max(0, i - 6), i + 1)
    const avg = window.reduce((s, x) => s + x.value, 0) / window.length
    return { date: r.date.slice(5), raw: r.value, avg: +avg.toFixed(1) }
  }).slice(-21)
  const latest = bw[bw.length - 1]
  const today = new Date().toISOString().slice(0, 10)
  const loggedToday = latest?.date === today

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3>Daily Weigh-In</h3>
        {latest && <span style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>last: {latest.value}{unit}</span>}
      </div>
      {!loggedToday && (
        <div style={{ display: 'flex', gap: 8, marginBottom: series.length >= 2 ? 12 : 0 }}>
          <div className="input-unit" style={{ flex: 1 }}>
            <input className="input" type="number" inputMode="decimal" placeholder="Morning weight" value={val} onChange={e => setVal(e.target.value)} />
            <span>{unit}</span>
          </div>
          <button className="btn btn-primary" onClick={() => { const v = parseFloat(val); if (v > 0) { onLog(v); setVal('') } }} disabled={!val}>Log</button>
        </div>
      )}
      {loggedToday && <div style={{ fontSize: '0.8rem', color: 'var(--green)', marginBottom: series.length >= 2 ? 12 : 0 }}>✓ Logged today: {latest.value}{unit}</div>}
      {series.length >= 2 && (
        <ResponsiveContainerLazy series={series} unit={unit} />
      )}
    </div>
  )
}
// tiny inline chart (recharts) — kept separate so WeighInCard reads cleanly
import { LineChart as _LC, Line as _Ln, XAxis as _X, YAxis as _Y, Tooltip as _Tt, ResponsiveContainer as _RC, CartesianGrid as _CG } from 'recharts'
function ResponsiveContainerLazy({ series, unit }) {
  return (
    <_RC width="100%" height={130}>
      <_LC data={series} margin={{ top: 6, right: 8, bottom: 0, left: -22 }}>
        <_CG strokeDasharray="3 3" stroke="var(--bg4)" />
        <_X dataKey="date" tick={{ fontSize: 10, fill: 'var(--text3)' }} tickLine={false} axisLine={false} />
        <_Y domain={['auto', 'auto']} tick={{ fontSize: 10, fill: 'var(--text3)' }} tickLine={false} axisLine={false} />
        <_Tt contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.78rem' }} />
        <_Ln type="monotone" dataKey="raw" stroke="var(--bg4)" strokeWidth={1} dot={{ r: 2, fill: 'var(--text3)' }} name="Daily" />
        <_Ln type="monotone" dataKey="avg" stroke="var(--green)" strokeWidth={2.5} dot={false} name={`7-day avg`} />
      </_LC>
    </_RC>
  )
}

// ─── Quick-add manual macros modal ────────────────────────────────────────────
function QuickAddModal({ onAdd, onClose }) {
  const [k, setK] = useState(''), [p, setP] = useState(''), [c, setC] = useState(''), [f, setF] = useState('')
  const save = () => {
    const kcal = parseInt(k) || (parseInt(p)||0)*4 + (parseInt(c)||0)*4 + (parseInt(f)||0)*9
    onAdd({ id: genId(), foodId: 'manual:' + genId(), name: 'Quick add', grams: null, macros: { kcal, protein: +p || 0, carbs: +c || 0, fat: +f || 0, fiber: 0 } })
    onClose()
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 320, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'var(--bg2)', width: '100%', maxWidth: 480, margin: '0 auto', padding: '20px 16px 32px', borderRadius: '16px 16px 0 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>Quick Add</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text3)', marginBottom: 12 }}>Enter macros directly. Leave calories blank to auto-calc from P/C/F.</div>
        <div className="grid-2" style={{ marginBottom: 12 }}>
          <div><label>Calories</label><input className="input" type="number" inputMode="numeric" value={k} onChange={e => setK(e.target.value)} placeholder="auto" /></div>
          <div><label>Protein (g)</label><input className="input" type="number" inputMode="decimal" value={p} onChange={e => setP(e.target.value)} placeholder="0" /></div>
          <div><label>Carbs (g)</label><input className="input" type="number" inputMode="decimal" value={c} onChange={e => setC(e.target.value)} placeholder="0" /></div>
          <div><label>Fat (g)</label><input className="input" type="number" inputMode="decimal" value={f} onChange={e => setF(e.target.value)} placeholder="0" /></div>
        </div>
        <button className="btn btn-primary btn-full" onClick={save}>Add</button>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Nutrition() {
  const { profile, setProfile, sessions, nutritionLogs, addFoodEntry, removeFoodEntry, addExtraActivity, removeExtraActivity, measurementHistory, addMeasurementEntry } = useStore()
  const [tab, setTab]           = useState('today')
  const [pickingMeal, setPickingMeal] = useState(null)
  const [showActivity, setShowActivity] = useState(false)
  const [quickAdd, setQuickAdd] = useState(false)

  if (!profile) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 48 }}>🥗</div>
      <h2>Complete Onboarding First</h2>
      <p style={{ color: 'var(--text2)' }}>Your nutrition targets are calculated from your profile.</p>
    </div>
  )

  // ── Derived values ───────────────────────────────────────────────────────────
  const bwKg  = profile.unit === 'kg' ? profile.bodyweight : profile.bodyweight / 2.2046
  const todayStr = TODAY
  const todayLog  = nutritionLogs[todayStr] || { meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, extraActivities: [] }
  const todaySessions = sessions.filter(s => s.date && s.date.startsWith(todayStr))
  const extraActivities = todayLog.extraActivities || []

  const tdee    = calculateTDEE(profile, todaySessions, extraActivities)
  // Derive nutrition goal from caloric mode + physique goal (drives protein g/kg)
  const nutritionGoal = (profile.caloricMode === 'cut' || profile.physiqueGoal === 'lean_athletic') ? 'fat_loss'
    : profile.physiqueGoal === 'stronger_legs' ? 'strength' : 'muscle'
  // Adaptive TDEE: blend Mifflin estimate with real intake-vs-weight-trend data
  const adaptive  = useMemo(() => adaptiveTDEE(nutritionLogs, measurementHistory, profile.unit), [nutritionLogs, measurementHistory, profile.unit])
  const effTDEE   = effectiveTDEE(tdee.total, adaptive)
  const targets   = calculateMacroTargets(effTDEE.value, nutritionGoal, bwKg, profile.caloricMode || 'lean_bulk')
  const consumed = sumLogMacros(todayLog.meals)
  const remaining = macroRemaining(targets, consumed)
  const calorieLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleAddFood = useCallback((meal, entry) => {
    addFoodEntry(todayStr, meal, entry)
    setPickingMeal(null)
  }, [addFoodEntry, todayStr])

  const handleRemoveFood = useCallback((meal, entryId) => {
    removeFoodEntry(todayStr, meal, entryId)
  }, [removeFoodEntry, todayStr])

  const handleAddActivity = useCallback((activity) => {
    addExtraActivity(todayStr, activity)
  }, [addExtraActivity, todayStr])

  const handleApplyPlan = useCallback((entries) => {
    entries.forEach(({ meal, entry }) => addFoodEntry(todayStr, meal, entry))
  }, [addFoodEntry, todayStr])

  // Copy yesterday's full log into today
  const copyYesterday = useCallback(() => {
    const y = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
    const ylog = nutritionLogs[y]
    if (!ylog) return
    Object.entries(ylog.meals || {}).forEach(([meal, entries]) =>
      entries.forEach(e => addFoodEntry(todayStr, meal, { ...e, id: genId() })))
  }, [nutritionLogs, addFoodEntry, todayStr])

  // Recent food usage counts (last 7 days) — feeds variety-aware recommender
  const recentCounts = useMemo(() => {
    const counts = {}; const now = Date.now()
    for (let i = 0; i < 7; i++) {
      const d = new Date(now - i * 86_400_000).toISOString().slice(0, 10)
      const log = nutritionLogs[d]; if (!log) continue
      Object.values(log.meals || {}).flat().forEach(e => { if (e.foodId) counts[e.foodId] = (counts[e.foodId] || 0) + 1 })
    }
    return counts
  }, [nutritionLogs])

  const patterns    = useMemo(() => detectFoodPatterns(nutritionLogs), [nutritionLogs])
  const mealProtein = mealProteinCheck(todayLog, bwKg, MEALS)
  const calibration = useMemo(() => calorieCalibration(measurementHistory, targets, profile.caloricMode || 'lean_bulk', profile.unit), [measurementHistory, targets.kcal, profile.caloricMode])

  // ── Render ───────────────────────────────────────────────────────────────────
  const calorieOver = consumed.kcal > targets.kcal

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>Nutrition</h1>
        <p>{calorieLabel}</p>
      </div>

      {/* ── TDEE Banner ── */}
      <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Target</div>
          <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>{targets.kcal} <span style={{ fontWeight: 400, fontSize: '0.875rem', color: 'var(--text2)' }}>kcal</span></div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>Base {tdee.base}{tdee.workoutBonus > 0 ? ` + 🏋️ ${tdee.workoutBonus}` : ''}{tdee.extraBonus > 0 ? ` + 🏃 ${tdee.extraBonus}` : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {todaySessions.length === 0 && extraActivities.length === 0 && (
            <button onClick={() => setShowActivity(true)}
              style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text2)', fontSize: '0.8rem', cursor: 'pointer' }}>
              🏃 Log Activity
            </button>
          )}
          {extraActivities.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {extraActivities.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 999, padding: '4px 10px', fontSize: '0.75rem' }}>
                  {a.emoji} {a.label} {a.duration}m · +{a.burn} kcal
                  <button onClick={() => removeExtraActivity(todayStr, a.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '0 0 0 4px', fontSize: '0.8rem' }}>✕</button>
                </div>
              ))}
              <button onClick={() => setShowActivity(true)}
                style={{ padding: '4px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text2)', fontSize: '0.75rem', cursor: 'pointer' }}>
                + More
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 999, padding: 3, marginBottom: 20, gap: 2 }}>
        {[['today','Today'],['plan','Meal Plan'],['history','History']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, padding: '8px', borderRadius: 999, border: 'none', cursor: 'pointer', background: tab === id ? 'var(--bg2)' : 'transparent', color: tab === id ? 'var(--text)' : 'var(--text3)', fontWeight: tab === id ? 600 : 400, fontSize: '0.875rem', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ═══════ TODAY TAB ═══════ */}
      {tab === 'today' && (
        <>
          {/* Macro overview card */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
              {/* Calorie ring */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <MacroRing consumed={consumed.kcal} target={targets.kcal} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem', color: calorieOver ? '#f87171' : 'var(--text)', lineHeight: 1 }}>{consumed.kcal}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text3)', marginTop: 2 }}>of {targets.kcal}</div>
                  <div style={{ fontSize: '0.65rem', color: calorieOver ? '#f87171' : 'var(--green)', fontWeight: 600, marginTop: 1 }}>
                    {calorieOver ? `+${consumed.kcal - targets.kcal}` : `${remaining.kcal} left`}
                  </div>
                </div>
              </div>

              {/* Macro bars */}
              <div style={{ flex: 1 }}>
                <MacroBar label="Protein" consumed={consumed.protein} target={targets.protein} color="var(--green)" />
                <MacroBar label="Carbs"   consumed={consumed.carbs}   target={targets.carbs}   color="#f59e0b" />
                <MacroBar label="Fat"     consumed={consumed.fat}     target={targets.fat}     color="#f87171" />
              </div>
            </div>

            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, fontSize: '0.75rem' }}>
              {[
                { label: 'Calories', v: consumed.kcal, t: targets.kcal, u: 'kcal' },
                { label: 'Protein',  v: consumed.protein, t: targets.protein, u: 'g' },
                { label: 'Carbs',    v: consumed.carbs,   t: targets.carbs,   u: 'g' },
                { label: 'Fat',      v: consumed.fat,     t: targets.fat,     u: 'g' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{s.v.toFixed(s.u === 'kcal' ? 0 : 0)}</div>
                  <div style={{ color: 'var(--text3)', marginTop: 1 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* TDEE source */}
            <div style={{ fontSize: '0.68rem', color: 'var(--text3)', textAlign: 'center', marginTop: 8 }}>
              {effTDEE.source === 'estimate'
                ? `Maintenance ≈ ${effTDEE.value} kcal (estimated). Log meals + weigh-ins to calibrate from your real data.`
                : `🎯 ${effTDEE.source === 'adaptive' ? 'Adaptive' : 'Calibrating'} maintenance: ${effTDEE.value} kcal — from your real intake vs weight trend (${Math.round(effTDEE.confidence*100)}% confidence)`}
            </div>
          </div>

          {/* Macro coaching */}
          {(() => {
            const coach = getMacroCoaching(targets, consumed)
            const toneColor = { good: 'var(--green)', focus: 'var(--blue)', warn: '#f59e0b', neutral: 'var(--text3)' }[coach.tone] || 'var(--text3)'
            const toneBg    = { good: 'rgba(34,197,94,0.08)', focus: 'rgba(59,130,246,0.08)', warn: 'rgba(245,158,11,0.08)', neutral: 'var(--bg2)' }[coach.tone] || 'var(--bg2)'
            return (
              <div style={{ background: toneBg, border: `1px solid ${toneColor}44`, borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.125rem', flexShrink: 0 }}>🧠</span>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: toneColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Coach</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text2)', lineHeight: 1.5 }}>{coach.message}</div>
                </div>
              </div>
            )
          })()}

          {/* Calorie auto-calibration */}
          {calibration && !calibration.onTrack && (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.125rem' }}>⚖️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', marginBottom: 3 }}>Auto-Calibration</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text2)', lineHeight: 1.5 }}>{calibration.message}</div>
              </div>
            </div>
          )}

          {/* Per-meal protein distribution */}
          {mealProtein && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span>🍗</span>
              <div style={{ fontSize: '0.8rem', color: 'var(--text2)', lineHeight: 1.5 }}>{mealProtein.message}</div>
            </div>
          )}

          {/* Pattern insights */}
          {patterns.map((p, i) => (
            <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span>{p.icon}</span>
              <div style={{ fontSize: '0.8rem', color: 'var(--text2)', lineHeight: 1.5 }}>{p.text}</div>
            </div>
          ))}

          {/* Daily weigh-in + 7-day trend */}
          <WeighInCard measurementHistory={measurementHistory} unit={profile.unit} onLog={(v) => {
            addMeasurementEntry({ id: uuid(), date: todayStr, metric: 'bodyweight', value: v, unit: profile.unit })
            setProfile({ ...profile, bodyweight: v })
          }} />

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => setQuickAdd(true)}>⚡ Quick add</button>
            <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }} onClick={copyYesterday}>📋 Copy yesterday</button>
          </div>

          {/* Meal sections */}
          {MEALS.map(meal => (
            <MealSection
              key={meal.id}
              meal={meal}
              entries={todayLog.meals[meal.id] || []}
              onAdd={() => setPickingMeal(meal.id)}
              onRemove={entryId => handleRemoveFood(meal.id, entryId)}
            />
          ))}

          {/* Smart recommendations + macro finder */}
          <div className="card">
            <RecommendPanel
              remaining={remaining}
              recentCounts={recentCounts}
              onAdd={entry => handleAddFood('snacks', entry)}
            />
          </div>

          {calorieOver && (
            <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16, fontSize: '0.875rem', color: '#f87171', textAlign: 'center' }}>
              🚨 You're {consumed.kcal - targets.kcal} kcal over budget today
            </div>
          )}
        </>
      )}

      {/* ═══════ MEAL PLAN TAB ═══════ */}
      {tab === 'plan' && (
        <MealPlanTab targets={targets} onApply={handleApplyPlan} />
      )}

      {/* ═══════ HISTORY TAB ═══════ */}
      {tab === 'history' && (
        <HistoryTab logs={nutritionLogs} targets={targets} />
      )}

      {/* ── Modals ── */}
      {quickAdd && <QuickAddModal onAdd={entry => handleAddFood('snacks', entry)} onClose={() => setQuickAdd(false)} />}
      {pickingMeal && (
        <FoodPickerModal
          meal={pickingMeal}
          onAdd={entry => handleAddFood(pickingMeal, entry)}
          onClose={() => setPickingMeal(null)}
        />
      )}
      {showActivity && (
        <ActivityModal
          bwKg={bwKg}
          onAdd={handleAddActivity}
          onClose={() => setShowActivity(false)}
        />
      )}
    </div>
  )
}
