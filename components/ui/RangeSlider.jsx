import { useRef } from 'react';
import { cx } from './cx';

// Two-handle range slider: two native range inputs on one track, so keyboard (arrows, Page
// Up/Down, Home/End), screen readers and right-to-left (the handles mirror) come from the
// browser. Each handle has a 44 px hit area (styles: .range-dual in globals.css).
// `onChange([lo, hi])` fires while moving; `onCommit([lo, hi])` when a handle is released
// (pointer up, key up, blur): callers debounce it.
const HALF = 22; // half the thumb hit area, px: the track runs between the thumb centres

export default function RangeSlider({ min, max, step = 1, value, onChange, onCommit, labelMin, labelMax, valueText = v => String(v), className }) {
    const [lo, hi] = value;
    const latest = useRef(value);
    latest.current = value;
    const span = max - min || 1;
    const at = fraction => `calc(${HALF}px + (100% - ${HALF * 2}px) * ${Math.min(1, Math.max(0, fraction))})`;
    const commit = () => onCommit?.(latest.current);
    const handlers = { onPointerUp: commit, onKeyUp: commit, onBlur: commit };
    // When both handles meet at the top end, the low one must stay grabbable.
    const lowOnTop = lo >= max - step;
    return (
        <div className={cx('relative h-11', className)}>
            <span aria-hidden="true" className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-line-strong" style={{ insetInlineStart: `${HALF}px`, insetInlineEnd: `${HALF}px` }} />
            <span
                aria-hidden="true"
                data-range-fill=""
                className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-navy-900"
                style={{ insetInlineStart: at((lo - min) / span), insetInlineEnd: at((max - hi) / span) }}
            />
            <input
                type="range"
                className={cx('range-dual', lowOnTop && 'z-[2]')}
                min={min}
                max={max}
                step={step}
                value={lo}
                aria-label={labelMin}
                aria-valuetext={valueText(lo)}
                onChange={event => onChange([Math.min(Number(event.target.value), hi), hi])}
                {...handlers}
            />
            <input
                type="range"
                className="range-dual z-[1]"
                min={min}
                max={max}
                step={step}
                value={hi}
                aria-label={labelMax}
                aria-valuetext={valueText(hi)}
                onChange={event => onChange([lo, Math.max(Number(event.target.value), lo)])}
                {...handlers}
            />
        </div>
    );
}
