import Head from 'next/head';
import { Inter, IBM_Plex_Sans_Arabic, Manrope } from 'next/font/google';
import Layout from '../components/Layout';
import { LangProvider } from '../contexts/LangContext';
import { CartProvider } from '../contexts/CartContext';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../components/ui/Toast';
import '../styles/globals.css';
import '../styles/account.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

// Self-hosted by next/font: no render-blocking request to Google.
// Not preloaded: Arabic pages don't use it, and the LCP image should go first everywhere.
const inter = Inter({ subsets: ['latin'], display: 'swap', preload: false });
// Headings (variable font, one file). Not preloaded: the LCP image goes first and headings
// swap in when it arrives. Arabic headings use IBM Plex Sans Arabic.
const manrope = Manrope({ subsets: ['latin'], display: 'swap', preload: false });
// Only downloaded when Arabic glyphs are on the page (unicode-range), so not preloaded.
const plexArabic = IBM_Plex_Sans_Arabic({
    subsets: ['arabic'],
    // Two weights keep Arabic pages light: 400 for text, 600 for headings and emphasis
    // (500 renders as 400, 700 as 600).
    weight: ['400', '600'],
    display: 'swap',
    preload: false,
});

function MyApp({ Component, pageProps }) {
    return (
        <LangProvider>
            <AuthProvider>
                <CartProvider>
                    <ToastProvider>
                    <Head>
                        <meta name="viewport" content="width=device-width, initial-scale=1" />
                    </Head>
                    <style jsx global>{`
                        :root {
                            --font-inter: ${inter.style.fontFamily};
                            --font-heading: ${manrope.style.fontFamily};
                            --font-arabic: ${plexArabic.style.fontFamily};
                        }
                    `}</style>
                    <Layout flushFooter={Component.flushFooter}>
                        <Component {...pageProps} />
                    </Layout>
                    <Analytics />
                    <SpeedInsights />
                    </ToastProvider>
                </CartProvider>
            </AuthProvider>
        </LangProvider>
    );
}

export default MyApp;
