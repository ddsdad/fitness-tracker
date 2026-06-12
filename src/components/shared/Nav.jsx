import { createPortal } from 'react-dom'
import { IconHome, IconDumbbell, IconChart, IconTarget, IconStar, IconApple } from './Icons.jsx'

const tabs = [
  { id: 'dashboard',  label: 'Heatmap',   Icon: IconHome },
  { id: 'workout',    label: 'Log',        Icon: IconDumbbell },
  { id: 'progress',   label: 'Progress',   Icon: IconChart },
  { id: 'goals',      label: 'Goals',      Icon: IconTarget },
  { id: 'recommend',  label: 'Plan',       Icon: IconStar },
]

export default function Nav({ active, onNavigate, variant = 'mobile' }) {
  if (variant === 'desktop') {
    // Portal to <body> so it stays pinned to the screen edge, unaffected by the
    // #root transform that constrains modals to the app column.
    return createPortal(
      <nav className="nav-desktop">
        <div className="nav-desktop-brand">💪 FitTrack</div>
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-desktop-item${active === id ? ' active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>,
      document.body
    )
  }

  return (
    <nav className="nav">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`nav-item${active === id ? ' active' : ''}`}
          onClick={() => onNavigate(id)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
