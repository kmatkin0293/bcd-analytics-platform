import { Action } from '@thoughtspot/visual-embed-sdk'
import { CLIENT_FILTER } from '../config'

/** Scopes a dashboard embed to the portal's client. Module-level: a new array each render would reload the embed. */
export const CLIENT_FILTERS = [CLIENT_FILTER]

/** The model the builders work on, as named in prompts: it is the only data source Labs offers. */
export const MODEL_NAME = 'BCD Travel Analytics'

/**
 * Vendor-branded actions hidden from every dashboard in Labs, so the app reads as one product. The per-chart AI
 * button (Action.AskAi) stays, as "BCD AI"; AI Highlights stays too (the dashboard page triggers it).
 */
export const HIDDEN_BRANDED_ACTIONS = [Action.SpotterOnLiveboard, Action.SpotterViz, Action.SpotIQAnalyze]

// Editor toolbar in the BCD palette: navy outline, lavender hover. The SDK merges `customCSS` shallowly, so the
// shared variables the app sets in main.jsx are repeated here.
const CSS_VARIABLES = {
  '--ts-var-root-background': 'transparent',
  '--ts-var-liveboard-layout-background': 'transparent',
  '--ts-var-liveboard-header-background': 'transparent',
  '--ts-var-viz-border-radius': '14px',
  '--ts-var-root-font-family': 'Inter, system-ui, sans-serif',
  '--ts-var-button--primary-background': '#542DFF',
  '--ts-var-button--primary--hover-background': '#0B0052',
  '--ts-var-chip--active-background': '#EEEAFF',
  '--ts-var-chip--active-color': '#542DFF',
  '--ts-var-liveboard-tile-border-radius': '14px',
  '--ts-var-liveboard-edit-toolbar-border': '#0B0052',
  '--ts-var-liveboard-edit-toolbar-selected-background': '#0B0052',
  '--ts-var-liveboard-edit-toolbar-selected-text-color': '#FFFFFF',
  '--ts-var-liveboard-edit-toolbar-text': '#0B0052',
  '--ts-var-liveboard-edit-toolbar-hover-background': '#EEEAFF',
  '--ts-var-liveboard-edit-toolbar-hover-text-color': '#0B0052',
}

/** Per-embed customizations that keep the dashboard's header visible: the builders need its edit toolbar (Save, Cancel, BCD AI). */
export const WITH_LIVEBOARD_HEADER = { style: { customCSS: { variables: CSS_VARIABLES } } }
