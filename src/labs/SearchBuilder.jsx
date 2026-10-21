import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Action, ContextType, HostEvent } from '@thoughtspot/visual-embed-sdk'
import { LiveboardEmbed, SearchEmbed, useEmbedRef } from '@thoughtspot/visual-embed-sdk/react'
import { chartMenu, EDIT_CHART, PINNED_CHART_HIDDEN_ACTIONS, pickedChartAction, REMOVE_CHART } from './chartActions'
import { DashboardError, deleteDraft, getDashboard, openDraft, removeTile, replaceTile, titleFromQuery } from './dashboards'
import { CLIENT_FILTERS, HIDDEN_BRANDED_ACTIONS } from './thoughtspot'
import { MODEL_ID } from '../config'
import { useFillHeight } from './useFillHeight'
import { DashboardMosaic } from './DashboardMosaic'
const SEARCH_HIDDEN_ACTIONS = [...HIDDEN_BRANDED_ACTIONS, Action.Pin, Action.ChooseDataSources]
const SEARCH_DISABLED_ACTIONS = [Action.ChooseDataSources]
const FILL_FRAME = { height: '100%', width: '100%' }
const SYNC_DELAY_MS = 1800
const time = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
async function currentAnswer(search) {
  const tml = await search.trigger(HostEvent.GetTML, void 0, ContextType.Search).catch(() => null)
  return tml?.answer ?? null
}
function pinned(res) {
  const r = res?.data ?? res
  const { liveboardId, vizId } = r ?? {}
  return liveboardId && vizId ? { liveboardId, vizId } : null
}
const answerKey = (answer, title) => JSON.stringify({ ...answer, name: title })
function SearchBuilder({ dashboardId, newName, editVizId, onCreated, onChanged, onEditOpened }) {
  const searchRef = useEmbedRef()
  const canvasRef = useEmbedRef()
  const [workspaceRef, workspaceHeight] = useFillHeight(560, 16)
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [source, setSource] = useState({ kind: 'new', n: 0 })
  const [opening, setOpening] = useState(null)
  const [openError, setOpenError] = useState(null)
  const [ready, setReady] = useState(false)
  const [hasQuery, setHasQuery] = useState(false)
  const [title, setTitle] = useState('')
  const [suggested, setSuggested] = useState('')
  const [linked, setLinked] = useState(null)
  const [liveSync, setLiveSync] = useState(true)
  const [sync, setSync] = useState({ kind: 'idle' })
  const [pinning, setPinning] = useState(false)
  const [pinError, setPinError] = useState(null)
  const [canvasKey, setCanvasKey] = useState(0)
  const [charts, setCharts] = useState(null)
  const [pinnedHere, setPinnedHere] = useState([])
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [removeError, setRemoveError] = useState(null)
  const linkedRef = useRef(linked)
  linkedRef.current = linked
  const liveSyncRef = useRef(liveSync)
  liveSyncRef.current = liveSync
  const syncedAnswer = useRef(null)
  const baselinePending = useRef(false)
  const settled = useRef({ kind: 'idle' })
  const draftId = useRef(null)
  const repinOnly = useRef(false)
  const timer = useRef(void 0)
  const syncing = useRef(false)
  const again = useRef(false)
  const openSeq = useRef(0)
  const mounted = useRef(true)
  const dropDraft = useCallback((keepalive = false) => {
    if (draftId.current) void deleteDraft(draftId.current, keepalive)
    draftId.current = null
  }, [])
  useEffect(() => {
    mounted.current = true
    const onHide = () => dropDraft(true)
    window.addEventListener('pagehide', onHide)
    return () => {
      mounted.current = false
      window.removeEventListener('pagehide', onHide)
      clearTimeout(timer.current)
      dropDraft()
    }
  }, [dropDraft])
  useEffect(() => {
    if (linkedRef.current && linkedRef.current.dashboardId !== dashboardId) {
      setLinked(null)
      setSync({ kind: 'idle' })
      setTitle('')
      if (draftId.current) {
        dropDraft()
        setSource((s) => ({ kind: 'new', n: s.kind === 'new' ? s.n + 1 : 0 }))
      }
    }
  }, [dashboardId, dropDraft])
  useEffect(() => {
    if (!dashboardId) {
      setCharts(null)
      return
    }
    let cancelled = false
    getDashboard(dashboardId)
      .then((d) => !cancelled && setCharts(d.charts))
      .catch(() => !cancelled && setCharts(null))
    return () => {
      cancelled = true
    }
  }, [dashboardId, canvasKey])
  const effectiveTitle = (title.trim() || suggested || 'Untitled chart').slice(0, 120)
  const chartName = (vizId) => charts?.find((c) => c.id === vizId)?.name ?? 'this chart'
  const syncNow = useCallback(
    async (opts = {}) => {
      const link = linkedRef.current
      const search = searchRef.current
      if (!link || !search) return
      if (syncing.current) {
        again.current = true
        return
      }
      syncing.current = true
      clearTimeout(timer.current)
      const tileTitle = opts.title ?? link.title
      try {
        const answer = await currentAnswer(search)
        if (!answer) throw new Error('Search has no chart to sync yet.')
        const key = answerKey(answer, tileTitle)
        if (!opts.force && key === syncedAnswer.current) {
          setSync((s) => (s.kind === 'pending' ? settled.current : s))
          return
        }
        setSync({ kind: 'syncing' })
        let how = 'in-place'
        try {
          if (repinOnly.current) throw new DashboardError(403, 'forbidden')
          await replaceTile(link.dashboardId, link.vizId, answer, tileTitle)
        } catch (err) {
          if (!(err instanceof DashboardError) || (err.status !== 403 && err.status !== 400)) throw err
          repinOnly.current = true
          how = 'repinned'
          const res = pinned(await search.trigger(HostEvent.Pin, { newVizName: tileTitle, liveboardId: link.dashboardId }, ContextType.Search))
          if (!res) throw new Error('Search didn\u2019t confirm the pin.')
          await canvasRef.current
            ?.trigger(HostEvent.Remove, { vizId: link.vizId }, ContextType.Liveboard)
            .catch(() => console.warn('Could not remove the previous version of the tile', link.vizId))
          const next = { ...link, vizId: res.vizId, title: tileTitle }
          linkedRef.current = next
          setLinked(next)
          setPinnedHere((p) => [...p.filter((v) => v !== link.vizId), res.vizId])
        }
        syncedAnswer.current = key
        if (tileTitle !== link.title && how === 'in-place') {
          const next = { ...link, title: tileTitle }
          linkedRef.current = next
          setLinked(next)
        }
        settled.current = { kind: 'synced', at: /* @__PURE__ */ new Date(), how }
        setSync(settled.current)
        setCanvasKey((k) => k + 1)
        onChanged()
      } catch (err) {
        console.error('Live tile update failed', err)
        setSync({ kind: 'error', message: err.message || 'The dashboard didn\u2019t update.' })
      } finally {
        syncing.current = false
        if (again.current) {
          again.current = false
          void syncNow()
        }
      }
    },
    [searchRef, canvasRef, onChanged],
  )
  const onSearchChanged = useCallback(() => {
    const search = searchRef.current
    if (!search || baselinePending.current) return
    currentAnswer(search).then((a) => {
      const q = a?.search_query ?? ''
      setHasQuery(!!q.trim())
      setSuggested(titleFromQuery(q))
    })
    if (!linkedRef.current || !liveSyncRef.current) return
    setSync({ kind: 'pending' })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => void syncNow(), SYNC_DELAY_MS)
  }, [searchRef, syncNow])
  const onLoad = useCallback(() => {
    if (!baselinePending.current) setReady(true)
  }, [])
  const onData = useCallback(() => {
    const search = searchRef.current
    if (!search || !baselinePending.current) return onSearchChanged()
    baselinePending.current = false
    currentAnswer(search).then((a) => {
      setReady(true)
      setHasQuery(!!a?.search_query?.trim())
      const link = linkedRef.current
      if (a && link) syncedAnswer.current = answerKey(a, link.title)
    })
  }, [searchRef, onSearchChanged])
  const unlink = () => {
    clearTimeout(timer.current)
    setLinked(null)
    linkedRef.current = null
    settled.current = { kind: 'idle' }
    setSync({ kind: 'idle' })
    setTitle('')
  }
  const startOver = () => {
    unlink()
    setHasQuery(false)
    setSuggested('')
    setOpenError(null)
    if (draftId.current) {
      dropDraft()
      setReady(false)
      setSource((s) => ({ kind: 'new', n: s.kind === 'new' ? s.n + 1 : 0 }))
    } else {
      searchRef.current?.trigger(HostEvent.ResetSearch)
    }
  }
  const editChart = async (vizId) => {
    if (!dashboardId || opening) return
    if (linkedRef.current?.vizId === vizId) {
      setDrawerOpen(true)
      return
    }
    if (linkedRef.current && sync.kind === 'pending') await syncNow()
    const seq = ++openSeq.current
    setOpening(vizId)
    setOpenError(null)
    setDrawerOpen(true)
    try {
      const draft = await openDraft(dashboardId, vizId)
      if (seq !== openSeq.current || !mounted.current) {
        void deleteDraft(draft.answerId)
        return
      }
      dropDraft()
      draftId.current = draft.answerId
      const link = { dashboardId, vizId, title: draft.title }
      clearTimeout(timer.current)
      linkedRef.current = link
      setLinked(link)
      setTitle(draft.title)
      setSuggested('')
      syncedAnswer.current = null
      baselinePending.current = true
      settled.current = { kind: 'idle' }
      setSync({ kind: 'idle' })
      setReady(false)
      setSource({ kind: 'draft', answerId: draft.answerId })
    } catch (err) {
      console.error('Opening the chart failed', err)
      setOpenError(
        err instanceof DashboardError && err.status === 403
          ? 'Your account can\u2019t open dashboard charts for editing (it needs TML access).'
          : err.message || 'The chart couldn\u2019t be opened.',
      )
    } finally {
      if (seq === openSeq.current) setOpening(null)
    }
  }
  const pin = async () => {
    const search = searchRef.current
    if (!search) return
    setPinning(true)
    setPinError(null)
    const tileTitle = effectiveTitle
    try {
      const target = dashboardId
        ? { newVizName: tileTitle, liveboardId: dashboardId }
        : {
            newVizName: tileTitle,
            newLiveboardName:
              newName.trim() || `Untitled dashboard \xB7 ${/* @__PURE__ */ new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
          }
      const res = pinned(await search.trigger(HostEvent.Pin, target, ContextType.Search))
      if (!res) throw new Error('Search didn\u2019t confirm the pin. Check the dashboard, then try again.')
      const answer = await currentAnswer(search)
      syncedAnswer.current = answer ? answerKey(answer, tileTitle) : null
      const link = { dashboardId: res.liveboardId, vizId: res.vizId, title: tileTitle }
      clearTimeout(timer.current)
      linkedRef.current = link
      setLinked(link)
      setTitle(tileTitle)
      setPinnedHere((p) => [...p, res.vizId])
      settled.current = { kind: 'synced', at: /* @__PURE__ */ new Date(), how: 'in-place' }
      setSync(settled.current)
      if (!dashboardId) onCreated(res.liveboardId)
      else setCanvasKey((k) => k + 1)
      onChanged()
    } catch (err) {
      console.error('Pin failed', err)
      setPinError(err.message || 'Pinning didn\u2019t work. Try again.')
    } finally {
      setPinning(false)
    }
  }
  const remove = async (vizId) => {
    if (!dashboardId) return
    setRemoving(vizId)
    setRemoveError(null)
    try {
      try {
        await removeTile(dashboardId, vizId)
      } catch (err) {
        if (!(err instanceof DashboardError) || (err.status !== 403 && err.status !== 400)) throw err
        const canvas = canvasRef.current
        if (!canvas) throw err
        await canvas.trigger(HostEvent.Remove, { vizId }, ContextType.Liveboard)
      }
      if (linkedRef.current?.vizId === vizId) startOver()
      setPinnedHere((p) => p.filter((v) => v !== vizId))
      setCharts((c) => c?.filter((x) => x.id !== vizId) ?? null)
      setCanvasKey((k) => k + 1)
      onChanged()
    } catch (err) {
      console.error('Removing the chart failed', err)
      setRemoveError(err.message || 'The chart couldn\u2019t be removed.')
    } finally {
      setRemoving(null)
      setConfirmRemove(null)
    }
  }
  const renameLinked = () => {
    if (linked && title.trim() && title.trim() !== linked.title) void syncNow({ force: true, title: title.trim().slice(0, 120) })
  }
  const menu = useMemo(() => (dashboardId ? chartMenu(dashboardId, { edit: 'Edit in Search', remove: 'Remove from dashboard' }) : []), [dashboardId])
  const chartAction = useRef(() => {})
  chartAction.current = (payload) => {
    const picked = pickedChartAction(payload, charts ?? [])
    if (!picked) return console.warn('Unrecognised chart action', payload)
    if (picked.action === EDIT_CHART) void editChart(picked.vizId)
    if (picked.action === REMOVE_CHART) setConfirmRemove(picked.vizId)
  }
  const onChartAction = useCallback((payload) => chartAction.current(payload), [])
  const openedFromUrl = useRef(null)
  useEffect(() => {
    if (!editVizId || !dashboardId || openedFromUrl.current === editVizId) return
    openedFromUrl.current = editVizId
    void editChart(editVizId)
    onEditOpened()
  }, [editVizId, dashboardId])
  const statusLine = (() => {
    if (!linked) return null
    switch (sync.kind) {
      case 'pending':
        return 'Changes spotted \xB7 updating in a moment'
      case 'syncing':
        return 'Updating the dashboard\u2026'
      case 'synced':
        return `Synced ${time(sync.at)}${sync.how === 'repinned' ? ' \xB7 re-pinned' : ''}`
      case 'error':
        return sync.message
      default:
        return liveSync ? 'Live: edits update the chart' : 'Paused: sync by hand'
    }
  })()
  const editingExisting = source.kind === 'draft' && !!linked
  const drawerTitle = opening ? 'Opening the chart\u2026' : editingExisting ? 'Editing a chart' : linked ? 'Linked chart' : 'New chart'
  return (
    <div className="studio-workspace" ref={workspaceRef} style={{ height: workspaceHeight }}>
      <section className={drawerOpen ? 'canvas is-drawer-open' : 'canvas'} aria-label="Dashboard">
        {dashboardId ? (
          <LiveboardEmbed
            runtimeFilters={CLIENT_FILTERS}
            key={`${dashboardId}:${canvasKey}`}
            ref={canvasRef}
            liveboardId={dashboardId}
            frameParams={FILL_FRAME}
            hiddenActions={PINNED_CHART_HIDDEN_ACTIONS}
            customActions={menu}
            onCustomAction={onChartAction}
          />
        ) : (
          <div className="canvas-empty">
            <DashboardMosaic seed={newName || 'new'} tiles={0} />
            <strong>Your dashboard appears here</strong>
            <span className="mono-label">Build a chart in Search, then pin it</span>
          </div>
        )}
      </section>

      <aside className={drawerOpen ? 'editor is-open' : 'editor'} aria-label="Search and pin" aria-hidden={!drawerOpen} inert={!drawerOpen}>
        <header className="editor-head">
          <span className={linked ? 'builder-step is-live' : 'builder-step'} aria-hidden>
            ⌕
          </span>
          <div className="editor-head-text">
            <strong>{drawerTitle}</strong>
            <span className="mono-label">{editingExisting ? linked.title : 'Pick columns or type \xB7 BCD Travel Analytics'}</span>
          </div>
          {(linked || source.kind === 'draft') && (
            <button type="button" className="btn-outline editor-new" onClick={startOver} title="Unlink and start a blank search">
              + New chart
            </button>
          )}
          <button
            type="button"
            className="editor-collapse"
            onClick={() => setDrawerOpen(false)}
            title="Hide Search to see the whole dashboard"
            aria-label="Hide Search"
          >
            «
          </button>
        </header>

        <div className="editor-body">
          <section className="editor-search">
            {(!ready || opening) && (
              <div className="builder-loading mono-label">{opening ? `Opening \u201C${chartName(opening)}\u201D\u2026` : 'Opening Search\u2026'}</div>
            )}
            <SearchEmbed
              key={source.kind === 'draft' ? source.answerId : `new-${source.n}`}
              ref={searchRef}
              frameParams={FILL_FRAME}
              dataSource={MODEL_ID}
              answerId={source.kind === 'draft' ? source.answerId : void 0}
              useLastSelectedSources={false}
              collapseDataPanel={false}
              hiddenActions={SEARCH_HIDDEN_ACTIONS}
              disabledActions={SEARCH_DISABLED_ACTIONS}
              disabledActionReason="Studio always uses the BCD Travel Analytics model"
              onLoad={onLoad}
              onQueryChanged={onSearchChanged}
              onData={onData}
              onAnswerChartSwitcher={onSearchChanged}
            />
          </section>

          <section className={linked ? 'editor-pin pin-card is-linked' : 'editor-pin pin-card'} aria-label="Pin to dashboard">
            <label className="pin-field">
              <span className="mono-label">Chart title</span>
              <input
                value={title}
                placeholder={suggested || 'e.g. Spend by Travel Type'}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={renameLinked}
                onKeyDown={(e) => e.key === 'Enter' && (linked ? renameLinked() : hasQuery && void pin())}
              />
            </label>

            {openError && (
              <p className="pin-error" role="alert">
                {openError}
              </p>
            )}

            {linked ? (
              <>
                <div className={`pin-status is-${sync.kind}`} aria-live="polite">
                  <span className="pin-status-dot" aria-hidden />
                  <span>{statusLine}</span>
                </div>
                <div className="pin-row">
                  <label className="pin-toggle">
                    <input type="checkbox" checked={liveSync} onChange={(e) => setLiveSync(e.target.checked)} />
                    <span className="pin-toggle-track" aria-hidden />
                    <span>Live sync</span>
                  </label>
                  <button type="button" className="btn-outline" onClick={() => void syncNow({ force: true })} disabled={sync.kind === 'syncing'}>
                    Sync now
                  </button>
                </div>
                <div className="pin-row">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => void pin()}
                    disabled={pinning || !hasQuery}
                    title="Keep the linked chart as it is and pin this search as another one"
                  >
                    {pinning ? 'Pinning\u2026' : '+ Pin as another chart'}
                  </button>
                  <button type="button" className="btn-outline" onClick={() => setDrawerOpen(false)} title="Hide Search to see the dashboard">
                    See dashboard
                  </button>
                </div>
              </>
            ) : (
              <>
                <button type="button" className="btn-primary pin-btn" onClick={() => void pin()} disabled={!ready || !hasQuery || pinning}>
                  {pinning ? 'Pinning\u2026' : dashboardId ? '\u2913 Pin to dashboard' : '\u2913 Pin & create dashboard'}
                </button>
                <p className="pin-hint">
                  {hasQuery
                    ? 'Once pinned, the chart stays linked: keep editing the search and the dashboard follows.'
                    : 'Pick columns on the left, or type a question. Columns come from the BCD Travel Analytics model only.'}
                </p>
              </>
            )}
            {pinError && (
              <p className="pin-error" role="alert">
                {pinError}
              </p>
            )}

            {!!charts?.length && (
              <div className="pin-session">
                <span className="mono-label">On this dashboard · {charts.length}</span>
                <ul>
                  {charts.map((c) => {
                    const isLinked = c.id === linked?.vizId
                    const isNew = !isLinked && pinnedHere.includes(c.id)
                    return (
                      <li key={c.id} className={isLinked ? 'is-linked' : void 0}>
                        <span className="pin-chart-name" title={c.name}>
                          {c.name}
                        </span>
                        {isLinked && <span className="pin-chart-tag">{editingExisting ? 'Editing' : 'Live'}</span>}
                        {isNew && <span className="pin-chart-tag is-new">New</span>}
                        {!isLinked && (
                          <button
                            type="button"
                            className="pin-chart-btn"
                            onClick={() => void editChart(c.id)}
                            disabled={!!opening || !!removing}
                            aria-label={`Edit ${c.name} in Search`}
                            title="Edit in Search"
                          >
                            ✎
                          </button>
                        )}
                        <button
                          type="button"
                          className="pin-chart-btn is-remove"
                          onClick={() => setConfirmRemove(c.id)}
                          disabled={!!removing}
                          aria-label={`Remove ${c.name} from the dashboard`}
                          title="Remove from the dashboard"
                        >
                          ×
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </section>
        </div>
      </aside>

      {!drawerOpen && (
        <button type="button" className="editor-rail" onClick={() => setDrawerOpen(true)} title="Show Search">
          <span className="editor-rail-icon" aria-hidden>
            »
          </span>
          <span className="editor-rail-label">{linked ? `Editing \xB7 ${linked.title}` : 'Search & pin'}</span>
          {linked && <span className={`editor-rail-dot is-${sync.kind}`} aria-hidden />}
        </button>
      )}

      {confirmRemove && (
        <div className="canvas-confirm" role="alertdialog" aria-label="Remove chart">
          <span>
            Remove <strong>“{chartName(confirmRemove)}”</strong> from the dashboard?
          </span>
          {removeError && <span className="canvas-confirm-error">{removeError}</span>}
          <div>
            <button type="button" className="btn-outline" onClick={() => (setConfirmRemove(null), setRemoveError(null))} disabled={!!removing}>
              Keep it
            </button>
            <button type="button" className="btn-primary" onClick={() => void remove(confirmRemove)} disabled={!!removing} autoFocus>
              {removing ? 'Removing\u2026' : 'Remove'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
export { SearchBuilder }
