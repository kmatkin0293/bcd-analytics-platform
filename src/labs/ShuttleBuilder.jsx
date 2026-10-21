import { useCallback, useEffect, useRef, useState } from 'react'
import { Action, ContextType, HostEvent } from '@thoughtspot/visual-embed-sdk'
import { LiveboardEmbed, SearchEmbed, useEmbedRef } from '@thoughtspot/visual-embed-sdk/react'
import { HIDDEN_BRANDED_ACTIONS, MODEL_NAME, WITH_LIVEBOARD_HEADER } from './thoughtspot'
import { CLIENT_NAME, LABS_BRIEFS, MODEL_ID } from '../config'
import { useFillHeight } from './useFillHeight'
const MODEL_INSTRUCTION = `Use only the "${MODEL_NAME}" model, and filter every chart to Client Name = ${CLIENT_NAME}.`
const withModel = (prompt) => `${prompt.trim()} ${MODEL_INSTRUCTION}`
const SPOTTER_VIZ = {
  brandName: 'BCD AI',
  // This cluster's welcome screen shows the headline but not brandName after it
  // (brandName still labels the toolbar button), so the name goes in the headline.
  brandHeadline: 'Hi! I\u2019m BCD AI',
  description: 'Tell me what this dashboard should show. I\u2019ll build the charts from your BCD Travel Analytics data, and refine them as we go.',
  inputChatPlaceholder: 'Describe a chart, or a change to one\u2026',
  loaderHeadline: 'Building your dashboard\u2026',
  loaderTips: [
    { label: 'Tip', text: 'Name the measure and the breakdown, e.g. \u201Cspend by travel type\u201D.' },
    { label: 'Tip', text: 'Ask for a change to any tile: \u201Cmake the trend weekly\u201D.' },
    { label: 'Tip', text: 'Save when you like the result: changes stay a draft until then.' },
  ],
  liveboardBrandName: 'dashboard',
  spotterBrandName: 'BCD AI',
  insightTileBrandName: 'BCD AI insight',
  insightTileViewPlanLabel: 'How BCD AI built this',
  insightTileLoaderText: 'BCD AI is working\u2026',
  customStarterPrompts: LABS_BRIEFS.map((b) => ({ id: b.id, displayText: b.summary, fullPrompt: withModel(b.prompt) })),
}
const STUDIO_HIDDEN_ACTIONS = HIDDEN_BRANDED_ACTIONS.filter((a) => a !== Action.SpotterViz)
const SEED_SEARCH = { searchTokenString: `[Booking Amount (GBP)] [Booking Date].'last 12 months' [Client Name] = '${CLIENT_NAME}'`, executeSearch: true }
const SEED_TITLE = 'Spend \xB7 last 12 months'
const SEED_FRAME = { height: '600px', width: '900px' }
const CANVAS_FRAME = { height: '100%', width: '100%' }
function ShuttleBuilder({ dashboardId, tiles, reloadKey, newName, onCreated, onChanged, onDirtyChange }) {
  const [seeded, setSeeded] = useState([])
  if (!dashboardId) return <ShuttleBrief newName={newName} onCreated={onCreated} />
  if (tiles === 0 && !seeded.includes(dashboardId)) {
    return (
      <StarterTile
        target={{ liveboardId: dashboardId }}
        onPinned={() => {
          setSeeded((s) => [...s, dashboardId])
          onChanged()
        }}
        onFailed={() => setSeeded((s) => [...s, dashboardId])}
      >
        <div className="studio-blocked mono-label">Setting this dashboard up on the BCD Travel Analytics model…</div>
      </StarterTile>
    )
  }
  return <ShuttleCanvas key={`${dashboardId}:${reloadKey}`} dashboardId={dashboardId} onChanged={onChanged} onDirtyChange={onDirtyChange} />
}
function StarterTile({ target, onPinned, onFailed, children }) {
  const seedRef = useEmbedRef()
  const pinnedOnce = useRef(false)
  const latest = useRef({ target, onPinned, onFailed })
  latest.current = { target, onPinned, onFailed }
  const onSeedData = useCallback(async () => {
    const seed = seedRef.current
    if (!seed || pinnedOnce.current) return
    pinnedOnce.current = true
    const { target: target2, onPinned: onPinned2, onFailed: onFailed2 } = latest.current
    try {
      const res = await seed.trigger(HostEvent.Pin, { newVizName: SEED_TITLE, ...target2 }, ContextType.Search)
      const r = res?.data ?? res
      if (!r?.liveboardId) throw new Error('No dashboard ID came back.')
      onPinned2(r.liveboardId)
    } catch (err) {
      console.error('Pinning the starter tile failed', err)
      onFailed2(err)
    }
  }, [seedRef])
  return (
    <>
      {children}
      <div className="seed-search" aria-hidden>
        <SearchEmbed
          ref={seedRef}
          frameParams={SEED_FRAME}
          dataSource={MODEL_ID}
          hideDataSources
          useLastSelectedSources={false}
          searchOptions={SEED_SEARCH}
          onData={onSeedData}
        />
      </div>
    </>
  )
}
const pendingBriefs = /* @__PURE__ */ new Map()
function ShuttleBrief({ newName, onCreated }) {
  const [brief, setBrief] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const submit = (e) => {
    e.preventDefault()
    if (!brief.trim() || creating) return
    setError(null)
    setCreating(true)
  }
  return (
    <div className="builder is-shuttle">
      <section className="brief" aria-label="Brief BCD AI">
        <header className="brief-head">
          <span className="shuttle-pill is-large" aria-hidden />
          <div>
            <h2 className="brief-h2">What should this dashboard show?</h2>
            <p>
              Write it the way you’d brief an analyst. BCD AI drafts the charts from the BCD Travel Analytics data, then you refine them by chatting, and save
              when it looks right.
            </p>
          </div>
        </header>
        <form className="brief-form" onSubmit={submit}>
          <textarea
            value={brief}
            rows={4}
            maxLength={1e3}
            placeholder="e.g. A monthly view for the travel manager: spend vs last year by travel type, the departments with the highest out of policy rate, and top destinations."
            onChange={(e) => setBrief(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e)
            }}
            disabled={creating}
          />
          <div className="brief-foot">
            <span className="mono-label">{creating ? 'Creating the dashboard\u2026' : '\u2318 + Enter to start'}</span>
            <button type="submit" className="btn-primary" disabled={!brief.trim() || creating}>
              {creating ? 'Starting BCD AI\u2026' : '\u2726 Build it with BCD AI'}
            </button>
          </div>
        </form>
        {error && (
          <p className="pin-error" role="alert">
            {error}
          </p>
        )}
        <div className="brief-starters">
          <span className="mono-label">Or start from</span>
          <div className="brief-starter-list">
            {LABS_BRIEFS.map((b) => (
              <button key={b.id} type="button" className="brief-starter" onClick={() => setBrief(b.prompt)} disabled={creating}>
                <strong>{b.label}</strong>
                <span>{b.prompt}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {creating && (
        <StarterTile
          target={{ newLiveboardName: newName.trim() || 'Untitled dashboard' }}
          onPinned={(id) => {
            pendingBriefs.set(id, withModel(brief))
            onCreated(id)
          }}
          onFailed={() => {
            setError('BCD Analytics couldn\u2019t create the dashboard. Try again, or start it with Search.')
            setCreating(false)
          }}
        />
      )}
    </div>
  )
}
function ShuttleCanvas({ dashboardId, onChanged, onDirtyChange }) {
  const embedRef = useEmbedRef()
  const [canvasRef, canvasHeight] = useFillHeight(560, 40)
  const [dirty, setDirty] = useState(false)
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])
  const onRendered = useCallback(() => {
    const embed = embedRef.current
    if (!embed) return
    embed.trigger(HostEvent.Edit, {}, ContextType.Liveboard).catch(() => {})
    setTimeout(() => embed.trigger(HostEvent.OpenSpotterVizPanel).catch(() => {}), 600)
  }, [embedRef])
  const onVizInit = useCallback(() => {
    const brief = pendingBriefs.get(dashboardId)
    if (brief) {
      pendingBriefs.delete(dashboardId)
      embedRef.current?.trigger(HostEvent.SpotterVizSendUserMessage, { query: brief }).catch(() => {})
    }
  }, [dashboardId, embedRef])
  const onResponse = useCallback(() => setDirty(true), [])
  const onSaved = useCallback(() => {
    setDirty(false)
    onChanged()
  }, [onChanged])
  return (
    <div className="builder is-shuttle">
      <section className="dash-body is-flush">
        <div className="dash-frame">
          {/* A fixed, viewport-tall frame (not full height): the BCD AI panel lives
       inside it, and its chat box has to stay on screen. */}
          <div className="shuttle-canvas" ref={canvasRef} style={{ height: canvasHeight }}>
            <LiveboardEmbed
              ref={embedRef}
              liveboardId={dashboardId}
              hiddenActions={STUDIO_HIDDEN_ACTIONS}
              customizations={WITH_LIVEBOARD_HEADER}
              spotterViz={SPOTTER_VIZ}
              showLiveboardTitle={false}
              frameParams={CANVAS_FRAME}
              onLiveboardRendered={onRendered}
              onSpotterVizInit={onVizInit}
              onSpotterVizResponseComplete={onResponse}
              onSave={onSaved}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
export { LABS_BRIEFS, ShuttleBuilder }
