import type { AppProps } from 'next/app';

// --- app shell (no magic, just the page).
export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

