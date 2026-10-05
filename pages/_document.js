import Document, { Html, Head, Main, NextScript } from 'next/document';
import { dirFor } from '../lib/i18n/locales';
import { serverMessages } from '../lib/i18n/messages';

// lang/dir are rendered on the server from the URL locale (/, /fr, /ar), so the first
// paint is already right-to-left for Arabic.
export default class SofracomDocument extends Document {
    render() {
        const locale = this.props.locale || 'en';
        return (
            <Html lang={locale} dir={dirFor(locale)}>
                <Head>
                    <link rel="icon" href="/favicon.ico" sizes="32x32" />
                    <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
                    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                    <link rel="manifest" href="/site.webmanifest" />
                    <meta name="theme-color" content="#0b2050" />
                </Head>
                <body>
                    {/* The page language's UI strings, read by LangContext (lib/i18n/messages.js). */}
                    <script
                        id="__I18N__"
                        type="application/json"
                        data-lang={locale}
                        dangerouslySetInnerHTML={{ __html: JSON.stringify(serverMessages(locale)).replace(/</g, '\\u003c') }}
                    />
                    <Main />
                    <NextScript />
                </body>
            </Html>
        );
    }
}
