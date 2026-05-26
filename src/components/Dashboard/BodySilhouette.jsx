import { getHeatColor } from '../../utils/heatmap.js'

// SVG paths for front body view muscle regions
const FRONT_MUSCLES = {
  chest: "M 68,58 C 62,55 55,58 52,68 C 50,74 51,82 56,86 C 62,90 72,88 80,82 L 80,62 Z M 112,58 C 118,55 125,58 128,68 C 130,74 129,82 124,86 C 118,90 108,88 100,82 L 100,62 Z",
  front_delts: "M 48,52 C 42,46 38,54 38,62 C 38,70 42,74 48,72 L 52,68 C 50,62 50,56 48,52 Z M 132,52 C 138,46 142,54 142,62 C 142,70 138,74 132,72 L 128,68 C 130,62 130,56 132,52 Z",
  side_delts: "M 44,60 C 38,60 35,64 35,70 C 35,76 38,80 44,78 L 50,74 L 50,64 Z M 136,60 C 142,60 145,64 145,70 C 145,76 142,80 136,78 L 130,74 L 130,64 Z",
  biceps: "M 36,76 C 30,76 28,82 28,90 C 28,98 30,104 36,106 L 44,104 L 46,82 L 42,76 Z M 144,76 C 150,76 152,82 152,90 C 152,98 150,104 144,106 L 136,104 L 134,82 L 138,76 Z",
  forearms: "M 28,106 C 24,108 22,114 22,122 C 22,130 24,136 28,138 L 38,134 L 40,108 L 36,106 Z M 152,106 C 156,108 158,114 158,122 C 158,130 156,136 152,138 L 142,134 L 140,108 L 144,106 Z",
  abs: "M 72,88 C 68,88 66,92 66,100 L 66,138 C 66,140 68,142 70,142 L 90,142 C 92,142 94,140 94,138 L 94,100 C 94,92 92,88 88,88 Z M 86,88 C 90,88 94,92 94,100 L 94,138 C 94,140 92,142 90,142 L 110,142 C 112,140 114,138 114,138 L 114,100 C 114,92 112,88 108,88 Z",
  quads: "M 60,148 C 54,148 50,156 50,168 C 50,184 54,196 60,200 L 80,200 L 84,148 Z M 120,148 C 126,148 130,156 130,168 C 130,184 126,196 120,200 L 100,200 L 96,148 Z",
}

const BACK_MUSCLES = {
  traps: "M 68,30 C 72,24 88,22 92,24 C 96,22 108,24 112,30 L 106,52 C 100,48 90,46 80,48 C 74,50 68,52 62,52 Z",
  rear_delts: "M 48,50 C 42,46 37,54 36,62 C 36,70 40,76 46,74 L 54,68 L 56,54 Z M 132,50 C 138,46 143,54 144,62 C 144,70 140,76 134,74 L 126,68 L 124,54 Z",
  lats: "M 56,60 C 48,64 44,76 44,90 C 44,104 48,114 56,118 L 76,120 L 80,60 Z M 124,60 C 132,64 136,76 136,90 C 136,104 132,114 124,118 L 104,120 L 100,60 Z",
  rhomboids: "M 62,54 C 64,52 76,50 80,50 C 84,50 96,52 98,54 L 98,88 C 92,84 84,82 80,82 C 76,82 68,84 62,88 Z",
  triceps: "M 34,76 C 28,78 26,84 26,92 C 26,100 28,108 34,110 L 44,108 L 46,78 L 38,76 Z M 146,76 C 152,78 154,84 154,92 C 154,100 152,108 146,110 L 136,108 L 134,78 L 142,76 Z",
  lower_back: "M 64,120 C 64,120 72,116 80,116 C 88,116 96,120 96,120 L 96,146 C 92,148 84,150 80,150 C 76,150 68,148 64,146 Z",
  glutes: "M 58,150 C 52,150 46,158 46,170 C 46,180 52,188 62,188 L 80,184 L 80,150 Z M 102,150 C 108,150 114,158 114,170 C 114,180 108,188 98,188 L 80,184 L 80,150 Z",
  hamstrings: "M 56,186 C 50,186 46,194 46,206 C 46,220 50,232 58,234 L 78,232 L 80,186 Z M 104,186 C 110,186 114,194 114,206 C 114,220 110,232 102,234 L 82,232 L 80,186 Z",
  calves: "M 58,238 C 52,238 48,246 48,258 C 48,270 52,278 58,280 L 76,278 L 78,238 Z M 102,238 C 108,238 112,246 112,258 C 112,270 108,278 102,280 L 84,278 L 82,238 Z",
}

function BodyFigure({ view, muscleVolume, goalId, customWeights, activeMuscle, onMuscleClick }) {
  const muscles = view === 'front' ? FRONT_MUSCLES : BACK_MUSCLES

  return (
    <svg viewBox="0 0 180 300" style={{ width: '100%', height: '100%' }}>
      {/* Body base silhouette */}
      {view === 'front' ? (
        <g fill="#2a2a2a" stroke="#3a3a3a" strokeWidth="1">
          {/* Head */}
          <ellipse cx="80" cy="22" rx="18" ry="20" />
          {/* Neck */}
          <rect x="73" y="40" width="14" height="12" />
          {/* Torso */}
          <path d="M 44,52 C 44,52 52,48 80,48 C 108,48 116,52 116,52 L 122,148 C 118,150 100,152 80,152 C 60,152 42,150 38,148 Z" />
          {/* Upper arms */}
          <path d="M 30,68 C 24,68 20,90 20,108 C 20,120 24,130 30,132 L 46,128 L 48,70 Z" />
          <path d="M 130,68 C 136,68 140,90 140,108 C 140,120 136,130 130,132 L 114,128 L 112,70 Z" />
          {/* Forearms */}
          <path d="M 18,128 C 14,130 12,144 12,154 C 12,164 16,170 20,170 L 34,166 L 36,130 Z" />
          <path d="M 142,128 C 146,130 148,144 148,154 C 148,164 144,170 140,170 L 126,166 L 124,130 Z" />
          {/* Legs */}
          <path d="M 38,148 L 40,200 C 40,210 44,218 52,220 L 74,220 L 80,148 Z" />
          <path d="M 122,148 L 120,200 C 120,210 116,218 108,220 L 86,220 L 80,148 Z" />
          {/* Lower legs */}
          <path d="M 44,216 L 46,264 C 46,274 50,280 56,282 L 74,282 L 76,218 Z" />
          <path d="M 116,216 L 114,264 C 114,274 110,280 104,282 L 86,282 L 84,218 Z" />
        </g>
      ) : (
        <g fill="#2a2a2a" stroke="#3a3a3a" strokeWidth="1">
          {/* Head */}
          <ellipse cx="80" cy="22" rx="18" ry="20" />
          {/* Neck */}
          <rect x="73" y="40" width="14" height="12" />
          {/* Torso */}
          <path d="M 44,52 C 44,52 52,48 80,48 C 108,48 116,52 116,52 L 118,150 C 112,152 96,154 80,154 C 64,154 48,152 42,150 Z" />
          {/* Upper arms */}
          <path d="M 28,66 C 22,68 18,88 18,108 C 18,122 22,132 28,134 L 44,130 L 46,68 Z" />
          <path d="M 132,66 C 138,68 142,88 142,108 C 142,122 138,132 132,134 L 116,130 L 114,68 Z" />
          {/* Forearms */}
          <path d="M 16,130 C 12,132 10,144 10,154 C 10,164 14,170 18,172 L 32,168 L 34,132 Z" />
          <path d="M 144,130 C 148,132 150,144 150,154 C 150,164 146,170 142,172 L 128,168 L 126,132 Z" />
          {/* Glutes / upper legs */}
          <path d="M 42,150 L 42,196 C 42,208 46,218 54,222 L 76,222 L 80,150 Z" />
          <path d="M 118,150 L 118,196 C 118,208 114,218 106,222 L 84,222 L 80,150 Z" />
          {/* Lower legs */}
          <path d="M 46,218 L 46,268 C 46,278 50,284 56,286 L 76,284 L 78,220 Z" />
          <path d="M 114,218 L 114,268 C 114,278 110,284 104,286 L 84,284 L 82,220 Z" />
        </g>
      )}

      {/* Muscle overlays */}
      {Object.entries(muscles).map(([muscle, path]) => {
        const vol = muscleVolume[muscle] || 0
        const color = getHeatColor(muscle, vol, goalId, customWeights)
        const isActive = activeMuscle === muscle
        return (
          <path
            key={muscle}
            d={path}
            fill={color}
            stroke={isActive ? '#fff' : 'transparent'}
            strokeWidth={isActive ? 1.5 : 0}
            style={{ cursor: 'pointer', transition: 'fill 0.4s ease', filter: isActive ? 'brightness(1.3)' : undefined }}
            onClick={() => onMuscleClick(muscle)}
          />
        )
      })}
    </svg>
  )
}

export default function BodySilhouette({ muscleVolume, goalId, customWeights, activeMuscle, onMuscleClick }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      <div style={{ flex: 1, maxWidth: 160, position: 'relative' }}>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text3)', textAlign: 'center', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Front</div>
        <BodyFigure view="front" muscleVolume={muscleVolume} goalId={goalId} customWeights={customWeights} activeMuscle={activeMuscle} onMuscleClick={onMuscleClick} />
      </div>
      <div style={{ flex: 1, maxWidth: 160, position: 'relative' }}>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text3)', textAlign: 'center', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Back</div>
        <BodyFigure view="back" muscleVolume={muscleVolume} goalId={goalId} customWeights={customWeights} activeMuscle={activeMuscle} onMuscleClick={onMuscleClick} />
      </div>
    </div>
  )
}
