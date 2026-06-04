import { useState, useMemo } from 'react'
import { useStore } from '../../store/useStore.js'
import { FOODS, FOOD_CATEGORIES, searchFoods, getFoodMacros, proteinQualityLabel, nutrientChips } from '../../data/foods.js'
import { IconPlus, IconCheck } from '../shared/Icons.jsx'

const MEALS = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { id: 'lunch',     label: 'Lunch',     emoji: '🥗' },
  { id: 'dinner',    label: 'Dinner',    emoji: '🍽️' },
  { id: 'snacks',    label: 'Snacks',    emoji: '🍎' },
]

function genId() { return Math.random().toString(36).slice(2, 10) }

function computeRecipe(servings, ingredients) {
  const t = ingredients.reduce((a, ing) => ({
    kcal: a.kcal + ing.macros.kcal, protein: a.protein + ing.macros.protein,
    carbs: a.carbs + ing.macros.carbs, fat: a.fat + ing.macros.fat, fiber: a.fiber + (ing.macros.fiber || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })
  const s = Math.max(1, servings)
  const totals     = { kcal: Math.round(t.kcal), protein: +t.protein.toFixed(1), carbs: +t.carbs.toFixed(1), fat: +t.fat.toFixed(1), fiber: +t.fiber.toFixed(1) }
  const perServing = { kcal: Math.round(t.kcal / s), protein: +(t.protein / s).toFixed(1), carbs: +(t.carbs / s).toFixed(1), fat: +(t.fat / s).toFixed(1), fiber: +(t.fiber / s).toFixed(1) }
  return { totals, perServing }
}

function scaleMacros(m, q) {
  return { kcal: Math.round(m.kcal * q), protein: +(m.protein * q).toFixed(1), carbs: +(m.carbs * q).toFixed(1), fat: +(m.fat * q).toFixed(1), fiber: +((m.fiber || 0) * q).toFixed(1) }
}

const EMOJIS = ['🍳','🥗','🍲','🥘','🍜','🌯','🥙','🍱','🥪','🍛','🍝','🥞']

function RecipeBuilder({ onSave, onClose }) {
  const [name, setName]         = useState('')
  const [emoji, setEmoji]       = useState('🍳')
  const [servings, setServings] = useState(1)
  const [ingredients, setIngredients] = useState([])
  const [query, setQuery]       = useState('')
  const [picking, setPicking]   = useState(null)
  const [grams, setGrams]       = useState('100')

  const results = query.length >= 2 ? searchFoods(query, 20) : []
  const { perServing } = computeRecipe(servings, ingredients)

  const addIngredient = () => {
    const g = parseFloat(grams) || picking.serving.amount
    setIngredients(prev => [...prev, { foodId: picking.id, name: picking.name, emoji: picking.emoji, grams: g, macros: getFoodMacros(picking, g) }])
    setPicking(null); setQuery(''); setGrams('100')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 350, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--bg2)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            <h3 style={{ margin: 0 }}>Create Recipe</h3>
          </div>
          <input className="input" placeholder="Recipe name (e.g. My Chicken Bowl)" value={name} onChange={e => setName(e.target.value)} />
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 8 }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)} style={{ flexShrink: 0, fontSize: '1.1rem', padding: '4px 8px', borderRadius: 8, border: `1px solid ${emoji === e ? 'var(--green)' : 'var(--border)'}`, background: emoji === e ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', cursor: 'pointer' }}>{e}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text2)' }}>This recipe makes</span>
            <button onClick={() => setServings(s => Math.max(1, s - 1))} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: '1.1rem', cursor: 'pointer' }}>−</button>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', minWidth: 20, textAlign: 'center' }}>{servings}</span>
            <button onClick={() => setServings(s => s + 1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: '1.1rem', cursor: 'pointer' }}>+</button>
            <span style={{ fontSize: '0.875rem', color: 'var(--text2)' }}>serving{servings > 1 ? 's' : ''}</span>
          </div>

          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Ingredients ({ingredients.length})</div>
          {ingredients.map((ing, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--bg3)' }}>
              <span>{ing.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{ing.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>{ing.grams}g · {ing.macros.kcal} kcal · P{ing.macros.protein}</div>
              </div>
              <button onClick={() => setIngredients(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
            </div>
          ))}

          {picking ? (
            <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 12, marginTop: 10 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{picking.emoji} {picking.name}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" type="number" inputMode="decimal" value={grams} onChange={e => setGrams(e.target.value)} placeholder="grams" style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={addIngredient}>Add</button>
                <button className="btn btn-secondary" onClick={() => setPicking(null)}>Cancel</button>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: 6 }}>
                {(() => { const m = getFoodMacros(picking, parseFloat(grams) || 0); return `${m.kcal} kcal · P${m.protein} C${m.carbs} F${m.fat}` })()}
              </div>
            </div>
          ) : (
            <>
              <input className="input" placeholder="🔍 Search to add an ingredient…" value={query} onChange={e => setQuery(e.target.value)} style={{ marginTop: 10 }} />
              {results.map(f => (
                <div key={f.id} onClick={() => { setPicking(f); setGrams(String(f.serving.amount)) }} style={{ padding: '8px 4px', borderBottom: '1px solid var(--bg3)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8125rem' }}>{f.emoji} {f.name}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>{Math.round(f.per100g.kcal)} kcal/100g</span>
                </div>
              ))}
            </>
          )}
        </div>

        <div style={{ padding: 16, borderTop: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginBottom: 12 }}>
            <div><div style={{ fontWeight: 800 }}>{perServing.kcal}</div><div style={{ fontSize: '0.6rem', color: 'var(--text3)' }}>KCAL/SERVING</div></div>
            <div><div style={{ fontWeight: 800, color: 'var(--green)' }}>{perServing.protein}g</div><div style={{ fontSize: '0.6rem', color: 'var(--text3)' }}>PROTEIN</div></div>
            <div><div style={{ fontWeight: 800, color: '#f59e0b' }}>{perServing.carbs}g</div><div style={{ fontSize: '0.6rem', color: 'var(--text3)' }}>CARBS</div></div>
            <div><div style={{ fontWeight: 800, color: '#f87171' }}>{perServing.fat}g</div><div style={{ fontSize: '0.6rem', color: 'var(--text3)' }}>FAT</div></div>
          </div>
          <button className="btn btn-primary btn-full" disabled={!name.trim() || ingredients.length === 0}
            onClick={() => { const { totals, perServing } = computeRecipe(servings, ingredients); onSave({ id: genId(), name: name.trim(), emoji, servings, ingredients, totals, perServing }); onClose() }}>
            <IconCheck /> Save Recipe
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FoodPickerModal({ meal, onAdd, onClose }) {
  const { recipes, addRecipe, deleteRecipe } = useStore()
  const [showBuilder, setShowBuilder] = useState(false)
  const [recipeQty, setRecipeQty]     = useState(1)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [query, setQuery]     = useState('')
  const [selected, setSelected] = useState(null)
  const [grams, setGrams]     = useState('')
  const [category, setCategory] = useState('all')

  const results = useMemo(() => {
    if (query.length >= 2) return searchFoods(query, 30)
    if (category === 'all') return FOODS.slice(0, 30)
    return FOODS.filter(f => f.category === category).slice(0, 40)
  }, [query, category])

  const preview = selected
    ? getFoodMacros(selected, parseFloat(grams) || selected.serving.amount)
    : null

  const confirm = () => {
    if (!selected) return
    const g = parseFloat(grams) || selected.serving.amount
    onAdd({ id: genId(), foodId: selected.id, name: selected.name, brand: selected.brand, grams: g, macros: getFoodMacros(selected, g) })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--bg2)', flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '100dvh', overflow: 'hidden' }}>
        <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '1.25rem', padding: 0 }}>✕</button>
            <h3 style={{ margin: 0 }}>Add to {MEALS.find(m => m.id === meal)?.label}</h3>
          </div>
          <input
            className="input"
            placeholder="Search foods (injera, sardines, doro wat, Big Mac…)"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null) }}
            autoFocus
            style={{ marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {[['all','All','🍽️'], ['recipes', `Recipes${recipes.length ? ` (${recipes.length})` : ''}`, '🍳'], ...Object.entries(FOOD_CATEGORIES).map(([id, { label, emoji }]) => [id, label, emoji])].map(([id, label, emoji]) => (
              <button key={id} onClick={() => { setCategory(id); setQuery(''); setSelected(null); setSelectedRecipe(null) }}
                style={{ flexShrink: 0, padding: '5px 10px', borderRadius: 999, border: `1px solid ${category === id ? 'var(--green)' : 'var(--border)'}`, background: category === id ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', color: category === id ? 'var(--green)' : 'var(--text2)', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {emoji} {label}
              </button>
            ))}
          </div>
        </div>

        {category === 'recipes' && !query ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
            <button className="btn btn-primary btn-full" style={{ marginBottom: 12 }} onClick={() => setShowBuilder(true)}>
              <IconPlus /> Create New Recipe
            </button>
            {recipes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text3)' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🍳</div>
                <p style={{ fontSize: '0.875rem' }}>No recipes yet. Build one from your ingredients — it calculates per-serving macros so you can log a half, full, or double portion.</p>
              </div>
            ) : recipes.map(r => (
              <div key={r.id} style={{ marginBottom: 8, border: `1px solid ${selectedRecipe?.id === r.id ? 'var(--green)' : 'var(--border)'}`, borderRadius: 12, padding: 12, background: selectedRecipe?.id === r.id ? 'rgba(34,197,94,0.06)' : 'var(--bg2)' }}>
                <div onClick={() => { setSelectedRecipe(selectedRecipe?.id === r.id ? null : r); setRecipeQty(1) }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.5rem' }}>{r.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{r.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>{r.servings} servings · {r.perServing.kcal} kcal · P{r.perServing.protein} ea · {r.ingredients.length} ingredients</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); if (window.confirm(`Delete "${r.name}"?`)) deleteRecipe(r.id) }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>🗑️</button>
                </div>
                {selectedRecipe?.id === r.id && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--bg4)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: 8 }}>How much are you eating?</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      {[0.25, 0.5, 1, 1.5, 2].map(q => (
                        <button key={q} onClick={() => setRecipeQty(q)} style={{ padding: '6px 12px', borderRadius: 999, border: `1px solid ${recipeQty === q ? 'var(--green)' : 'var(--border)'}`, background: recipeQty === q ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', color: recipeQty === q ? 'var(--green)' : 'var(--text2)', fontSize: '0.8rem', cursor: 'pointer' }}>
                          {q === 0.25 ? '¼' : q === 0.5 ? '½' : q === 1.5 ? '1½' : q}× serving
                        </button>
                      ))}
                    </div>
                    {(() => { const m = scaleMacros(r.perServing, recipeQty); return (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: 10 }}>
                        <strong style={{ color: 'var(--text)' }}>{m.kcal} kcal</strong> · <span style={{ color: 'var(--green)' }}>P{m.protein}</span> · <span style={{ color: '#f59e0b' }}>C{m.carbs}</span> · <span style={{ color: '#f87171' }}>F{m.fat}</span>
                      </div>
                    )})()}
                    <button className="btn btn-primary btn-full" onClick={() => {
                      const m = scaleMacros(r.perServing, recipeQty)
                      onAdd({ id: genId(), foodId: 'recipe:' + r.id, name: `${r.name} (${recipeQty}× serving)`, grams: null, recipe: true, macros: m })
                      onClose()
                    }}>
                      <IconCheck /> Add to {MEALS.find(m => m.id === meal)?.label}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {results.map(food => (
              <div key={food.id}
                onClick={() => { setSelected(food); setGrams(String(food.serving.amount)) }}
                style={{ padding: '10px 16px', background: selected?.id === food.id ? 'rgba(34,197,94,0.08)' : 'transparent', borderLeft: selected?.id === food.id ? '3px solid var(--green)' : '3px solid transparent', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {food.emoji} {food.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text3)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 1 }}>
                      {food.brand && <span>{food.brand}</span>}
                      <span>{food.serving.label}</span>
                      {(() => { const q = proteinQualityLabel(food); return q ? <span style={{ color: q.color, fontWeight: 700 }}>· {q.label}</span> : null })()}
                      {nutrientChips(food).slice(0, 2).map(c => <span key={c.label}>{c.emoji}</span>)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{Math.round(food.per100g.kcal * food.serving.amount / 100)} kcal</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>P:{food.per100g.protein.toFixed(0)} C:{food.per100g.carbs.toFixed(0)} F:{food.per100g.fat.toFixed(0)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showBuilder && <RecipeBuilder onSave={addRecipe} onClose={() => setShowBuilder(false)} />}

        {selected && (
          <div style={{ padding: '16px', background: 'var(--bg)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{selected.emoji} {selected.name}</div>
            {(() => {
              const q = proteinQualityLabel(selected); const chips = nutrientChips(selected)
              if (!q && !chips.length) return null
              return (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {q && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: q.color, background: 'var(--bg3)', padding: '2px 8px', borderRadius: 999 }}>{q.label}</span>}
                  {chips.map(c => <span key={c.label} style={{ fontSize: '0.7rem', color: 'var(--text2)', background: 'var(--bg3)', padding: '2px 8px', borderRadius: 999 }}>{c.emoji} {c.label}</span>)}
                </div>
              )
            })()}
            {selected.portions?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                {selected.portions.map(p => (
                  <button key={p.label} onClick={() => setGrams(String(p.grams))}
                    style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${grams === String(p.grams) ? 'var(--green)' : 'var(--border)'}`, background: grams === String(p.grams) ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', color: grams === String(p.grams) ? 'var(--green)' : 'var(--text2)', fontSize: '0.8rem', cursor: 'pointer' }}>
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {[50, 100, 150, 200].filter(g => g <= (selected.category === 'drink' ? 500 : 400)).map(g => (
                <button key={g} onClick={() => setGrams(String(g))}
                  style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1px solid ${grams === String(g) ? 'var(--green)' : 'var(--border)'}`, background: grams === String(g) ? 'rgba(34,197,94,0.1)' : 'var(--bg3)', color: grams === String(g) ? 'var(--green)' : 'var(--text2)', fontSize: '0.8rem', cursor: 'pointer' }}>
                  {g}g
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                placeholder="Amount (g)"
                value={grams}
                onChange={e => setGrams(e.target.value)}
                style={{ flex: 1 }}
              />
              {preview && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '0 12px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem' }}>
                  <span style={{ fontWeight: 700 }}>{preview.kcal} kcal</span>
                  <span style={{ color: 'var(--green)' }}>P:{preview.protein}g</span>
                  <span style={{ color: '#f59e0b' }}>C:{preview.carbs}g</span>
                  <span style={{ color: '#f87171' }}>F:{preview.fat}g</span>
                </div>
              )}
            </div>
            <button className="btn btn-primary btn-full" onClick={confirm}><IconCheck /> Add to {MEALS.find(m => m.id === meal)?.label}</button>
          </div>
        )}
      </div>
    </div>
  )
}
