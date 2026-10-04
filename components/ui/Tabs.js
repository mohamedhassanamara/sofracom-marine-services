import { useId, useRef } from 'react';
import { useLang } from '../../contexts/LangContext';
import { cx } from './cx';

// Arrow keys move between items in reading order (reversed in Arabic); Home/End jump.
function useRovingKeys(count, index, select) {
    const { lang } = useLang();
    const rtl = lang === 'ar';
    return event => {
        const next = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowDown: 1, ArrowUp: -1 }[event.key];
        let target = null;
        if (next) target = (index + next + count) % count;
        if (event.key === 'Home') target = 0;
        if (event.key === 'End') target = count - 1;
        if (target === null) return;
        event.preventDefault();
        select(target, true);
    };
}

// tabs: [{ id, label, content }] — controlled by `value` (a tab id).
export function Tabs({ tabs, value, onChange, label, className }) {
    const base = useId().replace(/:/g, '');
    const refs = useRef([]);
    const index = Math.max(0, tabs.findIndex(tab => tab.id === value));
    const select = (target, focus) => {
        onChange(tabs[target].id);
        if (focus) refs.current[target]?.focus();
    };
    const onKeyDown = useRovingKeys(tabs.length, index, select);
    return (
        <div className={className}>
            <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-slate-200" onKeyDown={onKeyDown}>
                {tabs.map((tab, i) => {
                    const selected = i === index;
                    return (
                        <button
                            key={tab.id}
                            ref={el => (refs.current[i] = el)}
                            id={`${base}-tab-${tab.id}`}
                            role="tab"
                            type="button"
                            aria-selected={selected}
                            aria-controls={`${base}-panel-${tab.id}`}
                            tabIndex={selected ? 0 : -1}
                            onClick={() => select(i)}
                            className={cx(
                                '-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-fast',
                                selected ? 'border-navy-900 text-navy-900' : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                            )}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
            {tabs.map((tab, i) => (
                <div key={tab.id} id={`${base}-panel-${tab.id}`} role="tabpanel" aria-labelledby={`${base}-tab-${tab.id}`} hidden={i !== index} tabIndex={0} className="pt-4 focus-visible:outline-offset-4">
                    {i === index && tab.content}
                </div>
            ))}
        </div>
    );
}

// A small set of exclusive options (sort order, language, a filter): radiogroup semantics.
export function Segmented({ options, value, onChange, label, size = 'md', className }) {
    const refs = useRef([]);
    const index = Math.max(0, options.findIndex(option => option.value === value));
    const select = (target, focus) => {
        onChange(options[target].value);
        if (focus) refs.current[target]?.focus();
    };
    const onKeyDown = useRovingKeys(options.length, index, select);
    return (
        <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className={cx('inline-flex rounded-md border border-slate-300 bg-slate-100 p-0.5', className)}>
            {options.map((option, i) => {
                const checked = i === index;
                return (
                    <button
                        key={option.value}
                        ref={el => (refs.current[i] = el)}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        tabIndex={checked ? 0 : -1}
                        onClick={() => select(i)}
                        className={cx(
                            'rounded-[0.4rem] font-semibold transition-colors duration-fast',
                            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
                            checked ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
