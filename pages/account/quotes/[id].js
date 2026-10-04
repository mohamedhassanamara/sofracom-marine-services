import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useLang } from '../../../contexts/LangContext';
import { useAuth } from '../../../contexts/AuthContext';
import AccountLayout from '../../../components/account/AccountLayout';
import { StatusBadge, StatusTimeline, useFormatDate } from '../../../components/account/Status';
import { getMine } from '../../../lib/accountData';
import { shortId } from '../../../lib/status';

export default function QuoteDetailPage() {
    const { t } = useLang();
    const { user } = useAuth();
    const router = useRouter();
    const formatDate = useFormatDate();
    const [quote, setQuote] = useState(undefined);

    useEffect(() => {
        if (!user || !router.query.id) return;
        getMine('quotes', String(router.query.id))
            .then(setQuote)
            .catch(() => setQuote(null));
    }, [user, router.query.id]);

    if (!quote) {
        return (
            <AccountLayout title={t('quotes.title')} eyebrow={t('account.eyebrow')}>
                {quote === null ? (
                    <div className="ui-card ui-empty">
                        <p>{t('quotes.notFound')}</p>
                        <Link href="/account/quotes" className="ui-btn ui-btn--secondary mt-4">
                            {t('quotes.back')}
                        </Link>
                    </div>
                ) : (
                    <p className="ui-muted">{t('account.loading')}</p>
                )}
            </AccountLayout>
        );
    }

    return (
        <AccountLayout
            title={quote.subject || t('quotes.untitled', { id: shortId(quote.id) })}
            eyebrow={formatDate(quote.created_at, true)}
            actions={<StatusBadge kind="quote" status={quote.status} />}
        >
            <div className="grid lg:grid-cols-3 gap-5">
                <section className="ui-card lg:col-span-2">
                    <h2 className="font-bold text-lg text-gray-900 mb-3">{t('quotes.details')}</h2>
                    <p className="review-item__comment" style={{ marginTop: 0 }}>{quote.details}</p>
                    <dl className="mt-5 grid sm:grid-cols-2 gap-3 text-sm">
                        <div>
                            <dt className="ui-muted">{t('quotes.contactName')}</dt>
                            <dd className="text-gray-900">{quote.customer_name}</dd>
                        </div>
                        <div>
                            <dt className="ui-muted">{t('quotes.contactEmail')}</dt>
                            <dd className="text-gray-900" dir="ltr" style={{ textAlign: 'start' }}>{quote.customer_email}</dd>
                        </div>
                        {quote.customer_phone && (
                            <div>
                                <dt className="ui-muted">{t('quotes.contactPhone')}</dt>
                                <dd className="text-gray-900" dir="ltr" style={{ textAlign: 'start' }}>{quote.customer_phone}</dd>
                            </div>
                        )}
                        <div>
                            <dt className="ui-muted">{t('quotes.reference')}</dt>
                            <dd className="text-gray-900">{shortId(quote.id)}</dd>
                        </div>
                    </dl>
                </section>
                <section className="ui-card">
                    <h2 className="font-bold text-lg text-gray-900 mb-4">{t('orders.status')}</h2>
                    <StatusTimeline kind="quote" doc={quote} />
                </section>
            </div>
            <p className="mt-6">
                <Link href="/account/quotes" className="ui-link">
                    {t('quotes.back')}
                </Link>
            </p>
        </AccountLayout>
    );
}
