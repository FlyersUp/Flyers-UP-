import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { defaultLocale, isValidLocale, type Locale } from './config';

const COOKIE_NAME = 'NEXT_LOCALE';

function getAcceptLanguageLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  try {
    // Parse "en-US,en;q=0.9,es;q=0.8" -> prefer first that we support
    const parts = acceptLanguage.split(',').map((p) => p.split(';')[0].trim().toLowerCase().slice(0, 2));
    for (const part of parts) {
      if (isValidLocale(part)) return part as Locale;
    }
  } catch {
    // ignore
  }
  return defaultLocale;
}

export default getRequestConfig(async () => {
  let locale: Locale = defaultLocale;
  try {
    const [cookieStore, headersList] = await Promise.all([cookies(), headers()]);
    const cookieLocale = cookieStore.get(COOKIE_NAME)?.value;
    if (cookieLocale && isValidLocale(cookieLocale)) {
      locale = cookieLocale;
    } else {
      locale = getAcceptLanguageLocale(headersList.get('accept-language'));
    }
  } catch {
    const headersList = await headers();
    locale = getAcceptLanguageLocale(headersList.get('accept-language'));
  }

  const messages = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages };
});
