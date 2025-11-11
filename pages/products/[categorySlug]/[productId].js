import Link from 'next/link';
import { useMemo, useState } from 'react';
import useCart from '../../../hooks/useCart';
import {
    getProductById,
    getProductPaths,
} from '../../../lib/products';

const OUTPUT_CURRENCY = 'TND';
const FR_NUMBER_FORMAT = new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: OUTPUT_CURRENCY,
});

const formatPrice = value => {
    if (!Number.isFinite(value)) {
        return `${value || 0} ${OUTPUT_CURRENCY}`;
    }
    return FR_NUMBER_FORMAT.format(value);
};

export async function getStaticPaths() {
    const paths = getProductPaths().map(path => ({
        params: {
            categorySlug: path.categorySlug,
            productId: path.productId,
        },
    }));
    return {
        paths,
        fallback: false,
    };
}

export async function getStaticProps({ params }) {
    const entry = getProductById(params.productId);
    if (!entry || entry.category.slug !== params.categorySlug) {
        return { notFound: true };
    }
    return {
        props: {
            product: entry.product,
            category: entry.category,
        },
    };
}

export default function ProductDetailPage({ product, category }) {
    const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [cartOpen, setCartOpen] = useState(false);
    const [checkoutStatus, setCheckoutStatus] = useState({ message: '', type: '' });
    const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
    const [checkoutForm, setCheckoutForm] = useState({
        name: '',
        phone: '',
        address: '',
        notes: '',
    });
    const { cart, addItem, updateQuantity, removeItem, total, count } = useCart();

    const detailVariant = product.variants[selectedVariantIndex] ?? null;
    const detailPrice = detailVariant?.price ?? product.price ?? 0;
    const detailImage =
        product.images[activeImageIndex] || product.image;

    const addToCart = () => {
        if (product.stock !== 'in') return;
        const price = detailVariant?.price ?? detailPrice;
        const variantLabel = detailVariant?.label;
        const itemId = variantLabel ? `${product.id}-${variantLabel}` : product.id;
        addItem({
            id: itemId,
            title: product.title,
            price,
            quantity: 1,
            image: product.image,
            category: product.categoryName,
            brand: product.brand,
            variantLabel,
        });
        setCartOpen(true);
    };

    const handleCheckoutInput = event => {
        const { name, value } = event.target;
        setCheckoutForm(form => ({ ...form, [name]: value }));
    };

    const handleCheckoutSubmit = async event => {
        event.preventDefault();
        if (!cart.length) {
            setCheckoutStatus({ message: 'Cart is empty', type: 'error' });
            return;
        }
        if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) {
            setCheckoutStatus({
                message: 'Name, phone, and address are required.',
                type: 'error',
            });
            return;
        }
        setCheckoutSubmitting(true);
        setCheckoutStatus({ message: 'Sending order…', type: '' });
        const payload = {
            customer: checkoutForm,
            items: cart.map(item => ({
                id: item.id,
                title: item.title,
                price: item.price,
                quantity: item.quantity,
                image: item.image,
                category: item.category,
                variantLabel: item.variantLabel,
            })),
            total,
            currency: OUTPUT_CURRENCY,
        };
        try {
            const response = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok || !result.ok) {
                throw new Error(result.error || 'Unable to place order');
            }
            setCheckoutForm({ name: '', phone: '', address: '', notes: '' });
            setCheckoutStatus({
                message: 'Order submitted! We will confirm shortly.',
                type: 'success',
            });
        } catch (error) {
            console.error('[order] submit failed', error);
            setCheckoutStatus({
                message: error.message || 'Unable to submit order.',
                type: 'error',
            });
        } finally {
            setCheckoutSubmitting(false);
        }
    };

    const updateCartQty = (id, quantity) => updateQuantity(id, quantity);
    const removeCart = id => removeItem(id);
    const openCart = () => {
        setCartOpen(true);
        setCheckoutStatus({ message: '', type: '' });
    };
    const closeCart = () => setCartOpen(false);

    const description = product.description || '';
    const READ_MORE_LENGTH = 320;
    const [showFullDescription, setShowFullDescription] = useState(false);
    const isLongDescription = description.length > READ_MORE_LENGTH;
    const previewDescription = description.slice(0, READ_MORE_LENGTH);

    return (
        <>
            <main className="max-w-6xl mx-auto px-6 py-12">
                <div className="flex flex-col gap-4 mb-6">
                    <p className="text-sm text-gray-500 uppercase tracking-wide">
                        Product detail
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Link href="/products" className="hover:underline">
                            Catalog
                        </Link>
                        <span>/</span>
                        <Link href={`/products/${category.slug}`} className="hover:underline">
                            {category.name}
                        </Link>
                        <span>/</span>
                        <span className="font-semibold text-gray-700">{product.title}</span>
                    </div>
                </div>
                <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-10">
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
                        <img
                            src={detailImage}
                            alt={product.title}
                            className="w-full h-96 object-contain rounded-2xl bg-gray-50"
                        />
                        {product.images.length > 1 && (
                            <div className="flex flex-wrap gap-3 mt-4">
                                {product.images.map((src, index) => (
                                    <button
                                        key={src}
                                        type="button"
                                        onClick={() => setActiveImageIndex(index)}
                                        className={`w-20 h-20 rounded-2xl border ${
                                            activeImageIndex === index
                                                ? 'border-blue-500'
                                                : 'border-gray-200'
                                        }`}
                                    >
                                        <img
                                            src={src}
                                            alt={`${product.title}-${index}`}
                                            className="w-full h-full object-cover rounded-2xl"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="space-y-5">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">
                                {product.categoryName}
                            </p>
                            <h1 className="text-3xl font-bold text-gray-900">
                                {product.title}
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">{product.brand}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {product.usage.map(tag => (
                                <span
                                    key={`${product.id}-tag-${tag}`}
                                    className="tag px-3 py-1 rounded-full text-xs"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-4xl font-bold text-gray-900">
                                {formatPrice(detailPrice)}
                            </span>
                            <span
                                className={`stock-badge ${
                                    product.stock === 'in'
                                        ? 'stock-badge--in'
                                        : 'stock-badge--out'
                                }`}
                            >
                                {product.stock === 'in' ? 'In stock' : 'Out of stock'}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {product.variants.length ? (
                                product.variants.map((variant, index) => (
                                    <button
                                        key={`${variant.label}-${index}`}
                                        type="button"
                                        className={`detail-variant-btn ${
                                            selectedVariantIndex === index
                                                ? 'active'
                                                : ''
                                        }`}
                                        onClick={() => setSelectedVariantIndex(index)}
                                    >
                                        {variant.label}
                                        <span>{formatPrice(variant.price)}</span>
                                    </button>
                                ))
                            ) : (
                                <span className="text-sm text-gray-500">
                                    Single configuration
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            {showFullDescription
                                ? description
                                : `${previewDescription}${isLongDescription ? '…' : ''}`}
                        </p>
                        {isLongDescription && (
                            <button
                                type="button"
                                className="text-blue-600 hover:underline text-sm font-semibold"
                                onClick={() => setShowFullDescription(prev => !prev)}
                            >
                                {showFullDescription ? 'Show less' : 'Read more'}
                            </button>
                        )}
                        {product.datasheet && (
                            <a
                                href={product.datasheet}
                                target="_blank"
                                rel="noreferrer"
                                className="datasheet-link"
                            >
                                Download datasheet
                            </a>
                        )}
                        <button
                            type="button"
                            className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 transition"
                            onClick={addToCart}
                            disabled={product.stock !== 'in'}
                        >
                            Add to cart
                        </button>
                        <p
                            className={`quote-status ${checkoutStatus.type} mt-2 text-sm ${
                                checkoutStatus.message ? '' : 'hidden'
                            }`}
                            aria-live="polite"
                        >
                            {checkoutStatus.message}
                        </p>
                    </div>
                </div>
            </main>
            <button id="cartFab" className="cart-fab" type="button" onClick={openCart}>
                <span>Cart</span>
                <span className="px-2 py-1 rounded-full bg-white/15 text-sm font-semibold">
                    {count}
                </span>
            </button>
            <div
                id="cartOverlay"
                className={`cart-overlay ${cartOpen ? 'active' : ''}`}
                onClick={closeCart}
            />
            <aside
                id="cartDrawer"
                className={`cart-drawer ${cartOpen ? 'open' : ''}`}
                aria-hidden={!cartOpen}
            >
                <div className="cart-header">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Your order</h3>
                        <p className="text-sm text-gray-500">
                            Review items then confirm your details.
                        </p>
                    </div>
                    <button
                        id="cartClose"
                        type="button"
                        aria-label="Close cart"
                        className="text-2xl leading-none text-gray-500 hover:text-gray-800"
                        onClick={closeCart}
                    >
                        ×
                    </button>
                </div>
                <div className="cart-body" id="cartItems">
                    {cart.length ? (
                        cart.map(item => (
                            <div className="cart-item" key={item.id} data-id={item.id}>
                                <img src={item.image} alt={item.title} />
                                <div>
                                    <p className="cart-item-title">{item.title}</p>
                                    <p className="text-xs text-gray-500">
                                        {item.variantLabel ? item.variantLabel : item.category}
                                    </p>
                                    <div className="cart-qty mt-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateCartQty(item.id, item.quantity - 1)
                                            }
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={event => {
                                                const value = Number(event.target.value);
                                                if (!Number.isFinite(value)) return;
                                                updateCartQty(item.id, value);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateCartQty(item.id, item.quantity + 1)
                                            }
                                        >
                                            +
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeCart(item.id)}
                                            className="text-xs text-red-500 ml-3"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="empty-cart">Your cart is empty.</p>
                    )}
                </div>
                <div className="cart-summary">
                    <div className="cart-summary-row">
                        <span>Total</span>
                        <span>{formatPrice(total)}</span>
                    </div>
                    <p className={`cart-alert ${checkoutStatus.type}`} role="status">
                        {checkoutStatus.message}
                    </p>
                </div>
                <form
                    id="checkoutForm"
                    className="cart-form"
                    onSubmit={handleCheckoutSubmit}
                    noValidate
                >
                    <label>
                        <span>Full name</span>
                        <input
                            type="text"
                            name="name"
                            value={checkoutForm.name}
                            onChange={handleCheckoutInput}
                            required
                        />
                    </label>
                    <label>
                        <span>Phone</span>
                        <input
                            type="tel"
                            name="phone"
                            value={checkoutForm.phone}
                            onChange={handleCheckoutInput}
                            required
                        />
                    </label>
                    <label>
                        <span>Delivery address</span>
                        <textarea
                            name="address"
                            rows="2"
                            value={checkoutForm.address}
                            onChange={handleCheckoutInput}
                            required
                        />
                    </label>
                    <label>
                        <span>Notes (optional)</span>
                        <textarea
                            name="notes"
                            rows="2"
                            value={checkoutForm.notes}
                            onChange={handleCheckoutInput}
                        />
                    </label>
                    <button
                        id="cartSubmitBtn"
                        type="submit"
                        className="cart-submit"
                        disabled={checkoutSubmitting}
                    >
                        {checkoutSubmitting ? 'Sending…' : 'Send order'}
                    </button>
                </form>
            </aside>
        </>
    );
}
