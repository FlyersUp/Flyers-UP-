/**
 * POST /api/bookings/[bookingId]/deposit/create-intent
 *
 * Creates Stripe PaymentIntent for deposit. Same logic as /pay/deposit.
 * Exported for explicit deposit flow at /customer/bookings/[id]/deposit.
 */
export { POST } from '../../pay/deposit/route';
