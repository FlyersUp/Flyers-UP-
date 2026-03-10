'use client';

/**
 * Icon component for notification types.
 * Uses lucide-react icons for Flyers Up design consistency.
 */

import {
  CheckCircle,
  XCircle,
  MessageCircle,
  AlertCircle,
  RotateCcw,
  DollarSign,
  Star,
  BadgeCheck,
  AlertTriangle,
  Clock,
  MapPin,
  PlayCircle,
  Calendar,
  Bell,
  LucideIcon,
} from 'lucide-react';
import { getIconForNotificationType, type NotificationIconName } from '@/lib/notifications/iconMap';

const ICON_MAP: Record<NotificationIconName, LucideIcon> = {
  'check-circle': CheckCircle,
  'x-circle': XCircle,
  'message-circle': MessageCircle,
  'alert-circle': AlertCircle,
  'rotate-ccw': RotateCcw,
  'dollar-sign': DollarSign,
  star: Star,
  'badge-check': BadgeCheck,
  'alert-triangle': AlertTriangle,
  clock: Clock,
  'map-pin': MapPin,
  'play-circle': PlayCircle,
  calendar: Calendar,
  default: Bell,
};

interface NotificationIconProps {
  type: string;
  className?: string;
  size?: number;
}

export function NotificationIcon({ type, className = '', size = 18 }: NotificationIconProps) {
  const iconName = getIconForNotificationType(type);
  const Icon = ICON_MAP[iconName] ?? ICON_MAP.default;
  return <Icon size={size} className={className} strokeWidth={1.75} aria-hidden />;
}
