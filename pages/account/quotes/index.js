import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLang } from '../../../contexts/LangContext';
import { useAuth } from '../../../contexts/AuthContext';
import AccountLayout from '../../../components/account/AccountLayout';
import { StatusBadge, useFormatDate } from '../../../components/account/Status';
import { listMine } from '../../../lib/accountData';
import { displayRef } from '../../../lib/status';

export default function QuotesPage() {
    const { t } = useLang();
    const { user } = useAuth();
    const formatDate = useFormatDate();
    const [quotes, setQuotes] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user) return;
        listMine('quotes', user.uid)
            .then(setQuotes)
            .catch(err => {
                console.error('[quotes] load failed', err);
                setError(t('errors.generic'));
                setQuotes([]);
            });
    }, [user, t]);

    return (
        <AccountLayout
            title={t('quotes.title')}
            eyebrow={t('account.eyebrow')}
            actions={
                <Link href="/#contact" className="ui-btn ui-btn--primary">
                    {t('quotes.new')}
                </Link>
            }
        >
            {error && <p className="ui-alert ui-alert--error mb-4">{error}</p>}
            {quotes === null ? (
                <p className="ui-muted">{t('account.loading')}</p>
            ) : quotes.length === 0 ? (
                <div className="ui-card ui-empty">
                    <p>{t('quotes.empty')}</p>
                </div>
            ) : (
                <div className="record-list">
                    {quotes.map(quote => (
                        <Link key={quote.id} href={`/account/quotes/${quote.id}`} className="record-card">
                            <div style={{ minWidth: 0 }}>
                                <p className="record-card__title">
                                    {quote.subject || t('quotes.untitled', { id: displayRef(quote) })}
                                </p>
                                <p className="record-card__meta">{formatDate(quote.created_at)}</p>
                            </div>
                            <StatusBadge kind="quote" status={quote.status} />
                        </Link>
                    ))}
                </div>
            )}
        </AccountLayout>
    );
}
