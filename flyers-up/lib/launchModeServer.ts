import { redirect } from 'next/navigation';
import { isLaunchModeEnabled } from '@/lib/featureFlags';

export type LaunchModeHome = 'customer' | 'pro';

/**
 * When launch mode is on, block non-core deep links (layouts / pages).
 */
export async function launchModeBlockToHome(home: LaunchModeHome): Promise<void> {
  if (await isLaunchModeEnabled()) {
    redirect(home === 'customer' ? '/customer?coming_soon=1' : '/pro?coming_soon=1');
  }
}
