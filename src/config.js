// Central place for ThoughtSpot object IDs and tab metadata.
// "BCD Travel Analytics" model and the Executive Overview liveboard.
export const MODEL_ID = '1a0d5e30-10dc-425d-b3cb-ec78c50edde6'
export const LIVEBOARD_ID = 'b5c9a423-2b24-4dae-be22-38ff28bac106'

// The client shown in the portal chrome. Every liveboard and Spotter embed carries CLIENT_FILTER as a runtime filter,
// and the server imports CLIENT_NAME to scope its own queries, so one edit here re-scopes the whole portal.
export const CLIENT_NAME = 'Siemens'
export const CLIENT_FILTER = { columnName: 'Client Name', operator: 'EQ', values: [CLIENT_NAME] }

// Analytics tabs. `liveboardId` (+ optional `id` tab) points at the embedded liveboard;
// `liveboardTabs` lists a liveboard's own tabs so the app can show them (its built-in tab bar is hidden); a tab without one shows
// a "coming soon" state until a liveboard is attached here.
export const TABS = [
  // Placeholder for now: no liveboard attached (it was `liveboardId: LIVEBOARD_ID`, tab 'd0abb3a3-0f64-4011-b1b7-48d33657a5e2').
  { slug: 'overview', name: 'Overview', icon: 'trending-up', customer: true,
    blurb: 'Travel spend, bookings, policy compliance and carbon at a glance',
    ask: 'Summarise our travel spend, bookings, out of policy rate and carbon emissions this month' },
  { slug: 'policy-compliance', liveboardId: '01e5f62f-3f92-4d08-8eec-f25dc2603998', name: 'Policy & Compliance',
    // The liveboard's own tabs, shown as a second tab bar in the app.
    liveboardTabs: [
      { name: 'Overview', id: 'c63415ca-658a-47f5-b1f3-430825cffc98' },
      { name: 'Root Cause Analysis', id: '7af098fd-31ff-442a-92e2-fd9e59a9de86' },
      { name: 'Financial Impact', id: '6020e5be-3897-41dc-ab89-791141816844' },
    ], icon: 'shield', customer: true,
    blurb: 'Out-of-policy bookings, violations and the drivers behind them',
    ask: 'Which departments and destinations have the highest out of policy rate, and why?' },
  { slug: 'spend-management', name: 'Spend Management', icon: 'dollar', customer: true,
    blurb: 'Spend by category, cost centre and supplier',
    ask: 'Where is our travel spend growing fastest and which cost centres drive it?' },
  { slug: 'sustainability', name: 'Sustainability', icon: 'leaf', customer: true,
    blurb: 'Carbon emissions by mode, route and traveller',
    ask: 'Which routes and travel types produce the most carbon emissions, and how is it trending?' },
  { slug: 'bookings-trips', name: 'Bookings & Trips', icon: 'plane', customer: true,
    blurb: 'Booking volumes, channels, lead times and trip patterns',
    ask: 'How do our bookings split by channel and advance booking window?' },
]

export const tabBySlug = (slug) => TABS.find((t) => t.slug === slug)

// Insight sections: live-data pages built from the booking model (see /api/data/insight/:slug on the server).
export const INSIGHTS = [
  { slug: 'savings-suppliers', name: 'Savings & Suppliers', icon: 'tag', eyebrow: 'Spend intelligence',
    blurb: 'Negotiated savings, supplier concentration and preferred-supplier usage' },
  { slug: 'traveller-safety', name: 'Traveller Safety', icon: 'life-buoy', eyebrow: 'Duty of care',
    blurb: 'Travellers exposed to storm-related disruption and where they are going' },
  { slug: 'disruption-rebooking', name: 'Disruption & Rebooking', icon: 'warn', eyebrow: 'Operations',
    blurb: 'Bookings that need rebooking, and the spend and suppliers involved' },
  { slug: 'cost-centres', name: 'Departments & Cost Centres', icon: 'building', eyebrow: 'Governance',
    blurb: 'Who is spending, on what, and how compliant they are' },
]
export const insightBySlug = (slug) => INSIGHTS.find((i) => i.slug === slug)

// Dimensions available as runtime filters on the liveboards.
export const FILTERS = {
  type: { label: 'Travel type', column: 'Travel Type', values: ['Air', 'Hotel', 'Rail', 'Car'] },
  channel: { label: 'Booking channel', column: 'Booking Channel', values: ['Online', 'Offline'] },
}

// Travel dimensions available for the home-page breakdown (values of the model's `Travel Type` / `Booking Channel`).
export const TRAVEL = {
  types: ['Air', 'Hotel', 'Rail', 'Car'],
  channels: ['Online', 'Offline'],
}

// Where "Book a trip" sends travellers. Placeholder until the real BCD booking tool URL is available.
export const BOOKING_TOOL_URL = 'https://www.bcdtravel.com/travel-management/platform/'
