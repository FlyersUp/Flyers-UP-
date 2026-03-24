/**
 * Contextual hint keys and copy. Shown once per key, dismissible.
 */

export type HintKey =
  | 'bookings_first_visit'
  | 'messages_first_visit'
  | 'deposit_screen'
  | 'completion_screen';

export const HINT_CONFIG: Record<
  HintKey,
  { message: string; ariaLabel?: string }
> = {
  bookings_first_visit: {
    message: 'Track all your jobs here.',
    ariaLabel: 'Tip: Track all your jobs here',
  },
  messages_first_visit: {
    message: 'Keep communication here so everything stays documented.',
    ariaLabel: 'Tip: Keep communication here so everything stays documented',
  },
  deposit_screen: {
    message: 'Your deposit secures the booking.',
    ariaLabel: 'Tip: Your deposit secures the booking',
  },
  completion_screen: {
    message: 'Confirm completion to release the final payment.',
    ariaLabel: 'Tip: Confirm completion to release the final payment',
  },
};
