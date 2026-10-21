import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DashboardMosaic } from './DashboardMosaic'
import { cloneDashboard, deleteDashboard, formatEdited, listDashboards, listShared, tileCount } from './dashboards'
import { useExperience, usePaths } from './experience'
const BUILD_MODES = [
  {
    mode: 'search',
    title: 'Build with Search',
    body: 'Pick columns from BCD Travel Analytics and shape each chart yourself. Pin it, and it stays linked: keep editing and the dashboard follows.',
    cta: 'Start with Search',
  },
  {
    mode: 'ai',
    title: 'Build with BCD AI',
    body: 'Describe the dashboard you need in plain words. BCD AI picks the charts, lays them out and refines them as you talk.',
    cta: 'Start with BCD AI',
  },
]
const LAB_SHUTTLEVIZ_BODY =
  'Tell BCD AI what you need. It proposes a plan and the data it will use, builds and styles the dashboard once you approve, then changes it as you talk. Or explore with BCD AI first and turn the charts you keep into a dashboard.'
function Dashboards() {
  const navigate = useNavigate()
  const paths = usePaths()
  const lab = useExperience() === 'lab'
  const [tab, setTab] = useState('mine')
  const [mine, setMine] = useState(null)
  const [shared, setShared] = useState(null)
  const [error, setError] = useState(null)
  const [sharedError, setSharedError] = useState(null)
  const [query, setQuery] = useState('')
  const [confirming, setConfirming] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [cloning, setCloning] = useState(null)
  useEffect(() => {
    let cancelled = false
    listDashboards()
      .then((d) => !cancelled && setMine(d))
      .catch((err) => !cancelled && setError(err.message))
    listShared()
      .then((d) => !cancelled && setShared(d))
      .catch((err) => !cancelled && setSharedError(err.message))
    return () => {
      cancelled = true
    }
  }, [])
  const list = tab === 'mine' ? mine : shared
  const listError = tab === 'mine' ? error : sharedError
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? list?.filter((d) => `${d.name} ${d.description} ${d.author}`.toLowerCase().includes(q)) : list
  }, [list, query])
  const remove = async (d) => {
    setDeleting(d.id)
    try {
      await deleteDashboard(d.id)
      setMine((l) => l?.filter((x) => x.id !== d.id) ?? null)
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(null)
      setConfirming(null)
    }
  }
  const clone = async (d) => {
    setCloning(d.id)
    setSharedError(null)
    try {
      const copy = await cloneDashboard(d.id)
      navigate(paths.search(copy.id))
    } catch (err) {
      setSharedError(err.message)
      setCloning(null)
    }
  }
  const count = (l) => (l ? ` \xB7 ${l.length}` : '')
  return (
    <div className="dashboards">
      <section className="dash-head">
        <div className="dash-title">
          <div className="eyebrow">
            <span className="tag">{lab ? 'Dashboard Builder' : 'Dashboards'}</span>
                        <span>BCD Travel Analytics</span>
          </div>
          <h1 className="display dash-h1">
            Build your <span className="highlight">own view</span>
          </h1>
          <p className="dash-lede">Build dashboards of your own, or start from one a colleague shared with you.</p>
        </div>
      </section>

      <section className="dash-modes" aria-label="Start a new dashboard">
        {BUILD_MODES.map((m) => (
          <Link
            key={m.mode}
            to={m.mode === 'search' ? paths.search() : paths.shuttleViz()}
            state={lab && m.mode === 'ai' ? { fresh: true } : void 0}
            className={`mode-card is-${m.mode}`}
          >
            <div className="mode-card-art" aria-hidden>
              {m.mode === 'search' ? (
                <>
                  <span className="mode-token">Spend</span>
                  <span className="mode-token">Travel Type</span>
                  <span className="mode-token is-ghost">Monthly</span>
                  <span className="mode-pin">⤓ Pin</span>
                </>
              ) : (
                <>
                  <span className="shuttle-pill is-large" />
                  <span className="mode-prompt">“An exec overview of spend and out of policy by department”</span>
                  {lab && <span className="lab-plan-chip">Plan ready · approve?</span>}
                </>
              )}
            </div>
            <h2 className="mode-card-title">{m.title}</h2>
            <p className="mode-card-body">{lab && m.mode === 'ai' ? LAB_SHUTTLEVIZ_BODY : m.body}</p>
            <span className="mode-card-cta">
              {m.cta} <span aria-hidden>→</span>
            </span>
          </Link>
        ))}
      </section>

      <section className="dash-library">
        <div className="dash-library-head">
          <div className="dash-tabs" role="tablist" aria-label="Which dashboards">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'mine'}
              className={tab === 'mine' ? 'dash-tab is-active' : 'dash-tab'}
              onClick={() => setTab('mine')}
            >
              My dashboards<span className="dash-tab-count">{count(mine)}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'shared'}
              className={tab === 'shared' ? 'dash-tab is-active' : 'dash-tab'}
              onClick={() => setTab('shared')}
            >
              Shared with you<span className="dash-tab-count">{count(shared)}</span>
            </button>
          </div>
          {!!list?.length && (
            <label className="dash-filter">
              <span className="mono-label">Find</span>
              <input
                type="search"
                value={query}
                placeholder={tab === 'mine' ? 'Dashboard name' : 'Name or author'}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          )}
        </div>
        <p className="dash-library-note mono-label">
          {tab === 'mine'
            ? 'Dashboards you created \xB7 open, edit in Studio or delete'
            : 'BCD Travel Analytics dashboards others made that you can open \xB7 clone one to make it yours and edit it'}
        </p>

        {listError && (
          <div className="dash-notice is-error" role="alert">
            {listError}
            <button type="button" className="btn-outline" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        )}

        {!list && !listError && (
          <div className="dash-grid" aria-busy>
            {[0, 1, 2].map((i) => (
              <div key={i} className="dash-card is-loading" aria-hidden>
                <div className="dash-card-body">
                  <span className="dash-skeleton is-wide" />
                  <span className="dash-skeleton" />
                </div>
              </div>
            ))}
          </div>
        )}

        {list?.length === 0 &&
          (tab === 'mine' ? (
            <div className="dash-empty">
              <DashboardMosaic seed="bcd" tiles={5} />
              <div>
                <strong>No dashboards yet.</strong>
                <p>Start with Search to build chart by chart, let BCD AI draft a whole dashboard from one sentence, or clone one shared with you.</p>
              </div>
            </div>
          ) : (
            <div className="dash-notice">Nobody has shared a BCD Travel Analytics dashboard with you yet.</div>
          ))}

        {!!shown?.length && (
          <div className="dash-grid">
            {shown.map((d, i) => (
              <article key={d.id} className={d.owned ? 'dash-card' : 'dash-card is-shared'} style={{ '--i': i }}>
                <Link to={paths.view(d.id)} className="dash-card-open" aria-label={`Open ${d.name}`}>
                  <div className="dash-card-body">
                    {!d.owned && d.author && <span className="dash-card-author mono-label">By {d.author}</span>}
                    <h3 className="dash-card-name">{d.name}</h3>
                    {d.description && <p className="dash-card-desc">{d.description}</p>}
                    <span className="mono-label dash-card-meta">
                      {tileCount(d.tiles)} · {formatEdited(d.modified)}
                    </span>
                  </div>
                </Link>
                <div
                  className={confirming === d.id ? 'dash-card-actions is-confirming' : 'dash-card-actions'}
                  onBlur={(e) => confirming === d.id && !deleting && !e.currentTarget.contains(e.relatedTarget) && setConfirming(null)}
                  onKeyDown={(e) => e.key === 'Escape' && !deleting && setConfirming(null)}
                >
                  {d.owned && confirming === d.id ? (
                    <>
                      <span className="dash-confirm" role="alert">
                        Delete for good?
                      </span>
                      <button type="button" className="is-danger" disabled={deleting === d.id} onClick={() => remove(d)} autoFocus>
                        {deleting === d.id ? 'Deleting\u2026' : 'Delete'}
                      </button>
                      <button type="button" className="is-quiet" disabled={deleting === d.id} onClick={() => setConfirming(null)}>
                        Cancel
                      </button>
                    </>
                  ) : d.owned ? (
                    <>
                      <button type="button" onClick={() => navigate(paths.search(d.id))} title="Add or change charts with Search">
                        ⌕ Search
                      </button>
                      <button type="button" onClick={() => navigate(paths.shuttleViz(d.id))} title="Edit this dashboard with BCD AI">
                        ✦ BCD AI
                      </button>
                      <button type="button" className="is-quiet" onClick={() => setConfirming(d.id)} aria-label={`Delete ${d.name}`} title="Delete">
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => navigate(paths.view(d.id))}>
                        Open
                      </button>
                      <button
                        type="button"
                        className="is-primary"
                        onClick={() => void clone(d)}
                        disabled={!!cloning}
                        title="Make your own copy and edit it in Studio"
                      >
                        {cloning === d.id ? 'Cloning\u2026' : '\u29C9 Clone & edit'}
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {list && !!list.length && shown?.length === 0 && <div className="dash-notice">No dashboard matches “{query}”.</div>}
      </section>
    </div>
  )
}
export { Dashboards }
