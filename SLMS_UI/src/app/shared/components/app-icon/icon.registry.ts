import {
  Activity,
  AlertCircle,
  Archive,
  Armchair,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  BellDot,
  BellRing,
  BookOpen,
  BookText,
  BookUser,
  Box,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ChartArea,
  ChartColumn,
  ChartColumnBig,
  ChartColumnIncreasing,
  ChartNoAxesCombined,
  Camera,
  Check,
  CheckCircle2,
  CircleHelp,
  Cookie,
  CreditCard,
  Database,
  Download,
  Edit,
  Eye,
  EyeOff,
  FileClock,
  FileText,
  GitCompareArrows,
  GraduationCap,
  Group,
  HandCoins,
  History,
  IndianRupee,
  Info,
  Layers,
  LayoutDashboard,
  Library,
  LifeBuoy,
  ListChecks,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageSquareText,
  Moon,
  PanelLeft,
  Power,
  QrCode,
  RefreshCw,
  Save,
  Search,
  Settings,
  Share,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Tag,
  TriangleAlert,
  User,
  UserCheck,
  UserCog,
  UserLock,
  UserPlus,
  UserRoundCog,
  Users,
  UsersRound,
  X,
  type IconNode,
} from 'lucide';

/** Lucide icons used across SLMS (same set as Lovable / lucide-react). */
export const ICON_REGISTRY: Record<string, IconNode> = {
  'layout-dashboard': LayoutDashboard,
  'dashboard' : LayoutDashboard, // Lucide doesn't have a dashboard icon, so we reuse layout-dashboard,
  'summarize' : BookText , // Lucide doesn't have a summarize icon, so we reuse book-text
  'analytics' : ChartArea , // Lucide doesn't have an analytics icon, so we reuse chart-area
  'show_chart' : ChartColumn , // Lucide doesn't have a show_chart icon, so we reuse chart-column
  'download' : Download , // Lucide doesn't have a download icon, so we reuse download
  users: Users,
  armchair: Armchair,
  'calendar-check': CalendarCheck,
  'qr-code': QrCode,
  'qr': QrCode,
  'scan-line': QrCode,
  'camera': Camera,
  'building-2': Building2,
  layers: Layers,
  'credit-card': CreditCard,
  'bar-chart-3': BarChart3,
  bell: Bell,
  'book-open': BookOpen,
  'user-cog': UserCog,
  shield: Shield,
  settings: Settings,
  'life-buoy': LifeBuoy,
  'circle-help': CircleHelp,
  'panel-left': PanelLeft,
  search: Search,
  moon: Moon,
  sun: Sun,
  sparkles: Sparkles,
  user: User,
  'log-out': LogOut,
  'library' : Library, // Lucide doesn't have a library icon, so we reuse building-2
  'map-pin': MapPin , // Lucide doesn't have a map-pin icon, so we reuse building-2
  'power' : Power, // Lucide doesn't have a power icon, so we reuse log-out
  'check' : Check,
  'file-clock' : FileClock, // Lucide doesn't have a file-clock icon, so we reuse log-out
  'box' : Box, // Lucide doesn't have a box icon, so we reuse building-2,
  'group' : Group, // Lucide doesn't have a group icon, so we reuse users
  'user ' : Users, // Lucide doesn't have a users icon, so we reuse users
  'check_circle' : Check, // Lucide doesn't have a check_circle icon, so we reuse check
  'visibility' : Eye, // Lucide doesn't have a visibility icon, so we reuse eye
  'event_seat' : Armchair, // Lucide doesn't have a event_seat icon, so we reuse armchair
  'grid_view' : Layers, // Lucide doesn't have a grid_view icon, so we reuse layers
  'schedule' : CalendarClock, // Lucide doesn't have a schedule icon, so we reuse calendar-check
  'event_available' : CalendarCheck, // Lucide doesn't have a event_available icon, so we reuse calendar-check
  'subscriptions' : CreditCard, // Lucide doesn't have a subscriptions icon, so we reuse credit-card
  'event' : CalendarCheck, // Lucide doesn't have a event icon, so we reuse calendar-check
  'payments': HandCoins, // Lucide doesn't have a payments icon, so we reuse credit-card
  'receipt_long' : FileClock, // Lucide doesn't have a receipt_long icon, so we reuse file-clock
  'trending_up': ChartNoAxesCombined,
  'bar_chart' : ChartColumnIncreasing, // Lucide doesn't have a bar_chart icon, so we reuse chart-column-increasing
 'business' : Building2, // Lucide doesn't have a business icon, so we reuse building-2
 'chat' : MessageSquareText , // Lucide doesn't have a chat icon, so we reuse circle-help
 'notifications' : BellDot, // Lucide doesn't have a notifications icon, so we reuse bell-dot
 'help' : CircleHelp, // Lucide doesn't have a help icon, so we reuse circle-help
 'feedback' : MessageSquareText, // Lucide doesn't have a feedback icon, so we reuse circle-help
 'support' : LifeBuoy, // Lucide doesn't have a support icon, so we reuse life-buoy
 'alarm' : BellRing, // Lucide doesn't have an alarm icon, so we reuse bell
 'verified_user' : UserCheck, // Lucide doesn't have a verified_user icon, so we reuse user
 'admin_panel_settings' : UserRoundCog ,
 'lock' : UserLock, // Lucide doesn't have a lock icon, so we reuse user-round-cog
 'fact_check': ListChecks , // Lucide doesn't have a fact_check icon, so we reuse list-checks.
 'calendar_month' : CalendarDays, // Lucide doesn't have a calendar_month icon, so we reuse calendar-days
 'compare_arrows' : GitCompareArrows , // Lucide doesn't have a compare_arrows icon, so we reuse map-pin
 'UsersRound' : UsersRound,
 'user-round-cog' : UserRoundCog,
 'calendar' : Calendar,
 'shield-check' : ShieldCheck, // Lucide doesn't have a shield-check icon, so we reuse shield
 'badge-check' : BadgeCheck, // Lucide doesn't have a badge-check icon, so we reuse badge-check
 'file-text' : FileText, // Lucide doesn't have a file-text icon, so we reuse file-text
 'triangle-alert' : TriangleAlert, // Lucide doesn't have a triangle-alert icon, so we reuse triangle-alert
 'mail' : Mail, // Lucide doesn't have a mail icon, so we reuse message-square-text
 'arrow-right' : ArrowRight, // Lucide doesn't have an arrow-right icon, so we reuse arrow-right
 'database' : Database, // Lucide doesn't have a database icon, so we reuse database
 'alert-circle' : AlertCircle,
 'check-circle-2' : CheckCircle2,
 'user-plus' : UserPlus, // Lucide doesn't have a user-plus icon, so we reuse user-plus
 'cookie' : Cookie, // Lucide doesn't have a cookie icon, so we reuse cookie
 'archive' : Archive, // Lucide doesn't have an archive icon, so we reuse box
  'eye-off' : EyeOff, // Lucide doesn't have an eye-off icon, so we reuse eye
  'graduation-cap' : GraduationCap,
  'book-user' : BookUser, // Lucide doesn't have a book-user icon, so we reuse book-text
  'info' : Info, // Lucide doesn't have an info icon, so we reuse circle-help
  'indian-rupee' : IndianRupee, // Lucide doesn't have an indian-rupee icon, so we reuse credit-card
  'arrow-left' : ArrowLeft, // Lucide doesn't have an arrow-left icon, so we reuse arrow-left
  'pencil' : Edit, // Lucide doesn't have a pencil icon, so we reuse edit
  'activity' : Activity, // Lucide doesn't have an activity icon, so we reuse activity
  'chart-column-big' : ChartColumnBig,
  'history' : History,
  'save' : Save, // Lucide doesn't have a save icon, so we reuse check
  'refresh-cw': RefreshCw, // Lucide doesn't have a refresh-cw icon, so we reuse refresh-cw
  menu: Menu,
  x: X,
  close: X,
  tag: Tag,
  share: Share,
  smartphone: Smartphone,
};
