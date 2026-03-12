import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { defaultLocale, isValidLocale } from './config';

const COOKIE_NAME = 'NEXT_LOCALE';

function getAcceptLanguageLocale(): string {
  try {
    const headersList = headers();
    const acceptLanguage = headersList.get('accept-language');
    if (!acceptLanguage) return defaultLocale;
    // Parse "en-US,en;q=0.9,es;q=0.8" -> prefer first that we support
    const parts = acceptLanguage.split(',').map((p) => p.split(';')[0].trim().toLowerCase().slice(0, 2));
    for (const part of parts) {
      if (isValidLocale(part)) return part;
    }
  } catch {
    // ignore
  }
  return defaultLocale;
}

export default getRequestConfig(async () => {
  let locale = defaultLocale;
  try {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(COOKIE_NAME)?.value;
    if (cookieLocale && isValidLocale(cookieLocale)) {
      locale = cookieLocale;
    } else {
      locale = getAcceptLanguageLocale();
    }
  } catch {
    locale = getAcceptLanguageLocale();
  }

  const messages = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages };
});
