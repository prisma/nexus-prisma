import { FC } from 'react'
import { AppProps } from 'next/app'
import 'nextra-theme-docs/style.css'

const App: FC<AppProps> = ({ Component, pageProps }) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return <Component {...pageProps} />
}

export default App
