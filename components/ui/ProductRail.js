import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useLang } from '../../contexts/LangContext';
import { cx } from './cx';
import { ChevronLeft, ChevronRight, Icon } from './icons';
import ProductCard from './ProductCard';

// A horizontal row of product cards: swipe on phones, ‹ › buttons on larger screens (they
// follow the reading direction and are disabled at the ends). Every card stays a normal
// list item, so keyboard users simply tab through them.
export default function ProductRail({ products, stats = {}, onQuickAdd, label, headingLevel = 3, className }) {
    const { t, lang } = useLang();
    const list = useRef(null);
    const id = `rail-${useId().replace(/:/g, '')}`;
    const [ends, setEnds] = useState({ start: true, end: false });
    const rtl = lang === 'ar';

    const measure = useCallback(() => {
        const node = list.current;
        if (!node) return;
        const offset = Math.abs(node.scrollLeft);
        setEnds({ start: offset < 4, end: offset + node.clientWidth >= node.scrollWidth - 4 });
    }, []);
    useEffect(() => {
        measure();
        const node = list.current;
        node?.addEventListener('scroll', measure, { passive: true });
        window.addEventListener('resize', measure);
        return () => {
            node?.removeEventListener('scroll', measure);
            window.removeEventListener('resize', measure);
        };
    }, [measure, products]);

    // "Forward" moves towards the end of the list: right in English, left in Arabic.
    const scroll = direction => {
        const node = list.current;
        if (!node) return;
        node.scrollBy({ left: direction * (rtl ? -1 : 1) * node.clientWidth * 0.9, behavior: 'smooth' });
    };
    const arrow = 'flex h-11 w-11 items-center justify-center rounded-full border border-line-input text-ink transition-colors duration-fast hover:border-navy-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line-input';

    return (
        <div className={className}>
            <div className="mb-6 hidden justify-end gap-2 sm:flex">
                <button type="button" className={arrow} onClick={() => scroll(-1)} disabled={ends.start} aria-controls={id} aria-label={t('ui.previous')}>
                    <Icon as={ChevronLeft} size={20} flip />
                </button>
                <button type="button" className={arrow} onClick={() => scroll(1)} disabled={ends.end} aria-controls={id} aria-label={t('ui.next')}>
                    <Icon as={ChevronRight} size={20} flip />
                </button>
            </div>
            <ul id={id} ref={list} aria-label={label} className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:gap-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
                {products.map(product => (
                    <li key={product.id} className={cx('flex w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[calc((100%-4.5rem)/4)]')}>
                        <ProductCard product={product} stats={stats[product.id]} onQuickAdd={onQuickAdd} headingLevel={headingLevel} className="w-full" />
                    </li>
                ))}
            </ul>
        </div>
    );
}
