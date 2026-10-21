import {
  Package, Truck, Gauge, Leaf, ClipboardList, BarChart3, Home, LayoutDashboard, Sparkles, Plus, CalendarDays,
  CheckCircle2, Wrench, Search, Bell, HelpCircle, Settings, MapPin, User, ShieldCheck, Lock, RefreshCw, TrendingUp,
  AlertTriangle, Info, DollarSign, Check, X, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, ArrowRight, RotateCcw, XCircle, FileText, Boxes, Plane, ExternalLink, Copy, Pencil, FileDown, MoreHorizontal, Link2, Download, Clock, Share2, Presentation, CalendarClock, Send, Mail, Tag, Building2, LifeBuoy,
} from 'lucide-react'

const ICONS = {
  package: Package, truck: Truck, gauge: Gauge, leaf: Leaf, clipboard: ClipboardList, chart: BarChart3, home: Home,
  dashboard: LayoutDashboard, sparkles: Sparkles, plus: Plus, calendar: CalendarDays, 'check-circle': CheckCircle2,
  wrench: Wrench, search: Search, bell: Bell, help: HelpCircle, settings: Settings, pin: MapPin, user: User,
  shield: ShieldCheck, lock: Lock, refresh: RefreshCw, 'trending-up': TrendingUp, warn: AlertTriangle, info: Info,
  check: Check, x: X, 'chevron-right': ChevronRight, 'chevron-left': ChevronLeft, 'chevron-down': ChevronDown, 'chevron-up': ChevronUp, ChevronUp, arrow: ArrowRight, reset: RotateCcw,
  dollar: DollarSign, 'x-circle': XCircle, file: FileText, boxes: Boxes, plane: Plane, send: Send, mail: Mail, external: ExternalLink, tag: Tag, building: Building2, 'life-buoy': LifeBuoy,
}

/** Consistent SVG icon set (Lucide) — replaces emoji across the UI. */
export function Icon({ name, size = 18, className = '', strokeWidth = 1.9 }) {
  const Cmp = ICONS[name]
  if (!Cmp) return null
  return <Cmp size={size} strokeWidth={strokeWidth} className={`ico ${className}`} aria-hidden="true" />
}
