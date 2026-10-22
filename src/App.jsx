import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Routes, Route, Outlet, NavLink, Navigate, useNavigate, useLocation, useParams, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { SpotterEmbed } from '@thoughtspot/visual-embed-sdk/react'
import { TABS, INSIGHTS, tabBySlug, insightBySlug, TRAVEL, MODEL_ID, CLIENT_FILTER, CLIENT_NAME, BOOKING_TOOL_URL } from './config'
import { ToastProvider, useToast, Modal, CountUp, useLiveData } from './ui'
import { AIChatProvider, useAIChat, AIMark } from './AIChat'
import { LiveboardTab } from './Analytics'
import { ExperienceProvider } from './labs/experience'
import { Dashboards } from './labs/DashboardsPage'
import { DashboardView } from './labs/DashboardView'
import { Studio } from './labs/Studio'
import { LabBuilderRoute } from './labs/LabBuilder'
import './labs/labs.css'
import { Icon } from './icons'
import './design.css'
import BcdLogo from './BcdLogo.jsx'

const initialOrders = [
  { number: '3041879456', status: 'PLANNED', date: '2025-11-21', type: 'planned', equipment: '1 - B1210A-1200X1000 BLOCK PALLET', qty: 500 },
  { number: '3041879424', status: 'CANCELLED', date: '2025-11-21', type: 'cancelled', equipment: '3 - B1208A- 800X1200 BLOCK PALLET', qty: 200 },
  { number: '3041879403', status: 'CANCELLED', date: '2025-11-21', type: 'cancelled', equipment: '16 - P0604 - 600X400 PLASTIC PALLET', qty: 120 },
]

const EQUIPMENT = [
  '1 - B1210A-1200X1000 BLOCK PALLET',
  '3 - B1208A- 800X1200 BLOCK PALLET',
  '8 - B0806A-800X600 BLOCK PALLET',
  '16 - P0604 - 600X400 PLASTIC PALLET',
  '4001 - 48X 40 CHEP PALLETS',
]

/** Traveller Wellbeing is listed with the Analytics tabs; the other insights stay under Insights. */
const WELLBEING_SLUG = 'traveller-safety'
const UPGRADE_EVENT = 'chep-upgrade'
const noop = () => {}
const SPOTTER_FILTERS = [CLIENT_FILTER] // module-level: a new array each render would reload the embed

const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 160, damping: 20 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }

// ===================== Profile selector =====================
function ProfileSelector({ onSelectProfile }) {
  return (
    <div className="profile-selector">
      <motion.div className="profile-header" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="profile-logo"><BcdLogo height={44} /></div>
        <h1>Sign in to BCD Analytics</h1>
        <p>Select your login to continue</p>
      </motion.div>

      <motion.div className="profile-cards" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="profile-card basic" onClick={() => onSelectProfile('basic')} whileHover={{ y: -3 }} whileTap={{ scale: 0.99 }}>
          <div className="profile-icon"><Icon name="user" size={24} /></div>
          <h2>Customer</h2>
          <p>Access your BCD Analytics dashboard and insights</p>
          <ul className="profile-features">
            <li><Icon name="check" size={15} className="tick" /> Volume &amp; spend overview</li>
            <li><Icon name="check" size={15} className="tick" /> Analytics dashboard</li>
            <li><Icon name="check" size={15} className="tick" /> Order management</li>
            <li><Icon name="check" size={15} className="tick" /> Reports &amp; exports</li>
            <li><Icon name="check" size={15} className="tick" /> AI-powered insights</li>
            <li><Icon name="check" size={15} className="tick" /> BCD AI assistant</li>
          </ul>
          <button className="profile-btn basic-btn">Continue as Customer</button>
        </motion.div>

        <motion.div variants={fadeUp} className="profile-card premium" onClick={() => onSelectProfile('premium')} whileHover={{ y: -3 }} whileTap={{ scale: 0.99 }}>
          <div className="profile-badge">INTERNAL</div>
          <div className="profile-icon"><Icon name="shield" size={24} /></div>
          <h2>BCD Service Agent</h2>
          <p>Full access with AI-powered tools and insights</p>
          <ul className="profile-features">
            <li><Icon name="check" size={15} className="tick" /> Volume &amp; spend overview</li>
            <li><Icon name="check" size={15} className="tick" /> Advanced analytics dashboard</li>
            <li><Icon name="check" size={15} className="tick" /> Order management</li>
            <li><Icon name="check" size={15} className="tick" /> Reports &amp; exports</li>
            <li className="premium-feature"><Icon name="check" size={15} className="tick" /> AI-powered insights</li>
            <li className="premium-feature"><Icon name="check" size={15} className="tick" /> BCD AI assistant</li>
          </ul>
          <button className="profile-btn premium-btn">Continue as BCD Agent</button>
        </motion.div>
      </motion.div>
    </div>
  )
}

// Customer login sees the tabs flagged `customer`; the BCD Agent sees all four.
const canSeeTab = (userType, tab) => userType === 'premium' || tab.customer

// ===================== Sidebar + top bar =====================
function Sidebar({ userType, actions }) {
  const link = ({ isActive }) => `sb-link ${isActive ? 'active' : ''}`
  return (
    <aside className="sidebar">
      <Link to="/dashboard" className="sb-brand">
        <BcdLogo mark height={26} />
        <span><strong>BCD Analytics</strong><small>INTELLIGENCE</small></span>
      </Link>
      <nav className="sb-nav">
        <div className="sb-label">Core modules</div>
        <NavLink to="/dashboard" className={link}><Icon name="dashboard" size={17} /> Home</NavLink>
        <NavLink to="/ai" className={link}><Icon name="sparkles" size={17} /> BCD AI <span className="sb-pill">Live</span></NavLink>
        <NavLink to="/labs" className={link}><Icon name="flask" size={17} /> Dashboard Builder</NavLink>
        <div className="sb-label">Analytics</div>
        {TABS.map((t) => (canSeeTab(userType, t) ? (
          <NavLink key={t.slug} to={`/analytics/${t.slug}`} className={link}><Icon name={t.icon} size={17} /> {t.name}</NavLink>
        ) : (
          <button key={t.slug} className="sb-link locked" onClick={() => actions.upgrade(t)}><Icon name={t.icon} size={17} /> {t.name} <Icon name="lock" size={13} className="lock" /></button>
        )))}
        {INSIGHTS.filter((i) => i.slug === WELLBEING_SLUG).map((i) => (
          <NavLink key={i.slug} to={`/insights/${i.slug}`} className={link}><Icon name={i.icon} size={17} /> {i.name}</NavLink>
        ))}
        <div className="sb-label">Insights</div>
        {INSIGHTS.filter((i) => i.slug !== WELLBEING_SLUG).map((i) => (
          <NavLink key={i.slug} to={`/insights/${i.slug}`} className={link}><Icon name={i.icon} size={17} /> {i.name}</NavLink>
        ))}
        <div className="sb-label">Operations</div>
        <a className="sb-link" href={BOOKING_TOOL_URL} target="_blank" rel="noopener noreferrer"><Icon name="plane" size={17} /> Book a trip <Icon name="external" size={13} className="lock" /></a>
        <button className="sb-link" onClick={actions.createCollection}><Icon name="truck" size={17} /> Create collection</button>
        <button className="sb-link" onClick={actions.calendar}><Icon name="calendar" size={17} /> Manage calendar</button>
        <button className="sb-link" onClick={actions.bulk}><Icon name="check-circle" size={17} /> Bulk confirm</button>
        <button className="sb-link" onClick={actions.financials}><Icon name="dollar" size={17} /> Financials</button>
      </nav>
      <div className="sb-foot">
        <button className="sb-link" onClick={actions.settings}><Icon name="settings" size={17} /> Settings</button>
        <button className="sb-link" onClick={actions.help}><Icon name="help" size={17} /> Help &amp; support</button>
        <div className="sb-health"><i /><div><strong>Connection health</strong><small>Analytics service synced</small></div></div>
      </div>
    </aside>
  )
}

function Topbar({ userType, onLogout, actions }) {
  const initials = CLIENT_NAME.split(' ').map((w) => w[0]).join('').slice(0, 2)
  return (
    <header className="topbar">
      <button className="tb-client" onClick={actions.location}>
        <span className="tb-avatar">{initials}</span>
        <span className="tb-client-text"><strong>{CLIENT_NAME}</strong><small>Client</small></span>
        <Icon name="chevron-down" size={15} />
      </button>
      <button className="tb-search" onClick={actions.search}>
        <Icon name="search" size={16} /> <span>Search pages, tabs and actions…</span> <kbd>⌘K</kbd>
      </button>
      <div className="tb-right">
        <span className={`user-badge ${userType}`}><Icon name={userType === 'premium' ? 'shield' : 'user'} size={14} /> {userType === 'premium' ? 'BCD Agent' : 'Customer'}</span>
        <button className="tb-icon" onClick={actions.notifications} aria-label="Notifications">
          <Icon name="bell" size={18} />
          {actions.alertCount > 0 && <span className="badge-dot">{actions.alertCount}</span>}
        </button>
        <button className="tb-icon" onClick={actions.help} aria-label="Help and support"><Icon name="help" size={18} /></button>
        <button className="ghost-btn sm" onClick={onLogout}>Switch login</button>
      </div>
    </header>
  )
}

function PageHeader({ eyebrow, title, sub, children }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  )
}

// ===================== Dashboard =====================
function Section({ title, sub, children, onRefresh, refreshing, extra, id }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <motion.section className="section" id={id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.35 }}>
      <div className="section-header">
        <div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
        <div className="header-btns">
          {extra}
          {onRefresh && <button className={`icon-btn ${refreshing ? 'spin' : ''}`} onClick={onRefresh} title="Refresh"><Icon name="refresh" size={15} /></button>}
          <button className="icon-btn" onClick={() => setCollapsed((c) => !c)} title={collapsed ? 'Expand' : 'Collapse'}><Icon name={collapsed ? 'chevron-down' : 'chevron-up'} size={16} /></button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}

function ToggleGroup({ name, options, value, onChange, all = true }) {
  return (
    <div className="toggle-group">
      {(all ? ['ALL', ...options] : options).map((opt) => {
        const v = all && opt === 'ALL' ? null : opt
        const active = (value ?? null) === v
        return (
          <button key={opt} className={`toggle ${active ? 'active' : ''}`} onClick={() => onChange(v)}>
            {active && <motion.span layoutId={`tg-${name}`} className="toggle-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            <span>{opt}</span>
          </button>
        )
      })}
    </div>
  )
}

// ---- Monthly booking KPIs (latest complete month vs the one before it) ----
const monthLabel = (sec) => new Date(sec * 1000).toLocaleString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })

function useBookingKpis(data) {
  return useMemo(() => {
    const complete = (data?.months || []).filter((m) => !m.partial)
    const latest = complete[complete.length - 1]
    const prev = complete[complete.length - 2]
    return {
      cardFor: ({ field, change, badWhenUp, neutral, format }) => {
        if (!latest) return {}
        const value = latest[field]
        let delta
        if (prev && prev[field]) {
          const diff = change === 'pts' ? (value - prev[field]) * 100 : ((value - prev[field]) / prev[field]) * 100
          const up = diff >= 0
          const flat = Math.abs(diff) < 0.05
          delta = {
            text: `${up ? '▲' : '▼'} ${Math.abs(diff).toFixed(1)}${change === 'pts' ? ' pts' : '%'} MoM`,
            tone: flat || neutral ? 'flat' : up === !badWhenUp ? 'good' : 'bad',
          }
        }
        return { value, series: complete.map((m) => m[field]), delta, period: monthLabel(latest.month), format }
      },
    }
  }, [data])
}

function Sparkline({ values }) {
  if (!values || values.length < 2) return <span className="spark" />
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${26 - ((v - min) / span) * 22}`)
  return (
    <svg className="spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
      <polygon points={`0,28 ${pts.join(' ')} 100,28`} className="spark-fill" />
      <polyline points={pts.join(' ')} className="spark-line" />
    </svg>
  )
}

// ---- Needs attention: Siemens flights cancelled by air traffic control that still need rebooking ----
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })
const dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString()
const until = (ms) => {
  const mins = Math.max(0, Math.round((ms - Date.now()) / 60000))
  return mins < 1 ? 'Departing now' : mins < 60 ? `In ${mins} min` : mins < 1440 ? `In ${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m` : `In ${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`
}
const STATUS_TONE = { Cancelled: 'hot', Confirmed: 'warn' }
const PAGE = 8
const ATTENTION_REFRESH_MS = 60_000

function NeedsAttention() {
  const chat = useAIChat()
  const data = useLiveData('/api/data/needs-attention')
  const [all, setAll] = useState(false)
  const refreshRef = useRef(data.refresh)
  refreshRef.current = data.refresh
  // Departures count down and flights drop off as they leave, so re-check every minute.
  useEffect(() => { const t = setInterval(() => refreshRef.current(), ATTENTION_REFRESH_MS); return () => clearInterval(t) }, [])
  const d = data.data
  const trips = d?.trips ?? []
  const shown = all ? trips : trips.slice(0, PAGE)
  const count = d ? `${d.total.toLocaleString()} trip${d.total === 1 ? '' : 's'} · ${d.travellers.toLocaleString()} traveller${d.travellers === 1 ? '' : 's'}` : data.error ? '' : 'Checking…'

  return (
    <Section title="Needs attention" sub={`Flights cancelled by air traffic control that need rebooking, soonest departure first${count ? ` · ${count}` : ''}`} onRefresh={data.refresh} refreshing={data.loading && !!d}
      extra={<button className="ghost-btn sm" onClick={() => chat.openNotify({ mode: 'cancelled' })} disabled={!d?.total}><Icon name="mail" size={14} /> Notify travellers</button>}>
      {data.error && <div className="inline-error">Couldn't check the latest bookings. <button onClick={data.refresh}>Retry</button></div>}
      {!data.error && (
        <div className="attn" aria-busy={data.loading && !d}>
          <div className="attn-row attn-head" aria-hidden>
            <span>Status</span><span>Traveller</span><span>Route</span><span>Original Departure Time</span><span />
          </div>
          {!d && Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="attn-row is-loading" aria-hidden><span className="skeleton-bar short" /><span className="skeleton-bar" /><span className="skeleton-bar short" /><span className="skeleton-bar short" /><span /></div>
          ))}
          {d && trips.length === 0 && <div className="empty-message">No air-traffic-control cancellations need rebooking right now.</div>}
          {shown.map((t, i) => (
            <div key={`${t.id}-${i}`} className="attn-row">
              <span className="attn-status"><span className={`attn-tag is-${STATUS_TONE[t.status] ?? 'info'}`}>{t.status}</span><small title="Cancelled because of air traffic control">ATC</small></span>
              <span className="attn-who"><strong>{t.name}</strong><small>{t.email}</small></span>
              <span className="attn-route">
                <strong>{t.route ? t.route.replace('-', ' → ') : t.destCity ? `→ ${t.destCode ?? t.destCity}` : 'Route unavailable'}</strong>
                {t.originCity || t.destCity ? <small>{[t.originCity, t.destCity].filter(Boolean).join(' → ')}</small> : null}
              </span>
              <span className="attn-when">
                {t.departs ? (<><strong>{timeFmt.format(t.departs)}{!sameDay(t.departs, Date.now()) && <em> · {dayFmt.format(t.departs)}</em>}</strong><small>{until(t.departs)}</small></>) : <small>Unknown</small>}
              </span>
              <button className="attn-act" onClick={() => chat.askFlights(t)} title="Search the web for in-policy flights in the next 24 hours"><Icon name="sparkles" size={14} /> Ask</button>
            </div>
          ))}
          {d && trips.length > PAGE && (
            <div className="attn-foot">
              <button className="view-more-btn" onClick={() => setAll((v) => !v)}>{all ? 'Show fewer' : `Show ${trips.length - PAGE} more`}</button>
              {d.total > trips.length && <span className="muted">Showing the {trips.length} soonest of {d.total.toLocaleString()}.</span>}
              <Link className="attn-link" to="/insights/disruption-rebooking">Open Disruption &amp; Rebooking <Icon name="arrow" size={14} /></Link>
            </div>
          )}
        </div>
      )}
    </Section>
  )
}

// ---- Upcoming departures: Siemens flights leaving in the next 24 hours ----
function UpcomingDepartures() {
  const data = useLiveData('/api/data/upcoming-departures')
  const chat = useAIChat()
  const [all, setAll] = useState(false)
  const d = data.data
  const trips = d?.trips ?? []
  const shown = all ? trips : trips.slice(0, 8)
  return (
    <Section title="Upcoming departures" sub={`Siemens flights leaving in the next 24 hours${d ? ` · ${d.total.toLocaleString()} flights` : ''}`} onRefresh={data.refresh} refreshing={data.loading && !!d}>
      {data.error && <div className="inline-error">Couldn't load departures. <button onClick={data.refresh}>Retry</button></div>}
      {!data.error && (
        <table className="data-table text-cols">
          <thead><tr><th>Traveller</th><th>Route</th><th className="hide-sm">Airline</th><th className="hide-sm col-cabin">Cabin</th><th>Departs</th></tr></thead>
          <tbody>
            {!d && Array.from({ length: 4 }, (_, i) => <tr key={i}><td><div className="skeleton-bar" /></td><td><div className="skeleton-bar short" /></td><td className="hide-sm"><div className="skeleton-bar short" /></td><td className="hide-sm"><div className="skeleton-bar short" /></td><td><div className="skeleton-bar short" /></td></tr>)}
            {shown.map((t, i) => (
              <tr key={`${t.id}-${i}`} className="row-click" onClick={() => chat.openChat(`Tell me about ${t.name}'s trip ${t.route ? t.route.replace('-', ' → ') : ''}`)} title="Ask BCD AI about this trip">
                <td>{t.name}</td>
                <td><span className="route-code">{t.route ? t.route.replace('-', ' → ') : '—'}</span>{t.originCity || t.destCity ? <small className="cell-sub">{[t.originCity, t.destCity].filter(Boolean).join(' → ')}</small> : null}</td>
                <td className="hide-sm muted">{t.airline ?? '—'}</td>
                <td className="hide-sm muted col-cabin">{t.cabin ?? '—'}</td>
                <td>{timeFmt.format(t.departs)}<small className="cell-sub">{until(t.departs)}</small></td>
              </tr>
            ))}
            {d && trips.length === 0 && <tr><td colSpan={5} className="empty-message">No flights leave in the next 24 hours.</td></tr>}
          </tbody>
        </table>
      )}
      {d && trips.length > 8 && <div className="attn-foot"><button className="view-more-btn" onClick={() => setAll((v) => !v)}>{all ? 'Show fewer' : `Show ${trips.length - 8} more`}</button></div>}
    </Section>
  )
}

// ---- Top destinations: where the travel (and spend) goes ----
function TopDestinations() {
  const data = useLiveData('/api/data/top-destinations')
  const chat = useAIChat()
  const rows = (data.data?.rows ?? []).slice(0, 8)
  const max = Math.max(1, ...rows.map((r) => r.spend))
  return (
    <Section title="Top destinations" sub="Spend, trips and out-of-policy rate by destination, last 12 months" onRefresh={data.refresh} refreshing={data.loading && !!data.data}>
      {data.error && <div className="inline-error">Couldn't load destinations. <button onClick={data.refresh}>Retry</button></div>}
      {!data.error && (
        <table className="data-table">
          <thead><tr><th>Destination</th><th className="hide-sm">Trips</th><th className="hide-sm">Out of policy</th><th>Spend (GBP)</th></tr></thead>
          <tbody>
            {!data.data && Array.from({ length: 4 }, (_, i) => <tr key={i}><td><div className="skeleton-bar" /></td><td className="hide-sm"><div className="skeleton-bar short" /></td><td className="hide-sm"><div className="skeleton-bar short" /></td><td><div className="skeleton-bar short" /></td></tr>)}
            {rows.map((r) => (
              <tr key={r.city} className="row-click" onClick={() => chat.openChat(`How much do we spend travelling to ${r.city} and which suppliers do we use?`)} title="Ask BCD AI about this destination">
                <td>{r.city}{r.country && <small className="cell-sub">{r.country}</small>}<div className="meter"><div className="meter-fill" style={{ width: `${(r.spend / max) * 100}%` }} /></div></td>
                <td className="hide-sm muted">{Math.round(r.trips).toLocaleString()}</td>
                <td className="hide-sm muted">{(r.outOfPolicy * 100).toFixed(1)}%</td>
                <td>£{Math.round(r.spend).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  )
}

function DashboardPage({ userType, actions }) {
  const navigate = useNavigate()
  const chat = useAIChat()
  const [by, setBy] = useState('Travel type')
  const [mixFilter, setMixFilter] = useState(null)

  const byChannel = by === 'Booking channel'
  const qs = new URLSearchParams({ by: byChannel ? 'channel' : 'travel', ...(mixFilter && { filter: mixFilter }) }).toString()
  const kpis = useLiveData('/api/data/booking-kpis')
  const stock = useLiveData(`/api/data/travel-mix?${qs}`)

  const bookingKpis = useBookingKpis(kpis.data)
  const maxSpend = Math.max(1, ...(stock.data?.rows || []).map((r) => r.spend))

  const cards = [
    { icon: 'dollar', label: 'Travel spend (GBP)', field: 'amount', format: (v) => `£${(v / 1e6).toFixed(2)}M`, change: 'pct', neutral: true },
    { icon: 'clipboard', label: 'Trips booked', field: 'count', format: (v) => Math.round(v).toLocaleString(), change: 'pct', neutral: true },
    { icon: 'shield', label: 'Out of policy', field: 'outOfPolicy', format: (v) => `${(v * 100).toFixed(1)}%`, change: 'pts', badWhenUp: true, tab: 'policy-compliance' },
    { icon: 'leaf', label: 'Carbon emissions', field: 'carbonKg', format: (v) => `${Math.round(v / 1000).toLocaleString()} t CO₂e`, change: 'pct', badWhenUp: true },
  ].map((c) => ({ tab: 'overview', ...c, ...bookingKpis.cardFor(c) }))

  const onCard = (c) => {
    if (c.scroll) return document.getElementById(c.scroll)?.scrollIntoView({ behavior: 'smooth' })
    const tab = tabBySlug(c.tab)
    if (!canSeeTab(userType, tab)) return actions.upgrade(tab)
    navigate(`/analytics/${c.tab}`)
  }

  return (
    <motion.div className="page" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={fadeUp}>
        <PageHeader title={`Welcome, ${CLIENT_NAME}`} sub="Your travel spend, bookings, policy compliance and carbon footprint at a glance.">
          <button className="ghost-btn" onClick={() => chat.openChat()}><Icon name="sparkles" size={15} /> Ask BCD AI</button>
          <a className="primary-btn" href={BOOKING_TOOL_URL} target="_blank" rel="noopener noreferrer"><Icon name="plane" size={15} /> Book a trip</a>
        </PageHeader>
      </motion.div>

      <motion.div className="kpi-row" variants={stagger}>
        {cards.map((c) => (
          <motion.button key={c.label} className="kpi" variants={fadeUp} onClick={() => onCard(c)}>
            <span className="kpi-top"><span className="kpi-label">{c.label}</span><Icon name={c.icon} size={18} className="kpi-ico" /></span>
            <span className="kpi-value"><CountUp value={c.value} format={c.format} /></span>
            <Sparkline values={c.series} />
            <span className="kpi-foot">
              {c.delta ? <span className={`delta ${c.delta.tone}`}>{c.delta.text}</span> : <span className="kpi-hint">—</span>}
              <span className="kpi-hint">{c.period}</span>
            </span>
          </motion.button>
        ))}
      </motion.div>
      {kpis.error && <div className="inline-error">Couldn't load live KPIs from the analytics service. <button onClick={kpis.refresh}>Retry</button></div>}

      <NeedsAttention />

      <Section title={`Travel spend by ${byChannel ? 'booking channel' : 'travel type'}`} sub={`Last 12 months for ${CLIENT_NAME}, live from the analytics service`} onRefresh={() => { stock.refresh(); kpis.refresh() }} refreshing={stock.loading}>
        <div className="toggle-row">
          <div className="toggle-label">View by</div>
          <ToggleGroup name="by" all={false} options={['Travel type', 'Booking channel']} value={by} onChange={(v) => { setBy(v); setMixFilter(null) }} />
          <div style={{ flexBasis: '100%', height: 0 }} />
          <div className="toggle-label">{byChannel ? 'Travel type' : 'Channel'}</div>
          <ToggleGroup name={`mix-${by}`} options={byChannel ? TRAVEL.types : TRAVEL.channels} value={mixFilter} onChange={setMixFilter} />
        </div>
        {stock.error ? (
          <div className="inline-error">Couldn't load travel spend. <button onClick={stock.refresh}>Retry</button></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>{byChannel ? 'Booking channel' : 'Travel type'}</th><th className="hide-sm">Trips</th><th className="hide-sm">Out of policy</th><th>Spend (GBP)</th></tr></thead>
            <tbody>
              {stock.loading && !stock.data && Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td><div className="skeleton-bar" /></td><td className="hide-sm"><div className="skeleton-bar short" /></td><td className="hide-sm"><div className="skeleton-bar short" /></td><td><div className="skeleton-bar short" /></td></tr>
              ))}
              {(stock.data?.rows || []).map((item, i) => (
                <motion.tr key={item.name + qs} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} onClick={() => chat.openChat(`Show the monthly booking trend and out of policy rate for ${item.name} ${byChannel ? 'bookings' : 'travel'}${mixFilter ? ` (${mixFilter})` : ''}`)} className="row-click" title="Ask BCD AI about this row">
                  <td>
                    {item.name}
                    <div className="meter"><motion.div className="meter-fill" initial={{ width: 0 }} animate={{ width: `${(item.spend / maxSpend) * 100}%` }} transition={{ duration: 0.8, delay: 0.1 + i * 0.05 }} /></div>
                  </td>
                  <td className="hide-sm muted">{Math.round(item.trips).toLocaleString()}</td>
                  <td className="hide-sm muted">{(item.outOfPolicy * 100).toFixed(1)}%</td>
                  <td>£{Math.round(item.spend).toLocaleString()}</td>
                </motion.tr>
              ))}
              {stock.data && stock.data.rows.length === 0 && <tr><td colSpan={4} className="empty-message">No data for this selection</td></tr>}
            </tbody>
          </table>
        )}
      </Section>

      <div className="home-pair">
        <UpcomingDepartures />
        <TopDestinations />
      </div>
    </motion.div>
  )
}

// ===================== Analytics (liveboard tabs) =====================
function AnalyticsPage({ userType, actions }) {
  const navigate = useNavigate()
  const location = useLocation()
  const slug = location.pathname.split('/')[2] || 'overview'
  const tab = tabBySlug(slug)
  const chat = useAIChat()
  const [subBySlug, setSubBySlug] = useState({})
  const subTabs = tab?.liveboardTabs
  const subIndex = Math.min(subBySlug[slug] ?? 0, (subTabs?.length ?? 1) - 1)

  if (!tab || !canSeeTab(userType, tab)) return <Navigate to="/analytics/overview" replace />

  return (
    <motion.div className="page" initial="hidden" animate="show" variants={stagger}>
      <motion.div variants={fadeUp}>
        <PageHeader eyebrow="Analytics dashboard" title={tab.name} sub={tab.blurb}>
          <button className="primary-btn" onClick={() => chat.openChat()}>
            <Icon name="sparkles" size={15} /> Ask BCD AI
          </button>
        </PageHeader>
      </motion.div>

      <motion.div className="tab-bar" variants={fadeUp}>
        {TABS.map((t) => {
          const locked = !canSeeTab(userType, t)
          const active = t.slug === slug
          return (
            <button key={t.slug} className={`tab-btn ${active ? 'active' : ''} ${locked ? 'locked' : ''}`} onClick={() => (locked ? actions.upgrade(t) : navigate(`/analytics/${t.slug}`))}>
              {active && <motion.span layoutId="tab-pill" className="tab-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
              <span className="tab-label"><Icon name={t.icon} size={16} /> {t.name} {locked && <Icon name="lock" size={12} className="lock" />}</span>
            </button>
          )
        })}
      </motion.div>

      {subTabs && (
        <motion.div className="tab-bar sub" variants={fadeUp} role="tablist" aria-label={`${tab.name} views`}>
          {subTabs.map((t, i) => (
            <button key={t.id} role="tab" aria-selected={i === subIndex} className={`tab-btn ${i === subIndex ? 'active' : ''}`} onClick={() => setSubBySlug((m) => ({ ...m, [slug]: i }))}>
              {i === subIndex && <motion.span layoutId={`sub-pill-${slug}`} className="tab-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
              <span className="tab-label">{t.name}</span>
            </button>
          ))}
        </motion.div>
      )}
      {tab.liveboardId ? (
        <motion.section className="section" variants={fadeUp}>
          <div className="embed-container">
            <LiveboardTab slug={slug} userType={userType} hideHeader tabId={subTabs?.[subIndex]?.id} />
          </div>
        </motion.section>
      ) : (
        <motion.section className="section soon" variants={fadeUp}>
          <span className="soon-icon"><Icon name={tab.icon} size={26} /></span>
          <h2>{tab.name} is on its way</h2>
          <p>This view will show {tab.blurb.toLowerCase()}. In the meantime, ask BCD AI about it.</p>
          <button className="primary-btn" onClick={() => chat.openChat(tab.ask)}><Icon name="sparkles" size={15} /> {tab.ask}</button>
        </motion.section>
      )}
    </motion.div>
  )
}

// ===================== Insight pages (live data from the booking model) =====================
const fmtInsight = (v, fmt) => {
  if (typeof v !== 'number') return v ?? '—'
  if (fmt === 'gbp') return v >= 1e6 ? `£${(v / 1e6).toFixed(2)}M` : `£${Math.round(v).toLocaleString()}`
  if (fmt === 'pct') return `${(v * 100).toFixed(1)}%`
  return Math.round(v).toLocaleString()
}

function InsightPage() {
  const { slug } = useParams()
  const info = insightBySlug(slug)
  const chat = useAIChat()
  const data = useLiveData(`/api/data/insight/${slug}`)
  if (!info) return <Navigate to="/dashboard" replace />
  const d = data.data
  return (
    <motion.div className="page" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={fadeUp}>
        <PageHeader eyebrow={info.eyebrow} title={info.name} sub={`${info.blurb}. ${d?.period ?? 'Last 12 months'} for ${CLIENT_NAME}.`}>
          <button className="ghost-btn" onClick={data.refresh}><Icon name="refresh" size={15} /> Refresh</button>
          <button className="primary-btn" onClick={() => chat.openChat(`Tell me about ${info.name.toLowerCase()} for ${CLIENT_NAME}`)}><Icon name="sparkles" size={15} /> Ask BCD AI</button>
        </PageHeader>
      </motion.div>
      {data.error && <div className="inline-error">Couldn't load this view from the analytics service. <button onClick={data.refresh}>Retry</button></div>}
      <motion.div className="kpi-row" variants={stagger}>
        {(d?.kpis || Array.from({ length: 4 })).map((k, i) => (
          <motion.div key={k?.label || i} className="kpi static" variants={fadeUp}>
            <span className="kpi-top"><span className="kpi-label">{k?.label || ' '}</span></span>
            <span className="kpi-value">{k ? <CountUp value={k.value} format={(v) => fmtInsight(v, k.fmt)} /> : <span className="skeleton-bar short" />}</span>
            <span className="kpi-foot"><span className="kpi-hint">{k?.hint}</span></span>
          </motion.div>
        ))}
      </motion.div>
      {(d?.tables || []).map((t) => {
        const max = Math.max(1, ...t.rows.map((r) => Number(r[t.bar]) || 0))
        return (
          <Section key={t.title} title={t.title} sub={t.sub}>
            <table className="data-table">
              <thead><tr>{t.columns.map((c, i) => <th key={c.key} className={i > 0 && i < t.columns.length - 1 ? 'hide-sm' : ''}>{c.label}</th>)}</tr></thead>
              <tbody>
                {t.rows.map((r, ri) => (
                  <tr key={ri} className="row-click" onClick={() => chat.openChat(`Tell me more about ${r[t.columns[0].key]} (${t.title.toLowerCase()})`)} title="Ask BCD AI about this row">
                    {t.columns.map((c, i) => (
                      <td key={c.key} className={i > 0 && i < t.columns.length - 1 ? 'hide-sm muted' : ''}>
                        {i === 0 ? (<>{r[c.key]}{t.bar && <div className="meter"><div className="meter-fill" style={{ width: `${((Number(r[t.bar]) || 0) / max) * 100}%` }} /></div>}</>) : fmtInsight(r[c.key], c.fmt)}
                      </td>
                    ))}
                  </tr>
                ))}
                {t.rows.length === 0 && <tr><td colSpan={t.columns.length} className="empty-message">No data</td></tr>}
              </tbody>
            </table>
          </Section>
        )
      })}
      {data.loading && !d && <div className="section"><div className="empty-message"><span className="spinner" /> Loading…</div></div>}
    </motion.div>
  )
}

// ===================== BCD AI page (full Spotter, full width) =====================
const SPOTTER_SIDEBAR = { enablePastConversationsSidebar: true, spotterSidebarDefaultExpanded: false }
const SPOTTER_FRAME = { width: '100%', height: '100%' }

// Plain Spotter 3 embed on the BCD model, filtered to the client. Questions handed over from elsewhere in the app
// (cards, tabs, search) arrive as router state and are run as the starting search.
function AIPage() {
  const location = useLocation()
  const q = location.state?.q || ''
  const searchOptions = useMemo(() => (q ? { searchQuery: q, executeSearch: true } : undefined), [q])
  return (
    <div className="ai-page ai-plain">
      <SpotterEmbed
        key={location.state?.n ?? 0}
        worksheetId={MODEL_ID}
        runtimeFilters={SPOTTER_FILTERS}
        frameParams={SPOTTER_FRAME}
        searchOptions={searchOptions}
        spotterSidebarConfig={SPOTTER_SIDEBAR}
      />
    </div>
  )
}

// ===================== Overlays: search, notifications, help, settings, forms =====================
function SearchPalette({ open, onClose, userType, actions }) {
  const navigate = useNavigate()
  const chat = useAIChat()
  const [q, setQ] = useState('')
  useEffect(() => { if (open) setQ('') }, [open])

  const items = useMemo(() => {
    const list = [
      { label: 'Home', icon: 'home', run: () => navigate('/dashboard') },
      ...TABS.map((t) => ({ label: `Analytics · ${t.name}`, icon: t.icon, locked: !canSeeTab(userType, t), run: () => (canSeeTab(userType, t) ? navigate(`/analytics/${t.slug}`) : actions.upgrade(t)) })),
      { label: 'Book a trip', icon: 'plane', run: () => window.open(BOOKING_TOOL_URL, '_blank', 'noopener') },
      { label: 'Create collection', icon: 'truck', run: actions.createCollection },
      { label: 'Manage calendar', icon: 'calendar', run: actions.calendar },
      { label: 'Bulk confirm orders', icon: 'check-circle', run: actions.bulk },
      { label: 'Help & support', icon: 'help', run: actions.help },
      { label: 'Settings', icon: 'settings', run: actions.settings },
    ]
    list.splice(1, 0, { label: 'BCD AI', icon: 'sparkles', run: () => navigate('/ai') })
    return list.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()))
  }, [q, userType, navigate, actions])

  const pick = (fn) => { onClose(); setTimeout(fn, 120) }
  const askAI = () => pick(() => chat.openChat(q))

  return (
    <Modal open={open} onClose={onClose} title="Search BCD Analytics" width={560}>
      <input className="search-input" autoFocus placeholder="Search pages, tabs, actions — or ask a question…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { if (items[0]) pick(items[0].run); else askAI() } }} />
      <div className="search-results">
        {items.map((i) => (
          <motion.button key={i.label} className="search-item" onClick={() => pick(i.run)} whileHover={{ x: 4 }}>
            <Icon name={i.icon} size={16} /> {i.label} {i.locked && <Icon name="lock" size={13} className="lock" />}
          </motion.button>
        ))}
        {q.trim() && (
          <button className="search-item ai" onClick={askAI}>
            <AIMark size={18} /> Ask BCD AI: “{q}”
          </button>
        )}
      </div>
    </Modal>
  )
}

function NotificationsPanel({ open, onClose, alerts, loading, error, onPick, onRefresh }) {
  return (
    <Modal open={open} onClose={onClose} title="Notifications" side width={420}
      footer={<button className="view-more-btn" style={{ margin: 0, width: '100%' }} onClick={onRefresh}>Refresh alerts</button>}>
      {loading && <div className="skeleton-bar" style={{ height: 60 }} />}
      {error && <div className="inline-error">Couldn't load alerts from the analytics service.</div>}
      {alerts.map((a, i) => (
        <motion.button key={a.id} className={`alert-item ${a.level}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} onClick={() => onPick(a)}>
          <span className={`alert-icon ${a.level}`}><Icon name={a.level === 'warn' ? 'warn' : 'info'} size={18} /></span>
          <span><strong>{a.title}</strong><small>{a.detail}</small></span>
          <Icon name="chevron-right" size={16} className="arrow" />
        </motion.button>
      ))}
      {!loading && !error && alerts.length === 0 && <p className="muted">You're all caught up.</p>}
    </Modal>
  )
}

const FAQ = [
  ['Where do these figures come from?', 'Live from your BCD booking data: spend, trips, policy compliance and carbon, scoped to your organisation. Figures refresh each time you load or refresh a page.'],
  ['How do I see more analytics?', 'Open any item under Analytics or Insights in the sidebar. Each view is a different lens on the same data.'],
  ['What is BCD AI?', 'An AI assistant for your BCD Analytics account. Ask questions in plain language and get answers with live charts.'],
  ['How do I contact BCD Travel?', 'Call your BCD Travel service line or email your account manager. Trips and changes can also be requested from the sidebar.'],
]


function HelpPanel({ open, onClose, toast }) {
  const [openIdx, setOpenIdx] = useState(0)
  return (
    <Modal open={open} onClose={onClose} title="Help & Support" side width={440}>
      {FAQ.map(([q, a], i) => (
        <div className="faq" key={q}>
          <button className="faq-q" onClick={() => setOpenIdx(openIdx === i ? -1 : i)}>{q}<span>{openIdx === i ? '−' : '+'}</span></button>
          <AnimatePresence initial={false}>
            {openIdx === i && <motion.p className="faq-a" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>{a}</motion.p>}
          </AnimatePresence>
        </div>
      ))}
      <button className="primary-btn" style={{ marginTop: 16 }} onClick={() => { toast('Support request sent. A BCD agent will contact you shortly.'); onClose() }}>Contact support</button>
    </Modal>
  )
}

function SettingRow({ label, desc, children }) {
  return <div className="setting-row"><div><strong>{label}</strong><small>{desc}</small></div>{children}</div>
}

function SettingsPanel({ open, onClose, settings, setSettings }) {
  return (
    <Modal open={open} onClose={onClose} title="Settings" side width={440}>
      <SettingRow label="Reduce motion" desc="Turn off animations and transitions">
        <button className={`switch ${settings.reduceMotion ? 'on' : ''}`} onClick={() => setSettings({ ...settings, reduceMotion: !settings.reduceMotion })}><i /></button>
      </SettingRow>
      <SettingRow label="Compact tables" desc="Tighter rows in tables">
        <button className={`switch ${settings.compact ? 'on' : ''}`} onClick={() => setSettings({ ...settings, compact: !settings.compact })}><i /></button>
      </SettingRow>
      <p className="muted" style={{ marginTop: 16 }}>Settings are saved on this device.</p>
    </Modal>
  )
}

function OrderModal({ mode, context, onClose, onCreate }) {
  const [equipment, setEquipment] = useState(EQUIPMENT[0])
  const [qty, setQty] = useState(100)
  const [date, setDate] = useState(() => new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10))
  const label = mode === 'collection' ? 'Collection' : 'Order'
  return (
    <Modal open={!!mode} onClose={onClose} title={`Create ${label}`}
      footer={<><button className="ghost-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={qty < 1} onClick={() => onCreate({ equipment, qty, date, mode })}>Create {label}</button></>}>
      {context && <p className="order-context"><Icon name="chart" size={14} /> From your selection: <strong>{context}</strong></p>}
      <label className="field">Equipment<select value={equipment} onChange={(e) => setEquipment(e.target.value)}>{EQUIPMENT.map((e) => <option key={e}>{e}</option>)}</select></label>
      <label className="field">Quantity<input type="number" min="1" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></label>
      <label className="field">{mode === 'collection' ? 'Collection date' : 'Delivery date'}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
    </Modal>
  )
}

function BulkModal({ open, onClose, orders, onConfirm }) {
  const planned = orders.filter((o) => o.type === 'planned')
  const [sel, setSel] = useState({})
  useEffect(() => {
    if (open) setSel(Object.fromEntries(orders.filter((o) => o.type === 'planned').map((o) => [o.number, true])))
  }, [open, orders])
  const chosen = planned.filter((o) => sel[o.number])
  return (
    <Modal open={open} onClose={onClose} title="Bulk Confirm"
      footer={<><button className="ghost-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={!chosen.length} onClick={() => onConfirm(chosen.map((o) => o.number))}>Confirm {chosen.length}</button></>}>
      {planned.length === 0 ? <p className="muted">No planned orders to confirm.</p> : planned.map((o) => (
        <label className="check-row" key={o.number}>
          <input type="checkbox" checked={!!sel[o.number]} onChange={() => setSel({ ...sel, [o.number]: !sel[o.number] })} />
          <span><strong>{o.number}</strong> — {o.qty} × {o.equipment.split(' - ')[0]} · {o.date}</span>
        </label>
      ))}
    </Modal>
  )
}

function CalendarModal({ open, onClose, orders }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const offset = (month.getDay() + 6) % 7
  const iso = (d) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const byDate = orders.reduce((m, o) => ({ ...m, [o.date]: [...(m[o.date] || []), o] }), {})
  const shift = (n) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
  return (
    <Modal open={open} onClose={onClose} title="Manage Calendar" width={520}>
      <div className="cal-head">
        <button className="collapse-btn" onClick={() => shift(-1)}>‹</button>
        <strong>{month.toLocaleString('en', { month: 'long', year: 'numeric' })}</strong>
        <button className="collapse-btn" onClick={() => shift(1)}>›</button>
      </div>
      <div className="cal-grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="cal-dow">{d}</div>)}
        {Array.from({ length: offset }).map((_, i) => <div key={`o${i}`} />)}
        {Array.from({ length: days }).map((_, i) => {
          const list = byDate[iso(i + 1)] || []
          return <div key={i} className={`cal-day ${list.length ? 'has' : ''}`} title={list.map((o) => `${o.number} ${o.status}`).join('\n')}>{i + 1}{list.length > 0 && <b>{list.length}</b>}</div>
        })}
      </div>
    </Modal>
  )
}

// ===================== Shell =====================
function Shell({ userType, onLogout }) {
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const chat = useAIChat()
  const [orders, setOrders] = useState(initialOrders)
  const [overlay, setOverlay] = useState(null)
  const [detail, setDetail] = useState(null)
  const [upgradeTab, setUpgradeTab] = useState(null)
  const [settings, setSettings] = useState(() => { try { return JSON.parse(localStorage.getItem('chep-settings')) || {} } catch { return {} } })
  const alerts = useLiveData('/api/data/alerts')

  useEffect(() => { localStorage.setItem('chep-settings', JSON.stringify(settings)) }, [settings])
  useEffect(() => {
    document.body.classList.toggle('reduce-motion', !!settings.reduceMotion)
    document.body.classList.toggle('compact', !!settings.compact)
  }, [settings])
  useEffect(() => {
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOverlay('search') } }
    const onUpgrade = () => { setUpgradeTab(null); setOverlay('upgrade') }
    window.addEventListener('keydown', onKey)
    window.addEventListener(UPGRADE_EVENT, onUpgrade)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener(UPGRADE_EVENT, onUpgrade) }
  }, [])

  const close = useCallback(() => setOverlay(null), [])
  const alertCount = alerts.data?.alerts?.length || 0
  const actions = useMemo(() => ({
    search: () => setOverlay('search'),
    notifications: () => setOverlay('notifications'),
    help: () => setOverlay('help'),
    settings: () => setOverlay('settings'),
    createCollection: () => setOverlay('collection'),
    bulk: () => setOverlay('bulk'),
    calendar: () => setOverlay('calendar'),
    location: () => toast(`Only one account (${CLIENT_NAME}) is linked to this login.`),
    financials: () => chat.openChat('What is our monthly repair cost trend and which asset types or customer segments drive it?'),
    upgrade: (tab) => { setUpgradeTab(tab || null); setOverlay('upgrade') },
    orderDetail: (order) => { setDetail(order); setOverlay('detail') },
    alertCount,
  }), [toast, chat, alertCount])

  const createOrder = ({ equipment, qty, date, mode }) => {
    const number = String(3041880000 + Math.floor(Math.random() * 9999))
    setOrders((o) => [{ number, status: 'PLANNED', date, type: 'planned', equipment, qty, kind: mode }, ...o])
    close()
    const label = mode === 'collection' ? 'Collection' : 'Order'
    const order = { number, status: 'PLANNED', date, type: 'planned', equipment, qty, kind: mode }
    toast(`✓ ${label} ${number} created — ${qty.toLocaleString()} × ${equipment.split(' - ')[0]} for ${date}`, {
      kind: 'success',
      duration: 7000,
      action: { label: 'View', onClick: () => { setDetail(order); setOverlay('detail') } },
    })
    navigate('/dashboard')
  }
  const confirmBulk = (numbers) => {
    setOrders((o) => o.map((x) => (numbers.includes(x.number) ? { ...x, status: 'CONFIRMED', type: 'confirmed' } : x)))
    close()
    toast(`${numbers.length} order(s) confirmed`, { kind: 'success' })
  }
  const openAlert = (a) => {
    close()
    if (a.to) return navigate(a.to)
    const tab = tabBySlug(a.tab)
    navigate(`/analytics/${tab && canSeeTab(userType, tab) ? a.tab : 'overview'}`)
  }

  const pageKey = location.pathname.startsWith('/analytics') ? 'analytics' : location.pathname.startsWith('/insights') ? 'insights' : /^\/(labs|dashboards|studio)/.test(location.pathname) ? 'build' : location.pathname
  const progressKey = location.pathname

  return (
    <div className="shell">
      <motion.div key={progressKey} className="route-progress" initial={{ scaleX: 0, opacity: 1 }} animate={{ scaleX: 1, opacity: 0 }} transition={{ scaleX: { duration: 0.7, ease: 'easeOut' }, opacity: { delay: 0.6, duration: 0.3 } }} />
      <Sidebar userType={userType} actions={actions} />
      <div className="workspace">
      <Topbar userType={userType} onLogout={onLogout} actions={actions} />
      <main className={`main ${location.pathname === '/ai' ? 'full' : ''} ${location.pathname.startsWith('/analytics') || /^\/(labs|dashboards|studio)/.test(location.pathname) ? 'wide' : ''}`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={pageKey} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}>
            <Routes location={location}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage userType={userType} actions={actions} />} />
              <Route path="/analytics" element={<Navigate to="/analytics/overview" replace />} />
              <Route path="/analytics/:tab" element={<AnalyticsPage userType={userType} actions={actions} />} />
              <Route path="/insights/:slug" element={<InsightPage />} />
              <Route path="/ai" element={<AIPage />} />
              <Route path="/dashboards" element={<Dashboards />} />
              <Route path="/dashboards/:id" element={<DashboardView />} />
              <Route path="/studio" element={<Studio />} />
              {/* Dashboard Labs: the same pages, with BCD AI building by conversation (src/labs/experience.jsx). */}
              <Route path="/labs" element={<ExperienceProvider experience="lab"><Outlet /></ExperienceProvider>}>
                <Route index element={<Dashboards />} />
                <Route path="dashboards/:id" element={<DashboardView />} />
                <Route path="studio" element={<Studio />} />
                <Route path="shuttleviz/:id" element={<LabBuilderRoute />} />
              </Route>
              <Route path="/spotter" element={<Navigate to="/ai" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="footer">
        <div className="footer-brand">BCD Travel</div>
        <div className="footer-links">
          <a href="#" onClick={(e) => { e.preventDefault(); toast('Privacy Policy opens on bcdtravel.com in production') }}>Privacy Policy</a>
          <a href="#" onClick={(e) => { e.preventDefault(); toast('Terms of Use open on bcdtravel.com in production') }}>Terms of Use</a>
          <a href="#" onClick={(e) => { e.preventDefault(); actions.help() }}>Contact</a>
        </div>
        <div className="footer-copy">© 2026 BCD Travel Limited. All rights reserved.</div>
      </footer>
      </div>

      <SearchPalette open={overlay === 'search'} onClose={close} userType={userType} actions={actions} />
      <NotificationsPanel open={overlay === 'notifications'} onClose={close} alerts={alerts.data?.alerts || []} loading={alerts.loading} error={alerts.error} onRefresh={alerts.refresh} onPick={openAlert} />
      <HelpPanel open={overlay === 'help'} onClose={close} toast={toast} />
      <SettingsPanel open={overlay === 'settings'} onClose={close} settings={settings} setSettings={setSettings} />
      <OrderModal mode={overlay === 'collection' ? 'collection' : null} context="" onClose={close} onCreate={createOrder} />
      <BulkModal open={overlay === 'bulk'} onClose={close} orders={orders} onConfirm={confirmBulk} />
      <CalendarModal open={overlay === 'calendar'} onClose={close} orders={orders} />
      <Modal open={overlay === 'detail'} onClose={close} title={`Order ${detail?.number ?? ''}`}>
        {detail && (<div className="detail-grid"><span>Status</span><strong className={`order-status ${detail.type}`}>{detail.status}</strong><span>Date</span><strong>{detail.date}</strong><span>Equipment</span><strong>{detail.equipment}</strong><span>Quantity</span><strong>{detail.qty?.toLocaleString()}</strong></div>)}
      </Modal>
      <Modal open={overlay === 'upgrade'} onClose={close} title="Unlock more with your BCD agent"
        footer={<><button className="ghost-btn" onClick={close}>Not now</button><button className="primary-btn" onClick={() => { close(); toast('Request sent. Your BCD agent will be in touch.', { kind: 'success' }) }}>Contact CHEP Agent</button></>}>
        <p>{upgradeTab ? `“${upgradeTab.name}” is available to BCD Service Agents.` : 'AI-powered insights and advanced analytics are available through your BCD Service Agent.'}</p>
        <p className="muted">Ask your agent to enable the full analytics suite and the BCD AI assistant for your account.</p>
      </Modal>
    </div>
  )
}

function App() {
  const [userType, setUserType] = useState(null) // null, 'basic' (Customer), or 'premium' (BCD Agent)
  const navigate = useNavigate()

  // Signing in always starts on the home page, whatever URL the visitor arrived on.
  const goHome = (type) => { setUserType(type); navigate('/dashboard', { replace: true }) }
  if (!userType) return <ProfileSelector onSelectProfile={goHome} />

  return (
    <ToastProvider>
      <AIChatProvider enabled onLocked={() => window.dispatchEvent(new Event(UPGRADE_EVENT))}>
        <Shell userType={userType} onLogout={() => setUserType(null)} key={userType} />
      </AIChatProvider>
    </ToastProvider>
  )
}

export default App
