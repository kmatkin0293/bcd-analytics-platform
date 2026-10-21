import { LABS_EXCLUDED_IDS, LABS_SHARED_IDS, MODEL_ID } from '../config'
class DashboardError extends Error {
  status
  code
  constructor(status, code) {
    super(
      code === 'other-model'
        ? 'That dashboard isn\u2019t built on the BCD Travel Analytics model, so Studio can\u2019t edit a copy of it.'
        : code === 'not-a-chart'
          ? 'That tile is a BCD AI insight, not a Search chart: edit it with BCD AI instead.'
          : status === 401
            ? 'Your analytics session has ended. Sign in again, then retry.'
            : status === 404
              ? 'That dashboard doesn\u2019t exist, or it isn\u2019t yours.'
              : status === 403
                ? 'Your account isn\u2019t allowed to do that.'
                : code === 'cluster-idle'
                  ? 'Analytics is waking up. Try again in a minute.'
                  : 'Analytics didn\u2019t answer. Try again.',
    )
    this.status = status
    this.code = code
  }
}
async function rest(method, path, body, init = {}) {
  let res
  try {
    // The app's own server adds the token; only a short list of paths is passed through.
    res = await fetch(`/api/ts-rest${path}`, {
      ...init,
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body === void 0 ? void 0 : JSON.stringify(body),
    })
  } catch {
    throw new DashboardError(502, 'unavailable')
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300)
    if (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 403) console.warn(`Analytics ${path} (${res.status}): ${detail}`)
    throw new DashboardError(res.status, res.status === 400 ? 'rejected' : 'unavailable')
  }
  if (res.status === 204) return void 0
  if (!res.headers.get('content-type')?.includes('json')) {
    const text = await res.text()
    throw new DashboardError(503, /idle screen|back up momentarily/i.test(text) ? 'cluster-idle' : 'unavailable')
  }
  return await res.json()
}
let me = null
function currentUser() {
  me ??= rest('GET', '/auth/session/user').catch((err) => {
    me = null
    throw err
  })
  return me
}
const ownedBy = (hit, userId) => hit.metadata_header?.author === userId
const toDashboard = (hit, userId) => ({
  id: hit.metadata_id,
  name: hit.metadata_name,
  description: hit.metadata_header?.description ?? '',
  created: hit.metadata_header?.created ?? null,
  modified: hit.metadata_header?.modified ?? null,
  tiles: hit.visualization_headers?.length ?? 0,
  charts: (hit.visualization_headers ?? []).map((v) => ({ id: v.id, name: v.name ?? 'Untitled chart', created: v.created ?? null })),
  author: hit.metadata_header?.authorDisplayName ?? '',
  owned: ownedBy(hit, userId),
})
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
async function readable(id) {
  if (!GUID.test(id)) throw new DashboardError(404, 'not-found')
  const [user, hits] = await Promise.all([
    currentUser(),
    rest('POST', '/metadata/search', {
      metadata: [{ identifier: id, type: 'LIVEBOARD' }],
      include_visualization_headers: true,
      record_size: 1,
    }).catch((err) => {
      if (err instanceof DashboardError && err.status < 500 && err.status !== 401) return []
      throw err
    }),
  ])
  const hit = hits[0]
  if (!hit) throw new DashboardError(404, 'not-found')
  return { hit, user }
}
async function owned(id) {
  const { hit, user } = await readable(id)
  if (!ownedBy(hit, user.id)) throw new DashboardError(404, 'not-found')
  return hit
}
async function listDashboards() {
  const user = await currentUser()
  const hits = await rest('POST', '/metadata/search', {
    metadata: [{ type: 'LIVEBOARD' }],
    created_by_user_identifiers: [user.name],
    include_visualization_headers: true,
    sort_options: { field_name: 'MODIFIED', order: 'DESC' },
    record_size: 200,
  })
  const onModel = new Set((await modelDashboards()).map((d) => d.id))
  return hits.filter((h) => ownedBy(h, user.id) && onModel.has(h.metadata_id) && !LABS_EXCLUDED_IDS.includes(h.metadata_id)).map((h) => toDashboard(h, user.id))
}
async function modelDashboards() {
  const res = await rest('POST', '/metadata/search', {
    metadata: [{ identifier: MODEL_ID }],
    include_dependent_objects: true,
    dependent_objects_record_size: 500,
    record_size: 1,
  })
  return res[0]?.dependent_objects?.[MODEL_ID]?.PINBOARD_ANSWER_BOOK ?? []
}
async function lookUp(ids) {
  if (!ids.length) return []
  const search = (batch) =>
    rest('POST', '/metadata/search', {
      metadata: batch.map((identifier) => ({ identifier, type: 'LIVEBOARD' })),
      include_visualization_headers: true,
      record_size: batch.length,
    })
  try {
    return await search(ids)
  } catch (err) {
    if (!(err instanceof DashboardError) || err.status >= 500 || err.status === 401) throw err
    return (await Promise.all(ids.map((id) => search([id]).catch(() => [])))).flat()
  }
}
async function listShared() {
  const [user, onModel] = await Promise.all([currentUser(), modelDashboards()])
  const ids = [...new Set(onModel.filter((d) => d.author !== user.id && (!LABS_EXCLUDED_IDS.includes(d.id) || LABS_SHARED_IDS.includes(d.id))).map((d) => d.id))]
  const hits = (await lookUp(ids)).filter((h) => !ownedBy(h, user.id))
  hits.sort((a, b) => (b.metadata_header?.modified ?? 0) - (a.metadata_header?.modified ?? 0))
  return hits.map((h) => toDashboard(h, user.id))
}
async function getDashboard(id) {
  const { hit, user } = await readable(id)
  return toDashboard(hit, user.id)
}
async function deleteDashboard(id) {
  await owned(id)
  await rest('POST', '/metadata/delete', { metadata: [{ identifier: id, type: 'LIVEBOARD' }] })
}
async function exportTml(id) {
  const exported = await rest('POST', '/metadata/tml/export', {
    metadata: [{ identifier: id, type: 'LIVEBOARD' }],
    export_fqn: true,
    edoc_format: 'JSON',
  })
  const tml = JSON.parse(exported[0]?.edoc ?? '{}')
  if (!tml.liveboard) throw new DashboardError(502, 'unavailable')
  return tml
}
async function importTml(tml, createNew = false) {
  const result = await rest('POST', '/metadata/tml/import', {
    metadata_tmls: [JSON.stringify(tml)],
    import_policy: 'ALL_OR_NONE',
    ...(createNew ? { create_new: true } : {}),
  })
  const response = result[0]?.response ?? {}
  if (response.status?.status_code === 'ERROR') {
    console.warn('TML import rejected:', response.status.error_message)
    throw new DashboardError(400, 'rejected')
  }
  return response
}
function clearDraftMarkers(tml) {
  for (const v of tml.liveboard.visualizations ?? []) {
    if (v.answer && isDraft(v.answer.description)) v.answer.description = ''
  }
}
async function editTml(id, edit) {
  await owned(id)
  const tml = await exportTml(id)
  edit(tml)
  clearDraftMarkers(tml)
  await importTml(tml)
}
function findTile(tml, vizId, title) {
  const vizs = tml.liveboard.visualizations ?? []
  const tile = vizs.find((v) => v.viz_guid === vizId) ?? (title ? vizs.findLast((v) => v.answer?.name === title) : void 0)
  if (!tile) throw new DashboardError(400, 'rejected')
  return tile
}
function findChart(tml, vizId, title) {
  const tile = findTile(tml, vizId, title)
  if (!tile.answer) throw new DashboardError(422, 'not-a-chart')
  return tile
}
const replaceTile = (id, vizId, answer, title) =>
  editTml(id, (tml) => {
    const tile = findChart(tml, vizId, title)
    const { guid: _guid, id: _id, description, ...rest2 } = answer
    const kept = (isDraft(description) ? tile.answer.description : description) ?? ''
    tile.answer = { ...rest2, name: title.trim().slice(0, 200), description: isDraft(kept) ? '' : kept }
  })
const removeTile = (id, vizId) =>
  editTml(id, (tml) => {
    const tile = findTile(tml, vizId)
    const lb = tml.liveboard
    lb.visualizations = lb.visualizations?.filter((v) => v !== tile)
    const keep = (tiles) => tiles?.filter((t) => t.visualization_id !== tile.id)
    if (lb.layout) {
      lb.layout.tiles = keep(lb.layout.tiles)
      lb.layout.tabs?.forEach((tab) => (tab.tiles = keep(tab.tiles)))
    }
  })
async function renameDashboard(id, name) {
  const trimmed = name.trim().slice(0, 100)
  if (!trimmed) throw new DashboardError(400, 'rejected')
  await editTml(id, (tml) => {
    tml.liveboard.name = trimmed
  })
  return getDashboard(id)
}
async function cloneDashboard(id, name) {
  const { hit } = await readable(id)
  if (!(await modelDashboards()).some((d) => d.id === id)) throw new DashboardError(422, 'other-model')
  const tml = await exportTml(id)
  delete tml.guid
  tml.liveboard.name = (name?.trim() || `Copy of ${hit.metadata_name}`).slice(0, 100)
  for (const v of tml.liveboard.visualizations ?? []) delete v.viz_guid
  clearDraftMarkers(tml)
  const newId = (await importTml(tml, true)).header?.id_guid
  if (!newId) throw new DashboardError(502, 'unavailable')
  return getDashboard(newId)
}
const DRAFT_DESCRIPTION = 'Editing in Studio \xB7 changes go straight to the dashboard'
const LEGACY_DRAFT_DESCRIPTION = 'BCD Studio: a working copy of a dashboard tile. Deleted when editing ends.'
const isDraft = (description) => description === DRAFT_DESCRIPTION || description === LEGACY_DRAFT_DESCRIPTION
const DRAFT_MAX_AGE_MS = 2 * 60 * 60 * 1e3
async function openDraft(id, vizId) {
  await owned(id)
  const tile = findChart(await exportTml(id), vizId)
  const title = tile.answer.name || 'Untitled chart'
  const answerId = (await importTml({ answer: { ...tile.answer, name: title, description: DRAFT_DESCRIPTION } }, true)).header?.id_guid
  if (!answerId) throw new DashboardError(502, 'unavailable')
  void sweepDrafts()
  return { answerId, title }
}
const deleteDraft = (answerId, keepalive = false) =>
  rest('POST', '/metadata/delete', { metadata: [{ identifier: answerId, type: 'ANSWER' }] }, { keepalive }).catch(() => {})
async function sweepDrafts() {
  try {
    const user = await currentUser()
    const hits = await rest('POST', '/metadata/search', {
      metadata: [{ type: 'ANSWER' }],
      created_by_user_identifiers: [user.name],
      sort_options: { field_name: 'MODIFIED', order: 'DESC' },
      record_size: 200,
    })
    const stale = hits.filter(
      (h) => ownedBy(h, user.id) && isDraft(h.metadata_header?.description) && (h.metadata_header?.modified ?? 0) < Date.now() - DRAFT_MAX_AGE_MS,
    )
    if (stale.length) await rest('POST', '/metadata/delete', { metadata: stale.map((h) => ({ identifier: h.metadata_id, type: 'ANSWER' })) })
  } catch (err) {
    console.warn('Sweeping Studio drafts failed', err)
  }
}
const DAY = 24 * 60 * 60 * 1e3
function formatEdited(ms, now = Date.now()) {
  if (!ms) return 'Never edited'
  const diff = now - ms
  if (diff < 6e4) return 'Edited just now'
  if (diff < 60 * 6e4) return `Edited ${Math.round(diff / 6e4)} min ago`
  if (diff < DAY && new Date(ms).getDate() === new Date(now).getDate()) return `Edited ${Math.round(diff / (60 * 6e4))} h ago`
  if (diff < 2 * DAY) return 'Edited yesterday'
  return `Edited ${new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
}
const tileCount = (n) => (n === 1 ? '1 chart' : `${n} charts`)
function titleFromQuery(query) {
  const tokens = [...query.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1].trim()).filter(Boolean)
  const unique = [...new Set(tokens)].map((t) => t.replace(/\b\w/g, (c) => c.toUpperCase()))
  if (!unique.length) return ''
  const [first, ...rest2] = unique
  return rest2.length ? `${first} by ${rest2.join(', ')}` : first
}
export {
  DashboardError,
  cloneDashboard,
  deleteDashboard,
  deleteDraft,
  formatEdited,
  getDashboard,
  listDashboards,
  listShared,
  openDraft,
  removeTile,
  renameDashboard,
  replaceTile,
  tileCount,
  titleFromQuery,
}
