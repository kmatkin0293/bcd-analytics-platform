import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LiveboardEmbed, useEmbedRef } from '@thoughtspot/visual-embed-sdk/react'
import { Action, HostEvent, CustomActionsPosition, CustomActionTarget } from '@thoughtspot/visual-embed-sdk'
import { FILTERS, CLIENT_FILTER, tabBySlug } from './config'
import { useToast } from './ui'
import { useAIChat } from './AIChat'
import { Icon } from './icons'

// The liveboard's "more" menu, rebuilt in the app because the liveboard's own header is hidden. `event` is a HostEvent the
// embed carries out itself; the rest are handled by the app.
const MORE_ACTIONS = [
  { id: 'notify', label: 'Notify travellers', icon: 'mail' },
  { id: 'copy', label: 'Copy link', icon: 'link' },
  { id: 'pdf', label: 'Download as PDF', icon: 'download', event: HostEvent.DownloadAsPdf },
  { id: 'pptx', label: 'Download as PowerPoint', icon: 'pptx' }, // built by the server: ThoughtSpot has no PowerPoint export
  { id: 'schedule', label: 'Schedule delivery', icon: 'schedule', event: HostEvent.Schedule },
  { id: 'schedules', label: 'Manage schedules', icon: 'clock', event: HostEvent.SchedulesList },
  { id: 'share', label: 'Share', icon: 'share', event: HostEvent.Share },
  { id: 'present', label: 'Present', icon: 'present', event: HostEvent.Present },
  { id: 'info', label: 'Liveboard details', icon: 'info', event: HostEvent.LiveboardInfo },
  { id: 'copyBoard', label: 'Copy liveboard', icon: 'copy', event: HostEvent.MakeACopy },
  { id: 'edit', label: 'Edit', icon: 'edit' }, // edit mode needs the liveboard header, so the app reloads the embed with it
]

// Spotter viz: the AI panel in the liveboard's edit mode (it must also be enabled on the ThoughtSpot cluster).
const SPOTTER_VIZ = {
  brandName: 'BCD AI',
  brandHeadline: "Hi, I'm",
  description: 'Ask me to build charts and insights for this liveboard.',
  inputChatPlaceholder: 'Ask a question about your travel data…',
  loaderHeadline: 'Building your charts…',
  liveboardBrandName: 'liveboard',
  spotterBrandName: 'BCD AI',
  insightTileBrandName: 'Insight tile',
}

const BASIC_DISABLED = [Action.DrillDown, Action.DrillExclude, Action.DrillInclude]

// ThoughtSpot custom actions (code-based): a "Notify travellers" button on the liveboard toolbar and in each chart's
// "More" menu. Clicking either opens the portal's email pop-up. Module-level so the SDK never sees a new config object.
const NOTIFY_ACTION_ID = 'notify-travellers'
const CUSTOM_ACTIONS = [
  { id: NOTIFY_ACTION_ID, name: 'Notify travellers', position: CustomActionsPosition.PRIMARY, target: CustomActionTarget.LIVEBOARD },
  { id: `${NOTIFY_ACTION_ID}-viz`, name: 'Notify travellers', position: CustomActionsPosition.MENU, target: CustomActionTarget.VIZ },
]

// The SDK copies frameParams.height into the iframe's min-height, so keep it small: fullHeight then
// grows the iframe to exactly the liveboard's content height, with no empty space underneath.
const FRAME_PARAMS = { height: '600px', width: '100%' }

// Always applied: scopes every liveboard to the portal's client.
const BASE_FILTERS = [CLIENT_FILTER]

// Which runtime filters make sense on which tab.
const TAB_FILTERS = {
  overview: ['type', 'channel'],
  'policy-compliance': ['type', 'channel'],
}

/** The liveboard embed for one tab, with live runtime filters and click-through to BCD AI. */
export function LiveboardTab({ slug, userType, showFilters = true, hideHeader = false, tabId }) {
  const tab = tabBySlug(slug)
  const embedRef = useEmbedRef()
  const toast = useToast()
  const chat = useAIChat()
  const [filters, setFilters] = useState({})
  const [openFilter, setOpenFilter] = useState(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [moreOpen, setMoreOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [editing, setEditing] = useState(false)
  const pendingEdit = useRef(false)
  const activeTab = tabId ?? tab.id // the liveboard tab to show: the app's sub-tab choice, else the tab's default
  const initialTab = useRef(activeTab) // fixed at mount so tab changes use SetActiveTab, not a reload
  const slugRef = useRef(`${slug}|${activeTab}`)

  // Non-fatal embed errors are only logged; surface a retry if it never finishes rendering.
  useEffect(() => {
    if (ready || error) return
    const timer = setTimeout(() => setError('The liveboard took too long to load.'), 60000)
    return () => clearTimeout(timer)
  }, [ready, error, reloadKey])

  // Switching tabs reloads the embed on the target tab (the SDK's in-place tab events don't take effect reliably).
  useEffect(() => {
    const key = `${slug}|${activeTab}`
    if (slugRef.current === key) return
    slugRef.current = key
    initialTab.current = activeTab
    setReady(false)
    setError(null)
    setReloadKey((k) => k + 1)
  }, [slug, activeTab])

  // Apply runtime filters whenever they change.
  useEffect(() => {
    if (!ready) return
    const active = Object.entries(filters).filter(([, v]) => v)
    if (active.length === 0) return
    // UpdateRuntimeFilters replaces the whole set, so the client scope is always re-sent.
    embedRef.current?.trigger(HostEvent.UpdateRuntimeFilters, [
      CLIENT_FILTER,
      ...active.map(([key, value]) => ({ columnName: FILTERS[key].column, operator: 'EQ', values: [value] })),
    ])
  }, [filters, ready, embedRef])

  const setFilter = (key, value) => {
    const next = { ...filters, [key]: value }
    setFilters(next)
    setOpenFilter(null)
    if (!value && Object.values(next).every((v) => !v)) {
      // Nothing left to filter on: reload for a clean, unfiltered liveboard.
      setReady(false)
      setReloadKey((k) => k + 1)
    }
  }

  // The SDK rebuilds the whole embed whenever an event handler changes identity, so every handler passed
  // to <LiveboardEmbed> must be stable. They read the latest toast/chat through a ref instead.
  const latest = useRef({})
  latest.current = { toast, chat }

  const onVizPointClick = useCallback((event) => {
    const { toast, chat } = latest.current
    const point = event?.data?.clickedPoint ?? event?.detail?.clickedPoint
    if (!point) return
    const attrs = (point.selectedAttributes || []).map((a) => `${a.column?.name}: ${a.value}`)
    const measures = (point.selectedMeasures || []).map((m) => `${m.column?.name}: ${typeof m.value === 'number' ? m.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : m.value}`)
    const summary = [...attrs, ...measures].join(' · ') || 'Data point selected'
    const question = `Tell me more about this data point and what is driving it: ${summary}`
    toast(summary, chat?.enabled ? { action: { label: 'Ask BCD AI', onClick: () => chat.openChat(question) }, duration: 8000 } : { duration: 5000 })
  }, [])

  const onCustomAction = useCallback((event) => {
    const id = (event?.data ?? event?.detail)?.id
    if (id === NOTIFY_ACTION_ID || id === `${NOTIFY_ACTION_ID}-viz`) latest.current.chat?.openNotify?.()
  }, [])

  useEffect(() => {
    if (!moreOpen) return undefined
    const close = (e) => { if (!e.target.closest?.('.filter-more')) setMoreOpen(false) }
    const esc = (e) => e.key === 'Escape' && setMoreOpen(false)
    document.addEventListener('mousedown', close)
    window.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('keydown', esc) }
  }, [moreOpen])

  const runMore = (a) => {
    setMoreOpen(false)
    if (a.id === 'notify') return chat?.openNotify?.()
    if (a.id === 'copy') {
      return navigator.clipboard?.writeText(window.location.href).then(() => toast('Link copied', { kind: 'success', duration: 2500 }), () => toast('Couldn\'t copy the link'))
    }
    if (a.id === 'pptx') return downloadPowerPoint()
    if (a.id === 'edit') return startEditing()
    return embedRef.current?.trigger(a.event)
  }

  /**
   * Edit mode lives in the liveboard's header (Save, Cancel, Add filter, Spotter viz), which the app normally hides. So reload
   * the embed with the header showing, then switch it into edit mode once it has rendered.
   */
  const startEditing = () => {
    pendingEdit.current = true
    setEditing(true)
    setReady(false)
    setReloadKey((k) => k + 1)
  }
  const stopEditing = () => {
    pendingEdit.current = false
    setEditing(false)
    setReady(false)
    setReloadKey((k) => k + 1)
  }

  /** Asks the server to build a deck from this tab's charts and saves the file. Takes about half a minute. */
  const downloadPowerPoint = async () => {
    if (exporting) return
    setExporting(true)
    toast('Building your PowerPoint. This takes about 30 seconds.', { duration: 8000 })
    try {
      const res = await fetch('/api/export/pptx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ liveboardId: tab.liveboardId, tabId: activeTab }) })
      if (!res.ok) throw new Error(`Export failed (${res.status})`)
      const name = /filename="(.+?)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'liveboard.pptx'
      const url = URL.createObjectURL(await res.blob())
      const link = Object.assign(document.createElement('a'), { href: url, download: name })
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
      toast('PowerPoint downloaded', { kind: 'success', duration: 4000 })
    } catch (err) {
      console.error(err)
      toast('Couldn\'t build the PowerPoint. Try again.')
    } finally {
      setExporting(false)
    }
  }

  const onRendered = useCallback(() => {
    setReady(true)
    if (pendingEdit.current) {
      pendingEdit.current = false
      setTimeout(() => embedRef.current?.trigger(HostEvent.Edit), 400)
    }
  }, [embedRef])
  const onEmbedError = useCallback((e) => console.warn('Liveboard embed warning', e?.data?.message || e?.message), [])

  const names = TAB_FILTERS[slug] || ['type']
  const activeCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="lb-wrap">
      {editing && (
        <div className="edit-banner" role="status">
          <Icon name="edit" size={16} />
          <span><strong>Editing this liveboard.</strong> Use Save or Cancel in the toolbar below, then choose Done to return to the normal view.</span>
          <button className="primary-btn sm" onClick={stopEditing}>Done</button>
        </div>
      )}
      {showFilters && (
        <div className="filter-bar">
          <span className="filter-label">Filters</span>
          {names.map((key) => {
            const f = FILTERS[key]
            const value = filters[key]
            return (
              <div className="filter-item" key={key}>
                <motion.button className={`filter-chip ${value ? 'on' : ''}`} onClick={() => setOpenFilter(openFilter === key ? null : key)} whileTap={{ scale: 0.95 }}>
                  <span className="dot" /> {f.label}{value ? `: ${value}` : ''} <span className="caret">▾</span>
                </motion.button>
                <AnimatePresence>
                  {openFilter === key && (
                    <motion.div className="filter-menu" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}>
                      <button className={!value ? 'sel' : ''} onClick={() => setFilter(key, null)}>All</button>
                      {f.values.map((v) => (
                        <button key={v} className={value === v ? 'sel' : ''} onClick={() => setFilter(key, v)}>{v}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
          <AnimatePresence>
            {activeCount > 0 && (
              <motion.button className="filter-clear" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => { setFilters({}); setReady(false); setReloadKey((k) => k + 1) }}>
                Clear {activeCount}
              </motion.button>
            )}
          </AnimatePresence>
          <div className="filter-item filter-more">
            <button className={`icon-btn more-btn ${moreOpen ? 'on' : ''}`} onClick={() => setMoreOpen((o) => !o)} disabled={!ready} aria-label="More actions" aria-haspopup="menu" aria-expanded={moreOpen} title="More actions">
              <Icon name="more" size={18} />
            </button>
            <AnimatePresence>
              {moreOpen && (
                <motion.div className="filter-menu right" role="menu" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}>
                  {MORE_ACTIONS.map((a) => (
                    <button key={a.id} role="menuitem" disabled={a.id === 'pptx' && exporting} onClick={() => runMore(a)}><Icon name={a.icon} size={15} /> {a.id === 'pptx' && exporting ? 'Building PowerPoint…' : a.label}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      <div className="lb-frame" style={{ minHeight: ready ? 0 : 600 }}>
        <AnimatePresence>
          {!ready && !error && (
            <motion.div className="lb-loading" exit={{ opacity: 0 }}>
              <div className="shimmer-grid">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="shimmer-card" style={{ animationDelay: `${i * 0.12}s` }} />)}
              </div>
              <div className="lb-loading-text"><span className="spinner" /> Loading {tab.name}…</div>
            </motion.div>
          )}
        </AnimatePresence>
        {error ? (
          <div className="lb-error">
            <h3>Couldn't load {tab.name}</h3>
            <p>{error}</p>
            <button className="primary-btn" onClick={() => { setError(null); setReady(false); setReloadKey((k) => k + 1) }}>Retry</button>
          </div>
        ) : (
          <LiveboardEmbed
            key={reloadKey}
            ref={embedRef}
            liveboardId={tab.liveboardId}
            {...(initialTab.current ? { activeTabId: initialTab.current } : {})}
            hideTabPanel
            hideLiveboardHeader={hideHeader && !editing}
            spotterViz={SPOTTER_VIZ}
            frameParams={FRAME_PARAMS}
            fullHeight
            onLiveboardRendered={onRendered}
            onVizPointClick={onVizPointClick}
            runtimeFilters={BASE_FILTERS}
            customActions={CUSTOM_ACTIONS}
            onCustomAction={onCustomAction}
            onError={onEmbedError}
            {...(userType === 'basic' ? { disabledActions: BASIC_DISABLED, disabledActionReason: 'Contact your BCD service agent to unlock this feature' } : { enable2ColumnLayout: false })}
          />
        )}
      </div>
    </div>
  )
}
