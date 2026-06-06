/**
 * Centralised icon barrel — all Servicios components import from here.
 * Wraps lucide-react with tight defaults (size 16, strokeWidth 1.75).
 *
 *   pnpm add lucide-react
 *
 * Replace any icon by editing this one file.
 */
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  MapPin,
  Bell,
  MessageCircle,
  Briefcase,
  Store,
  Tag,
  ShoppingCart,
  Wrench,
  ArrowRight,
  Plus,
  Heart,
  Share2,
  Star,
  Check,
  Shield,
  ShieldCheck,
  Clock,
  Calendar,
  User,
  Hand,
  Send,
  SlidersHorizontal,
  Camera,
  Image as ImageIcon,
  Globe,
  X,
  TrendingUp,
  History,
  AlertTriangle,
  Pause,
  type LucideProps,
} from 'lucide-react';

/** Default size + stroke to match the design system (compact, B2B-flavor) */
const baseProps: Partial<LucideProps> = {
  size: 16,
  strokeWidth: 1.75,
};

export const Icon = {
  ChevL: (p: LucideProps) => <ChevronLeft {...baseProps} {...p} />,
  ChevR: (p: LucideProps) => <ChevronRight {...baseProps} {...p} />,
  ChevD: (p: LucideProps) => <ChevronDown {...baseProps} {...p} />,
  Search: (p: LucideProps) => <Search {...baseProps} {...p} />,
  Pin: (p: LucideProps) => <MapPin {...baseProps} {...p} />,
  Bell: (p: LucideProps) => <Bell {...baseProps} {...p} />,
  Chat: (p: LucideProps) => <MessageCircle {...baseProps} {...p} />,
  Briefcase: (p: LucideProps) => <Briefcase {...baseProps} {...p} />,
  Store: (p: LucideProps) => <Store {...baseProps} {...p} />,
  Tag: (p: LucideProps) => <Tag {...baseProps} {...p} />,
  Cart: (p: LucideProps) => <ShoppingCart {...baseProps} {...p} />,
  Tool: (p: LucideProps) => <Wrench {...baseProps} {...p} />,
  ArrowR: (p: LucideProps) => <ArrowRight {...baseProps} {...p} />,
  Plus: (p: LucideProps) => <Plus {...baseProps} {...p} />,
  Heart: (p: LucideProps) => <Heart {...baseProps} {...p} />,
  Share: (p: LucideProps) => <Share2 {...baseProps} {...p} />,
  Star: (p: LucideProps) => <Star {...baseProps} {...p} />,
  Check: (p: LucideProps) => <Check {...baseProps} {...p} />,
  Shield: (p: LucideProps) => <Shield {...baseProps} {...p} />,
  ShieldCheck: (p: LucideProps) => <ShieldCheck {...baseProps} {...p} />,
  Clock: (p: LucideProps) => <Clock {...baseProps} {...p} />,
  Calendar: (p: LucideProps) => <Calendar {...baseProps} {...p} />,
  User: (p: LucideProps) => <User {...baseProps} {...p} />,
  Hand: (p: LucideProps) => <Hand {...baseProps} {...p} />,
  Send: (p: LucideProps) => <Send {...baseProps} {...p} />,
  Filter: (p: LucideProps) => <SlidersHorizontal {...baseProps} {...p} />,
  Camera: (p: LucideProps) => <Camera {...baseProps} {...p} />,
  Image: (p: LucideProps) => <ImageIcon {...baseProps} {...p} />,
  Globe: (p: LucideProps) => <Globe {...baseProps} {...p} />,
  X: (p: LucideProps) => <X {...baseProps} {...p} />,
  Trending: (p: LucideProps) => <TrendingUp {...baseProps} {...p} />,
  History: (p: LucideProps) => <History {...baseProps} {...p} />,
  Alert: (p: LucideProps) => <AlertTriangle {...baseProps} {...p} />,
  Pause: (p: LucideProps) => <Pause {...baseProps} {...p} />,
  /**
   * WhatsApp doesn't ship in lucide. Inline SVG kept tight & themable via currentColor.
   */
  WhatsApp: ({ size = 18, className }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-1 1.2-.4.2-.7.1c-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1s0-.4.1-.6c.1-.1.3-.3.4-.5l.3-.4c.1-.2.1-.3 0-.4 0-.1-.7-1.7-1-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.4 1 2.8 1.2 3 2 3.1 4.9 4.4c.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4 0-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.7.4 3.4 1.3 4.8L2 22l5.3-1.4c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
    </svg>
  ),
};
