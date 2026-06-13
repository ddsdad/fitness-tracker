import { createPortal } from 'react-dom'
import { IconHome, IconChart, IconTarget, IconStar, IconDumbbell } from './Icons.jsx'

// Side tabs flank a central elevated "Begin" power button.
const left  = [
  { id: 'dashboard', label: 'Home',  Icon: IconHome },
  { id: 'progress',  label: 'Stats', Icon: IconChart },
]
const right = [
  { id: 'recommend', label: 'Plan',  Icon: IconStar },
  { id: 'goals',     label: 'Goals', Icon: IconTarget },
]
const allTabs = [...left, { id: 'workout', label: 'Log', Icon: IconDumbbell }, ...right]

export default function Nav({ active, onNavigate, variant = 'mobile' }) {
  if (variant === 'desktop') {
    return createPortal(
      <nav className="nav-desktop">
        <div className="nav-desktop-brand">⚔ ARISE</div>
        {allTabs.map(({ id, label, Icon }) => (
          <button key={id} className={`nav-desktop-item${active === id ? ' active' : ''}`} onClick={() => onNavigate(id)}>
            <Icon /><span>{label}</span>
          </button>
        ))}
      </nav>,
      document.body
    )
  }

  const Tab = ({ id, label, Icon }) => (
    <button className={`nav-item${active === id ? ' active' : ''}`} onClick={() => onNavigate(id)}>
      <Icon /><span>{label}</span>
    </button>
  )

  return (
    <nav className="nav">
      {left.map(t => <Tab key={t.id} {...t} />)}

      {/* Central elevated power button — Begin / Log a session */}
      <button
        className={`nav-begin${active === 'workout' ? ' active' : ''}`}
        onClick={() => onNavigate('workout')}
        aria-label="Begin workout"
      >
        <span className="nav-begin-ring" />
        <IconDumbbell />
      </button>

      {right.map(t => <Tab key={t.id} {...t} />)}
    </nav>
  )
}
