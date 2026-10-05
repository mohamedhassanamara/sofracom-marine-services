import Head from 'next/head';
import { Inter, IBM_Plex_Sans_Arabic } from 'next/font/google';
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
const inter = Inter({ subsets: ['latin'], display: 'swap' });
// Only downloaded when Arabic glyphs are on the page (unicode-range), so not preloaded.
const plexArabic = IBM_Plex_Sans_Arabic({
    subsets: ['arabic'],
    weight: ['400', '500', '600', '700'],
    display: 'swap',
    preload: false,
});

// Not a Fragment: styled-jsx adds className to the elements here.
const Bare = ({ children }) => children;

function MyApp({ Component, pageProps }) {
    // Pages that draw their own chrome (the design lab) opt out of the site header/footer.
    const Shell = Component.bareLayout ? Bare : Layout;
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
                            --font-arabic: ${plexArabic.style.fontFamily};
                        }
                    `}</style>
                    <Shell>
                        <Component {...pageProps} />
                    </Shell>
                    <Analytics />
                    <SpeedInsights />
                    </ToastProvider>
                </CartProvider>
            </AuthProvider>
        </LangProvider>
    );
}

export default MyApp;
