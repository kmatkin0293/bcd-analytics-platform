import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { HostEvent } from '@thoughtspot/visual-embed-sdk'
import { LiveboardEmbed, useEmbedRef } from '@thoughtspot/visual-embed-sdk/react'
import { AskShuttleBar } from './AskShuttleBar'
import { useAIChat } from '../AIChat'
import { EditableTitle } from './EditableTitle'
import { cloneDashboard, formatEdited, getDashboard, renameDashboard, tileCount } from './dashboards'
import { chartMenu, EDIT_CHART, PINNED_CHART_HIDDEN_ACTIONS, pickedChartAction } from './chartActions'
import { usePaths } from './experience'
import { CLIENT_FILTERS } from './thoughtspot'
function questionsFor(d) {
  const tiles = d.charts.slice(0, 2).map((c) => c.name)
  const questions = tiles.map((t) => `What is driving the latest change in \u201C${t}\u201D?`)
  questions.push('Which departments and destinations stand out on this dashboard, and why?')
  if (questions.length < 3) questions.push('What changed most versus the previous month?')
  return questions.slice(0, 3)
}
function DashboardView() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const paths = usePaths()
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState(null)
  const [rendered, setRendered] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [cloneError, setCloneError] = useState(null)
  const embedRef = useEmbedRef()
  useEffect(() => {
    let cancelled = false
    // A different dashboard starts from a blank page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDashboard(null)
    setError(null)
    setRendered(false)
    getDashboard(id)
      .then((d) => !cancelled && setDashboard(d))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [id])
  const onRendered = useCallback(() => setRendered(true), [])
  const owned = !!dashboard?.owned
  const menu = useMemo(() => (owned ? chartMenu(id, { edit: 'Edit in Studio' }) : []), [id, owned])
  const chartsRef = useRef([])
  useEffect(() => {
    chartsRef.current = dashboard?.charts ?? []
  }, [dashboard])
  const onChartAction = useCallback(
    (payload) => {
      const picked = pickedChartAction(payload, chartsRef.current)
      if (picked?.action === EDIT_CHART) navigate(paths.editChart(id, picked.vizId))
      else console.warn('Unrecognised chart action', payload)
    },
    [id, navigate, paths],
  )
  const clone = async () => {
    setCloning(true)
    setCloneError(null)
    try {
      const copy = await cloneDashboard(id)
      navigate(paths.search(copy.id))
    } catch (err) {
      setCloneError(err.message)
      setCloning(false)
    }
  }
  const { openChat, streaming } = useAIChat()
  const askAI = (question) =>
    dashboard &&
    openChat(
      `I'm looking at ${dashboard.owned ? 'my own dashboard' : `${dashboard.author || 'a colleague'}'s dashboard`} "${dashboard.name}"` +
        (dashboard.charts.length ? `, with these charts: ${dashboard.charts.map((c) => c.name).join('; ')}. ` : '. ') +
        question,
    )
  if (error) {
    return (
      <div className="dashboards">
        <section className="dash-head">
          <div className="dash-title">
            <Link to={paths.home} className="dash-back mono-label">
              ← My dashboards
            </Link>
            <h1 className="display dash-h1">Not found</h1>
            <p className="dash-lede">{error}</p>
          </div>
        </section>
      </div>
    )
  }
  return (
    <div className="dashboards">
      <section className="dash-head">
        <div className="dash-title">
          <Link to={paths.home} className="dash-back mono-label">
            ← My dashboards
          </Link>
          <div className="eyebrow">
            <span className="tag">{dashboard && !dashboard.owned ? 'Shared with you' : 'Dashboard'}</span>
            <span>
              {dashboard
                ? [!dashboard.owned && dashboard.author && `By ${dashboard.author}`, tileCount(dashboard.tiles), formatEdited(dashboard.modified)]
                    .filter(Boolean)
                    .join(' \xB7 ')
                : 'Loading\u2026'}
            </span>
          </div>
          {dashboard && !dashboard.owned ? (
            <h1 className="display dash-h1 is-name">{dashboard.name}</h1>
          ) : dashboard ? (
            <EditableTitle name={dashboard.name} className="display dash-h1 is-name" onRename={async (name) => setDashboard(await renameDashboard(id, name))} />
          ) : (
            <h1 className="display dash-h1 is-name">{'\xA0'}</h1>
          )}
          {dashboard?.description && <p className="dash-lede">{dashboard.description}</p>}
        </div>
        <div className="dash-actions">
          <button
            type="button"
            className="btn-outline btn-ai"
            onClick={() => embedRef.current?.trigger(HostEvent.AIHighlights)}
            disabled={!rendered || !dashboard?.tiles}
            title="AI highlights for this dashboard"
          >
            <span aria-hidden>✦</span> BCD AI Highlights
          </button>
          {owned && (
            <>
              <button type="button" className="btn-outline" onClick={() => navigate(paths.search(id))}>
                ⌕ Edit with Search
              </button>
              <button type="button" className="btn-outline" onClick={() => navigate(paths.shuttleViz(id))}>
                ✦ Edit with BCD AI
              </button>
            </>
          )}
          <button
            type="button"
            className={owned ? 'btn-primary' : 'btn-outline'}
            onClick={() => embedRef.current?.trigger(HostEvent.DownloadAsPdf)}
            disabled={!rendered || !dashboard?.tiles}
          >
            Download PDF
          </button>
          {dashboard && !owned && (
            <button type="button" className="btn-primary" onClick={() => void clone()} disabled={cloning} title="Make your own copy and edit it in Studio">
              {cloning ? 'Cloning\u2026' : '\u29C9 Clone & edit'}
            </button>
          )}
        </div>
        {cloneError && (
          <p className="dash-notice is-error dash-clone-error" role="alert">
            {cloneError}
          </p>
        )}
      </section>

      {dashboard && !!dashboard.tiles && <AskShuttleBar scope={dashboard.name} questions={questionsFor(dashboard)} onAsk={askAI} busy={streaming} />}

      <section className="dash-body">
        <div className="dash-frame">
          {dashboard && dashboard.tiles === 0 ? (
            <div className="dash-blank">
              <strong>This dashboard is empty.</strong>
              <p>{owned ? 'Add a first chart with Search, or ask BCD AI to draft the whole thing.' : 'Nothing has been added to it yet.'}</p>
              <div className="dash-blank-actions" hidden={!owned}>
                <button type="button" className="btn-primary" onClick={() => navigate(paths.search(id))}>
                  Add a chart with Search
                </button>
                <button type="button" className="btn-outline" onClick={() => navigate(paths.shuttleViz(id))}>
                  ✦ Draft it with BCD AI
                </button>
              </div>
            </div>
          ) : (
            dashboard && (
              <div className="dash-embed">
                <LiveboardEmbed
                  key={id}
                  ref={embedRef}
                  liveboardId={id}
                  hiddenActions={PINNED_CHART_HIDDEN_ACTIONS}
                  customActions={menu}
                  onCustomAction={onChartAction}
                  runtimeFilters={CLIENT_FILTERS}
                  updatedSpotterChatPrompt
                  hideLiveboardHeader
                  fullHeight
                  minimumHeight={640}
                  onLiveboardRendered={onRendered}
                />
              </div>
            )
          )}
        </div>
      </section>
    </div>
  )
}
export { DashboardView }
