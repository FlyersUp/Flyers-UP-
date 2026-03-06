'use client';

import {
  Home,
  Bell,
  MessageCircle,
  Settings,
  IdCard,
  Building2,
  Calendar,
  CreditCard,
  Star,
  User,
  MapPin,
  ShieldCheck,
  FileText,
  Plus,
  type LucideIcon,
} from 'lucide-react';

export type AppIconName =
  | 'home'
  | 'bell'
  | 'chat'
  | 'settings'
  | 'id-card'
  | 'building'
  | 'calendar'
  | 'credit-card'
  | 'star'
  | 'user'
  | 'map-pin'
  | 'safety-check'
  | 'file-text'
  | 'plus';

const ICON_MAP: Record<AppIconName, LucideIcon> = {
  home: Home,
  bell: Bell,
  chat: MessageCircle,
  settings: Settings,
  'id-card': IdCard,
  building: Building2,
  calendar: Calendar,
  'credit-card': CreditCard,
  star: Star,
  user: User,
  'map-pin': MapPin,
  'safety-check': ShieldCheck,
  'file-text': FileText,
  plus: Plus,
};

export function AppIcon({
  name,
  size = 20,
  className = '',
  alt,
}: {
  name: AppIconName;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const Icon = ICON_MAP[name] ?? Bell;
  return (
    <Icon
      size={size}
      className={['inline-block shrink-0', 'opacity-90', className].join(' ')}
      aria-hidden={!alt}
      aria-label={alt}
    />
  );
}
