// Convert plan exercises (from Recommendations / Program / WeekPlanner) into
// the live-session format used by WorkoutSession. Pure util — kept out of the
// component tree so importing it doesn't drag the whole workout UI into the
// eager bundle (lets the WorkoutLog tab code-split cleanly).
function genId() { return Math.random().toString(36).slice(2) }

export function planExercisesToSession(planExercises) {
  return planExercises.map(planEx => {
    const repsStr    = String(planEx.reps || '8')
    const repsTarget = parseInt(repsStr.split('–')[0] || repsStr.split('-')[0] || '8')
    const restSecs   = planEx.category === 'compound' ? 180 : 90
    return {
      id:               genId(),
      exerciseId:       planEx.id,
      name:             planEx.name,
      primaryMuscle:    planEx.primary,
      secondaryMuscles: planEx.secondary || [],
      sets: Array.from({ length: planEx.sets || 3 }, () => ({
        id: genId(), weight: 0, reps: repsTarget, restSeconds: restSecs, done: false,
      })),
      _prescribedReps: repsStr,
    }
  })
}
