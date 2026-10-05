import { cx } from './cx';
import ResponsiveImage from './ResponsiveImage';

// A category's picture: its 1–3 tile products (approved cutouts, else the photo blended
// into the surface) composed on the neutral surface. Decorative: the tile's name is the text.
const LAYOUTS = {
    1: ['inset-[12%]'],
    2: ['inset-y-[14%] start-[6%] w-[52%]', 'inset-y-[18%] end-[6%] w-[46%]'],
    3: ['inset-y-[10%] start-[24%] w-[52%] z-10', 'bottom-[12%] start-[3%] h-[60%] w-[38%]', 'bottom-[12%] end-[3%] h-[60%] w-[38%]'],
};

export default function CategoryArt({ images = [], fallback, sizes = '400px', className, hover = true }) {
    const list = images.filter(Boolean).slice(0, 3);
    return (
        <span className={cx('relative block overflow-hidden bg-surface', className)} aria-hidden="true">
            {list.length ? (
                list.map((src, index) => (
                    <span key={src} className={cx('absolute block', LAYOUTS[list.length][index])}>
                        <ResponsiveImage src={src} alt="" sizes={sizes} className={cx('h-full w-full object-contain mix-blend-multiply transition-transform duration-base ease-out', hover && 'group-hover:scale-[1.04]')} />
                    </span>
                ))
            ) : fallback ? (
                <ResponsiveImage src={fallback} alt="" sizes={sizes} className="h-full w-full object-contain p-[8%] mix-blend-multiply" />
            ) : null}
        </span>
    );
}
