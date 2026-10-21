import { Action, CustomActionsPosition, CustomActionTarget } from '@thoughtspot/visual-embed-sdk'
import { HIDDEN_BRANDED_ACTIONS } from './thoughtspot'
const EDIT_CHART = 'bcd-edit-chart'
const REMOVE_CHART = 'bcd-remove-chart'
const PINNED_CHART_HIDDEN_ACTIONS = [...HIDDEN_BRANDED_ACTIONS, Action.Edit, Action.EditACopy, Action.CopyAndEdit, Action.DrillEdit, Action.Remove]
function chartMenu(liveboardId, items) {
  const scope = { metadataIds: { liveboardIds: [liveboardId] } }
  return [
    { id: EDIT_CHART, name: items.edit, position: CustomActionsPosition.MENU, target: CustomActionTarget.VIZ, ...scope },
    ...(items.remove ? [{ id: REMOVE_CHART, name: items.remove, position: CustomActionsPosition.MENU, target: CustomActionTarget.VIZ, ...scope }] : []),
  ]
}
function pickedChartAction(payload, charts) {
  const p = payload ?? {}
  const action = p.data?.id ?? p.id
  if (!action) return null
  const direct = p.data?.vizId ?? p.vizId
  if (direct) return { action, vizId: direct }
  const answer = p.data?.embedAnswerData
  const created = Number(answer?.metadata?.createdAt)
  const named = charts.filter((c) => c.name === answer?.name)
  const chart = named.find((c) => c.created === created) ?? (named.length === 1 ? named[0] : void 0)
  return chart ? { action, vizId: chart.id } : null
}
export { EDIT_CHART, PINNED_CHART_HIDDEN_ACTIONS, REMOVE_CHART, chartMenu, pickedChartAction }
