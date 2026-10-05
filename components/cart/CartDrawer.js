import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useLang } from '../../contexts/LangContext';
import { DELIVERY_FEE } from '../../lib/constants';
import { cx } from '../ui/cx';
import { imageAt, photoClass } from '../../lib/images';
import { Button, Drawer, EmptyState, Price, QuantityStepper } from '../ui';
import { Icon, Info, ShoppingCart, Trash2 } from '../ui/icons';

// The cart, available on every page from the header. Checkout is a full page (/checkout).
export default function CartDrawer() {
    const { t } = useLang();
    const router = useRouter();
    const { cart, count, total, updateQuantity, removeItem, isOpen, closeCart, hasOnOrderItem } = useCart();

    // Close when the page changes (not on mount: the drawer is first mounted by opening it).
    const lastPath = useRef(router.asPath);
    useEffect(() => {
        if (lastPath.current === router.asPath) return;
        lastPath.current = router.asPath;
        closeCart();
    }, [router.asPath, closeCart]);

    return (
        <Drawer
            open={isOpen}
            onClose={closeCart}
            title={t('cart.title')}
            description={cart.length ? t('cart.items', { count }) : undefined}
            footer={
                cart.length ? (
                    <div className="flex flex-col gap-3">
                        <dl className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-ink-muted">{t('cart.itemsTotal')}</dt>
                                <dd>
                                    <Price value={total} size="sm" />
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-ink-muted">{t('cart.deliveryFee')}</dt>
                                <dd>
                                    <Price value={DELIVERY_FEE} size="sm" />
                                </dd>
                            </div>
                            <div className="flex justify-between border-t border-line pt-2 text-base">
                                <dt className="font-semibold">{t('cart.grandTotal')}</dt>
                                <dd>
                                    <Price value={total + DELIVERY_FEE} size="lg" />
                                </dd>
                            </div>
                        </dl>
                        <Button href="/checkout" size="lg" fullWidth data-autofocus>
                            {t('cart.checkout')}
                        </Button>
                        <Button variant="ghost" fullWidth onClick={closeCart}>
                            {t('cart.continue')}
                        </Button>
                    </div>
                ) : null
            }
        >
            {cart.length ? (
                <>
                    {hasOnOrderItem && (
                        <p className="mb-4 flex items-start gap-2 rounded-md bg-warning-50 p-3 text-sm text-warning-800">
                            <Icon as={Info} size={18} className="mt-0.5" />
                            <span>
                                <strong className="block">{t('cart.onOrderTitle')}</strong>
                                {t('cart.onOrderBody')}
                            </span>
                        </p>
                    )}
                    <ul className="divide-y divide-line">
                        {cart.map(item => (
                            <li key={item.id} className="flex gap-3 py-4 first:pt-0">
                                <img src={imageAt(item.image, 400)} alt="" loading="lazy" className={cx('h-20 w-20 shrink-0 rounded-xl bg-surface object-contain p-1.5', photoClass(item.image))} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            {item.productId && item.categorySlug ? (
                                                <Link href={`/products/${item.categorySlug}/${item.productId}`} className="line-clamp-2 font-medium text-ink hover:underline">
                                                    {item.title}
                                                </Link>
                                            ) : (
                                                <p className="line-clamp-2 font-medium text-ink">{item.title}</p>
                                            )}
                                            {item.variantLabel && <p className="text-sm text-ink-muted">{item.variantLabel}</p>}
                                        </div>
                                        <Button variant="ghost" size="sm" icon={Trash2} label={t('cart.removeItem', { title: item.title })} onClick={() => removeItem(item.id)} className="-me-2 -mt-1 text-ink-muted hover:text-danger-700" />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <QuantityStepper size="sm" value={item.quantity} onChange={quantity => updateQuantity(item.id, quantity)} label={`${t('ui.quantity')}: ${item.title}`} />
                                        <Price value={item.price * item.quantity} size="sm" />
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            ) : (
                <EmptyState
                    icon={ShoppingCart}
                    title={t('checkout.emptyTitle')}
                    description={t('cart.emptyBody')}
                    action={
                        <Button href="/products" onClick={closeCart}>
                            {t('home.hero.shop')}
                        </Button>
                    }
                />
            )}
        </Drawer>
    );
}
