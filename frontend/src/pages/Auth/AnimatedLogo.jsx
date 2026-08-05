import logoImg from '../../assets/logo.png'
import './AnimatedLogo.css'

/**
 * AnimatedLogo — Cinematic, fully animated logo for auth pages.
 * Features: floating levitation · dual orbit rings · 3-layer pulsing glow halos
 *           glint shimmer sweep · 8 orbital spark particles · 3D perspective tilt
 */
export default function AnimatedLogo() {
  return (
    <div className="anim-logo-root" aria-label="DecisionOS">

      {/* ── Outer ambient glow field ──────────────────────────────── */}
      <div className="anim-logo-glow-field" />

      {/* ── Pulsing concentric halo rings ─────────────────────────── */}
      <div className="anim-logo-halo anim-logo-halo--1" />
      <div className="anim-logo-halo anim-logo-halo--2" />
      <div className="anim-logo-halo anim-logo-halo--3" />

      {/* ── Rotating orbital ring 1 (fast, blue) ─────────────────── */}
      <div className="anim-logo-orbit anim-logo-orbit--1">
        <div className="anim-logo-orbit__dot" />
      </div>

      {/* ── Rotating orbital ring 2 (slow, purple, reverse) ─────── */}
      <div className="anim-logo-orbit anim-logo-orbit--2">
        <div className="anim-logo-orbit__dot anim-logo-orbit__dot--purple" />
      </div>

      {/* ── Rotating orbital ring 3 (medium, cyan, tilted) ──────── */}
      <div className="anim-logo-orbit anim-logo-orbit--3">
        <div className="anim-logo-orbit__dot anim-logo-orbit__dot--cyan" />
      </div>

      {/* ── Spark particles (8 total, burst outward) ─────────────── */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
        <div key={i} className="anim-logo-spark" style={{ '--spark-i': i }} />
      ))}

      {/* ── Core logo container (floats + perspective tilt) ──────── */}
      <div className="anim-logo-core">
        {/* Glass backdrop behind logo */}
        <div className="anim-logo-glass" />

        {/* The actual logo image */}
        <img
          src={logoImg}
          alt="DecisionOS"
          className="anim-logo-img"
          draggable={false}
        />

        {/* Shimmer glint sweep */}
        <div className="anim-logo-glint" />
      </div>

      {/* ── Brand wordmark below logo ─────────────────────────────── */}
      <div className="anim-logo-wordmark">
        <span className="anim-logo-wordmark__text">DecisionOS</span>
        <span className="anim-logo-wordmark__dot" />
      </div>

    </div>
  )
}
