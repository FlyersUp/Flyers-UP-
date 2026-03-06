/**
 * Occupation → Services structure
 * Maps occupation slugs to legacy service_categories for pro lookup (backward compat)
 */
export const OCCUPATION_TO_SERVICE_SLUG: Record<string, string> = {
  cleaner: 'cleaning',
  handyman: 'handyman',
  tutor: 'trainer-tutor',
  'dog-walker': 'pet-care',
  'event-planner': 'event-organizer',
  mover: 'move-help',
  'personal-trainer': 'trainer-tutor',
  photographer: 'photography',
  videographer: 'photography',
  dj: 'event-organizer',
  chef: 'event-organizer',
  'makeup-artist': 'event-organizer',
  barber: 'handyman',
  mechanic: 'handyman',
  'it-technician': 'handyman',
  landscaper: 'handyman',
  'snow-removal': 'handyman',
  painter: 'handyman',
  'car-detailer': 'handyman',
  'home-organizer': 'cleaning',
};
