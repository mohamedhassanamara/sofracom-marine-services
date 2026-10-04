import { useLang } from '../../contexts/LangContext';
import {
    ORDER_FLOW,
    QUOTE_FLOW,
    historyFor,
    normalizeOrderStatus,
    normalizeQuoteStatus,
} from '../../lib/status';

const LOCALES = { en: 'en-GB', fr: 'fr-FR', ar: 'ar-TN' };

export const useFormatDate = () => {
    const { lang } = useLang();
    return (value, withTime = false) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return new Intl.DateTimeFormat(LOCALES[lang] || 'en-GB', {
            dateStyle: 'medium',
            ...(withTime ? { timeStyle: 'short' } : {}),
        }).format(date);
    };
};

const KIND = {
    order: { flow: ORDER_FLOW, normalize: normalizeOrderStatus, stopped: ['cancelled'], done: ['delivered'] },
    quote: { flow: QUOTE_FLOW, normalize: normalizeQuoteStatus, stopped: ['declined'], done: ['completed', 'accepted'] },
};

const badgeTone = (kind, status) => {
    const config = KIND[kind];
    if (config.stopped.includes(status)) return 'status-badge--stopped';
    if (config.done.includes(status)) return 'status-badge--done';
    if (status === 'pending' || status === 'received') return 'status-badge--waiting';
    return '';
};

export function StatusBadge({ kind, status }) {
    const { t } = useLang();
    const normalized = KIND[kind].normalize(status);
    return (
        <span className={`status-badge ${badgeTone(kind, normalized)}`}>{t(`status.${kind}.${normalized}`)}</span>
    );
}

// Shows every step of the normal flow: reached steps with their time and note,
// the current one highlighted, later ones greyed out. A stop (cancelled/declined)
// ends the timeline where it happened.
export function StatusTimeline({ kind, doc }) {
    const { t } = useLang();
    const formatDate = useFormatDate();
    const config = KIND[kind];
    const history = historyFor(doc, config.normalize);
    const current = config.normalize(doc.status);
    const reached = new Map();
    history.forEach(entry => reached.set(entry.status, entry));

    const stopped = config.stopped.includes(current);
    const currentIndex = config.flow.indexOf(current);
    const steps = stopped
        ? [...config.flow.filter(status => reached.has(status)), current]
        : config.flow;

    return (
        <ol className="timeline">
            {steps.map((status, index) => {
                const entry = reached.get(status);
                const isCurrent = status === current;
                const isDone = stopped ? !isCurrent : index < currentIndex || (isCurrent && config.done.includes(status));
                const state = stopped && isCurrent
                    ? 'stopped'
                    : isCurrent && !isDone
                      ? 'current'
                      : isDone || entry
                        ? 'done'
                        : 'todo';
                return (
                    <li key={status} className={`timeline__step timeline__step--${state}`}>
                        <span className="timeline__dot" aria-hidden="true" />
                        <p className="timeline__label">{t(`status.${kind}.${status}`)}</p>
                        {entry?.at && <p className="timeline__time">{formatDate(entry.at, true)}</p>}
                        {entry?.note && <p className="timeline__note">{entry.note}</p>}
                    </li>
                );
            })}
        </ol>
    );
}
