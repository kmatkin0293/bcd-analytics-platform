import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { SearchBuilder } from './SearchBuilder'
import { ShuttleBuilder } from './ShuttleBuilder'
import { EditableTitle } from './EditableTitle'
import { cloneDashboard, listDashboards, renameDashboard, tileCount } from './dashboards'
import { useExperience, usePaths } from './experience'
const MODES = [
  { mode: 'search', icon: '\u2315', label: 'Search', sub: 'Chart by chart' },
  { mode: 'ai', icon: '\u2726', label: 'BCD AI', sub: 'Describe it' },
]
function Studio() {
  const [params, setParams] = useSearchParams()
  const paths = usePaths()
  const lab = useExperience() === 'lab'
  const navigate = useNavigate()
  const mode = params.get('mode') === 'ai' ? 'ai' : 'search'
  const dashboardId = params.get('dashboard')
  const editVizId = params.get('edit')
  const [dashboards, setDashboards] = useState(null)
  const [listError, setListError] = useState(false)
  const [newName, setNewName] = useState('')
  const [dirty, setDirty] = useState(false)
  const [created, setCreated] = useState({})
  const [renamedAt, setRenamedAt] = useState(0)
  const refresh = useCallback(() => {
    listDashboards()
      .then((d) => {
        setDashboards(d)
        setListError(false)
      })
      .catch(() => setListError(true))
  }, [])
  useEffect(refresh, [refresh])
  const current = dashboards?.find((d) => d.id === dashboardId)
  const title = current?.name ?? (dashboardId ? created[dashboardId] : void 0)
  const foreign = !!dashboardId && !!dashboards && !current && !(dashboardId in created)
  const checking = !!dashboardId && !dashboards && !listError && !(dashboardId in created)
  const [cloning, setCloning] = useState(false)
  const [cloneError, setCloneError] = useState(null)
  const cloneForeign = async () => {
    if (!dashboardId) return
    setCloning(true)
    setCloneError(null)
    try {
      const copy = await cloneDashboard(dashboardId)
      setCreated((c) => ({ ...c, [copy.id]: copy.name }))
      go({ dashboard: copy.id })
      refresh()
    } catch (err) {
      setCloneError(err.message)
    } finally {
      setCloning(false)
    }
  }
  const leaveOk = () => !dirty || window.confirm('BCD AI\u2019s latest changes aren\u2019t saved. Leave without saving?')
  const go = (next) => {
    if (!leaveOk()) return
    if (lab && next.mode === 'ai') {
      navigate(paths.shuttleViz(next.dashboard === void 0 ? dashboardId : next.dashboard))
      return
    }
    const p = new URLSearchParams(params)
    if (next.mode) p.set('mode', next.mode)
    if (next.dashboard !== void 0) {
      if (next.dashboard) p.set('dashboard', next.dashboard)
      else p.delete('dashboard')
    }
    setDirty(false)
    setParams(p)
  }
  const onCreated = useCallback(
    (id) => {
      setCreated((c) => ({ ...c, [id]: newName.trim() || 'Untitled dashboard' }))
      setParams((p) => {
        const next = new URLSearchParams(p)
        next.set('dashboard', id)
        return next
      })
      setNewName('')
      refresh()
    },
    [setParams, refresh, newName],
  )
  const rename = async (name) => {
    if (dirty) throw new Error('Save BCD AI\u2019s changes first, then rename.')
    const renamed = await renameDashboard(dashboardId, name)
    setDashboards((list) => list?.map((d) => (d.id === renamed.id ? renamed : d)) ?? null)
    setCreated((c) => (renamed.id in c ? { ...c, [renamed.id]: renamed.name } : c))
    setRenamedAt(Date.now())
  }
  const onEditOpened = useCallback(
    () =>
      setParams(
        (p) => {
          const next = new URLSearchParams(p)
          next.delete('edit')
          return next
        },
        { replace: true },
      ),
    [setParams],
  )
  if (lab && mode === 'ai') return <Navigate to={paths.shuttleViz(dashboardId)} replace />
  return (
    <div className="studio">
      <section className="studio-head">
        <div className="dash-title">
          <Link to={paths.home} className="dash-back mono-label" onClick={(e) => !leaveOk() && e.preventDefault()}>
            ← My dashboards
          </Link>
          <div className="eyebrow">
            <span className="tag">Studio</span>
            <span className="studio-model" title="Every chart in Studio reads the BCD Travel Analytics model. It can’t be changed here.">
              <span aria-hidden>▣</span> BCD Travel Analytics model · fixed
            </span>
          </div>
          {dashboardId && title && !foreign ? (
            <EditableTitle name={title} className="display studio-h1" onRename={rename} />
          ) : (
            <h1 className="display studio-h1">{dashboardId ? '\xA0' : newName.trim() || 'New dashboard'}</h1>
          )}
        </div>

        <div className="studio-modes" role="tablist" aria-label="How to build">
          {MODES.map((m) => (
            <button
              key={m.mode}
              type="button"
              role="tab"
              aria-selected={mode === m.mode}
              className={mode === m.mode ? 'studio-mode is-active' : 'studio-mode'}
              onClick={() => mode !== m.mode && go({ mode: m.mode })}
            >
              <span className="studio-mode-icon" aria-hidden>
                {m.icon}
              </span>
              <span className="studio-mode-text">
                <strong>{m.label}</strong>
                <span>{m.sub}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="studio-bar">
        <label className="studio-target">
          <span className="studio-bar-label">Dashboard</span>
          <select value={dashboardId ?? ''} onChange={(e) => go({ dashboard: e.target.value || null })} disabled={!dashboards && !listError}>
            <option value="">＋ New dashboard</option>
            {dashboards && dashboards.length > 0 && (
              <optgroup label="Yours">
                {dashboards.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {tileCount(d.tiles)}
                  </option>
                ))}
              </optgroup>
            )}
            {dashboardId && !current && dashboardId in created && <option value={dashboardId}>{created[dashboardId]}</option>}
            {foreign && <option value={dashboardId}>Unavailable dashboard</option>}
          </select>
        </label>
        {!dashboardId && (
          <label className="studio-name">
            <span className="studio-bar-label">Name</span>
            <input value={newName} placeholder="Untitled dashboard" maxLength={100} onChange={(e) => setNewName(e.target.value)} />
          </label>
        )}
        <span className="studio-bar-note">
          {listError
            ? 'Couldn\u2019t load your dashboards'
            : dashboardId
              ? 'Changes go to this dashboard'
              : mode === 'search'
                ? 'Created on your first pin'
                : 'Created when BCD AI starts'}
        </span>
        {dashboardId && !foreign && (
          <Link to={paths.view(dashboardId)} className="studio-open" onClick={(e) => !leaveOk() && e.preventDefault()}>
            Open dashboard <span aria-hidden>↗</span>
          </Link>
        )}
      </section>

      {checking ? (
        <div className="studio-blocked mono-label">Loading your dashboards…</div>
      ) : foreign ? (
        <div className="studio-blocked">
          <strong>This dashboard isn’t one of yours.</strong>
          <p>Studio only edits dashboards you created. Clone this one to edit your own copy, pick one of yours above, or start a new one.</p>
          <button type="button" className="btn-primary" onClick={() => void cloneForeign()} disabled={cloning}>
            {cloning ? 'Cloning\u2026' : '\u29C9 Clone & edit'}
          </button>
          {cloneError && <p className="pin-error">{cloneError}</p>}
        </div>
      ) : mode === 'search' ? (
        <SearchBuilder
          dashboardId={dashboardId}
          newName={newName}
          editVizId={editVizId}
          onCreated={onCreated}
          onChanged={refresh}
          onEditOpened={onEditOpened}
        />
      ) : (
        <ShuttleBuilder
          reloadKey={renamedAt}
          dashboardId={dashboardId}
          tiles={current?.tiles ?? null}
          newName={newName}
          onCreated={onCreated}
          onChanged={refresh}
          onDirtyChange={setDirty}
        />
      )}
    </div>
  )
}
export { Studio }
