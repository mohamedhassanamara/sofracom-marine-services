import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useLang } from '../../contexts/LangContext';
import { AuthCard } from '../../components/account/AuthCard';
import useRequireAuth, { safeNext } from '../../hooks/useRequireAuth';
import { errorMessage } from '../../lib/apiClient';

const RESEND_COOLDOWN = 60;

export default function VerifyEmailPage() {
    const { t } = useLang();
    const { user, resendVerification, refreshUser } = useRequireAuth();
    const router = useRouter();
    const next = safeNext(router.query.next) || '/account';
    const [message, setMessage] = useState(null);
    const [cooldown, setCooldown] = useState(0);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (user?.emailVerified) router.replace(next);
    }, [user, next, router]);

    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const timer = setTimeout(() => setCooldown(value => value - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const handleResend = async () => {
        setBusy(true);
        try {
            await resendVerification();
            setMessage({ type: 'success', text: t('auth.verifyResent') });
            setCooldown(RESEND_COOLDOWN);
        } catch (err) {
            setMessage({ type: 'error', text: errorMessage(t, err) });
        } finally {
            setBusy(false);
        }
    };

    const handleCheck = async () => {
        setBusy(true);
        try {
            const refreshed = await refreshUser();
            if (refreshed?.emailVerified) {
                router.replace(next);
                return;
            }
            setMessage({ type: 'info', text: t('auth.verifyNotYet') });
        } catch (err) {
            setMessage({ type: 'error', text: errorMessage(t, err) });
        } finally {
            setBusy(false);
        }
    };

    if (!user) return null;

    return (
        <AuthCard title={t('auth.verifyTitle')} subtitle={t('auth.verifySubtitle', { email: user.email || '' })}>
            <div className="ui-form">
                <p className="ui-alert ui-alert--info">{t('auth.verifyWhy')}</p>
                {message && (
                    <p className={`ui-alert ui-alert--${message.type}`} role="status">
                        {message.text}
                    </p>
                )}
                <button type="button" className="ui-btn ui-btn--primary ui-btn--block" onClick={handleCheck} disabled={busy}>
                    {t('auth.verifyDone')}
                </button>
                <button
                    type="button"
                    className="ui-btn ui-btn--secondary ui-btn--block"
                    onClick={handleResend}
                    disabled={busy || cooldown > 0}
                >
                    {cooldown > 0 ? t('auth.verifyResendIn', { seconds: cooldown }) : t('auth.verifyResend')}
                </button>
                <p className="ui-muted text-center">
                    <Link href={next} className="ui-link">
                        {t('auth.verifyLater')}
                    </Link>
                </p>
            </div>
        </AuthCard>
    );
}
