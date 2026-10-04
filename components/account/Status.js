import { useLang } from '../../contexts/LangContext';
import useFormat from '../../hooks/useFormat';
import { statusTone } from '../../lib/design/tokens';
import { ORDER_FLOW, QUOTE_FLOW, historyFor, normalizeOrderStatus, normalizeQuoteStatus } from '../../lib/status';
import { StatusBadge as KitStatusBadge } from '../ui/Badge';
import { cx } from '../ui/cx';
import { Check, Icon, X } from '../ui/icons';

// Dates in the page language (kept for existing callers).
export const useFormatDate = () => {
    const format = useFormat();
    return format.date;
};

const KIND = {
    order: { flow: ORDER_FLOW, normalize: normalizeOrderStatus, stopped: ['cancelled'], done: ['delivered'] },
    quote: { flow: QUOTE_FLOW, normalize: normalizeQuoteStatus, stopped: ['declined'], done: ['completed', 'accepted'] },
};

export function StatusBadge({ kind, status, size }) {
    return <KitStatusBadge kind={kind} status={status} size={size} />;
}

const DOT = {
    done: 'bg-success-600 text-white',
    current: 'bg-white text-navy-900 ring-4 ring-navy-200 border-2 border-navy-900',
    stopped: 'bg-danger-600 text-white',
    todo: 'bg-white border-2 border-slate-300',
};

// Every step of the normal flow: reached steps with their time and note, the current one
// highlighted, later ones greyed out. A stop (cancelled/declined) ends the timeline where it
// happened. The rail sits at the inline start, so it mirrors in Arabic.
export function StatusTimeline({ kind, doc }) {
    const { t } = useLang();
    const format = useFormat();
    const config = KIND[kind];
    const history = historyFor(doc, config.normalize);
    const current = config.normalize(doc.status);
    const reached = new Map();
    history.forEach(entry => reached.set(entry.status, entry));

    const stopped = config.stopped.includes(current);
    const currentIndex = config.flow.indexOf(current);
    const steps = stopped ? [...config.flow.filter(status => reached.has(status)), current] : config.flow;

    return (
        <ol className="relative">
            {steps.map((status, index) => {
                const entry = reached.get(status);
                const isCurrent = status === current;
                const isDone = stopped ? !isCurrent : index < currentIndex || (isCurrent && config.done.includes(status));
                const state = stopped && isCurrent ? 'stopped' : isCurrent && !isDone ? 'current' : isDone || entry ? 'done' : 'todo';
                const last = index === steps.length - 1;
                return (
                    <li key={status} className="relative flex gap-4 pb-6 last:pb-0" aria-current={isCurrent ? 'step' : undefined}>
                        {!last && <span aria-hidden="true" className={cx('absolute start-[0.6875rem] top-6 h-[calc(100%-1.5rem)] w-0.5', state === 'done' ? 'bg-success-600' : 'bg-slate-200')} />}
                        <span aria-hidden="true" className={cx('relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full', DOT[state])}>
                            {state === 'done' && <Icon as={Check} size={14} />}
                            {state === 'stopped' && <Icon as={X} size={14} />}
                            {state === 'current' && <span className="h-2 w-2 rounded-full bg-navy-900" />}
                        </span>
                        <div className="min-w-0 pt-0.5">
                            <p className={cx('font-semibold', state === 'todo' ? 'text-slate-500' : 'text-slate-900')} data-tone={statusTone[kind][status]}>
                                {t(`status.${kind}.${status}`)}
                                <span className="sr-only"> ({t(`timeline.${state}`)})</span>
                            </p>
                            {entry?.at && <p className="text-sm text-slate-600">{format.date(entry.at, true)}</p>}
                            {entry?.note && <p className="mt-1 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{entry.note}</p>}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
