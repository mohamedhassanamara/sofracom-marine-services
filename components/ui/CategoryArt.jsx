import { cx } from './cx';
import { photoClass } from '../../lib/images';
import { Icon, Package } from './icons';
import ResponsiveImage from './ResponsiveImage';

// A category's picture, composed from its 1–3 tile products (lib/categoryTiles.js): approved
// cutouts, else the original photos blended into the surface; no products → an icon.
// Each count has its own balanced layout. Decorative: the tile's name is the text.
// `tight`: the products fill most of the area (home category tiles).
const TIGHT = {
    1: ['inset-[3%]'],
    2: ['inset-y-[3%] start-[2%] w-[54%]', 'inset-y-[8%] end-[2%] w-[46%]'],
    3: ['inset-y-[1%] start-[25%] w-[50%] z-10', 'bottom-[3%] start-[1%] h-[72%] w-[38%]', 'bottom-[3%] end-[1%] h-[72%] w-[38%]'],
};
const LAYOUTS = {
    1: ['inset-[12%]'],
    2: ['inset-y-[14%] start-[6%] w-[52%]', 'inset-y-[18%] end-[6%] w-[46%]'],
    3: ['inset-y-[10%] start-[24%] w-[52%] z-10', 'bottom-[12%] start-[3%] h-[60%] w-[38%]', 'bottom-[12%] end-[3%] h-[60%] w-[38%]'],
};

export default function CategoryArt({ images = [], sizes = '400px', className, hover = true, tight = false }) {
    const list = images.filter(Boolean).slice(0, 3);
    const layouts = tight ? TIGHT : LAYOUTS;
    return (
        <span className={cx('relative block overflow-hidden bg-surface', className)} aria-hidden="true">
            {list.length ? (
                list.map((src, index) => (
                    <span key={src} className={cx('absolute block', layouts[list.length][index])}>
                        <ResponsiveImage src={src} alt="" sizes={sizes} className={cx('h-full w-full object-contain transition-transform duration-base ease-out', photoClass(src), hover && 'group-hover:scale-[1.04]')} />
                    </span>
                ))
            ) : (
                <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-navy-900">
                        <Icon as={Package} size={32} strokeWidth={1.5} />
                    </span>
                </span>
            )}
        </span>
    );
}
