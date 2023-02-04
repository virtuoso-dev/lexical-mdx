import '../styles/globals.css'
import '../components/toolbar.css'
import '../components/link-ui.css'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
