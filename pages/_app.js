import Head from 'next/head';
import Layout from '../components/Layout';
import { LangProvider } from '../contexts/LangContext';
import '../styles/globals.css';
import { Analytics } from '@vercel/analytics/next';

function MyApp({ Component, pageProps }) {
    return (
        <LangProvider>
            <Head>
                <title>SOFRACOM</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link
                    rel="preconnect"
                    href="https://fonts.googleapis.com"
                />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
                    rel="stylesheet"
                />
                <link
                    href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
                    rel="stylesheet"
                />
            </Head>
            <Layout>
                <Component {...pageProps} />
            </Layout>
            <Analytics />
        </LangProvider>
    );
}

export default MyApp;
