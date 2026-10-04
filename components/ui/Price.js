import { useLang } from '../../contexts/LangContext';
import useFormat from '../../hooks/useFormat';
import { cx } from './cx';

const SIZES = { sm: 'text-sm', md: 'text-base', lg: 'text-xl', xl: 'text-2xl' };

// A TND amount in the page language. `from` prefixes "from" (products whose options
// differ in price). <bdi> isolates the amount so it never reorders surrounding text.
export default function Price({ value, from = false, size = 'md', className }) {
    const { t } = useLang();
    const format = useFormat();
    return (
        <span className={cx('inline-flex flex-wrap items-baseline gap-x-1 font-semibold tabular-nums text-slate-900', SIZES[size], className)}>
            {from && <span className="text-[0.8em] font-medium text-slate-600">{t('ui.from')}</span>}
            <bdi className="whitespace-nowrap">{format.price(value)}</bdi>
        </span>
    );
}
