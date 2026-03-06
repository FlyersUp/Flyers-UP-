/**
 * Occupation icon mapping - lucide-react icons by slug
 */
import type { LucideIcon } from 'lucide-react';
import {
  Briefcase,
  Camera,
  CalendarCheck,
  Car,
  ChefHat,
  Dog,
  Dumbbell,
  GraduationCap,
  Hammer,
  Laptop,
  Layers,
  Music,
  Paintbrush,
  Scissors,
  Snowflake,
  Sparkles,
  SprayCan,
  Trees,
  Truck,
  Video,
  Wrench,
} from 'lucide-react';

export const occupationIconMap: Record<string, LucideIcon> = {
  cleaner: SprayCan,
  handyman: Hammer,
  tutor: GraduationCap,
  'dog-walker': Dog,
  'event-planner': CalendarCheck,
  mover: Truck,
  'personal-trainer': Dumbbell,
  photographer: Camera,
  videographer: Video,
  dj: Music,
  chef: ChefHat,
  'makeup-artist': Sparkles,
  barber: Scissors,
  mechanic: Wrench,
  'it-technician': Laptop,
  landscaper: Trees,
  'snow-removal': Snowflake,
  painter: Paintbrush,
  'car-detailer': Car,
  'home-organizer': Layers,
};

export function getOccupationIcon(slug: string): LucideIcon {
  return occupationIconMap[slug] ?? Briefcase;
}
