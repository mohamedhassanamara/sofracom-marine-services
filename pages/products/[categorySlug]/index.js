import Link from 'next/link';
import { useMemo, useState } from 'react';
import useCart from '../../../hooks/useCart';
import {
    getCategoryBySlug,
    getCategories,
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
    const categories = getCategories();
    const paths = categories.map(category => ({
        params: { categorySlug: category.slug },
    }));
    return {
        paths,
        fallback: false,
    };
}

export async function getStaticProps({ params }) {
    const category = getCategoryBySlug(params.categorySlug);
    if (!category) {
        return { notFound: true };
    }
    return {
        props: {
            category,
        },
    };
}

export default function CategoryPage({ category }) {
    const [brandFilter, setBrandFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
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

    const availableBrands = useMemo(() => {
        const brands = Array.from(
            new Set(category.products.map(product => product.brand).filter(Boolean))
        );
        return brands.sort();
    }, [category.products]);

    const filteredProducts = useMemo(() => {
        const normalizedTerm = searchTerm.trim().toLowerCase();
        return category.products.filter(product => {
            if (brandFilter && product.brand !== brandFilter) return false;
            if (!normalizedTerm) return true;
            const haystack = `${product.title} ${product.description} ${product.brand}`.toLowerCase();
            return haystack.includes(normalizedTerm);
        });
    }, [category.products, brandFilter, searchTerm]);

    const renderedProducts = filteredProducts.length
        ? filteredProducts
        : category.products;

    const addToCart = (product, variant) => {
        if (!product) return;
        const price = variant?.price ?? product.price ?? 0;
        const variantLabel = variant?.label;
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

    const openCart = () => {
        setCartOpen(true);
        setCheckoutStatus({ message: '', type: '' });
    };
    const closeCart = () => setCartOpen(false);

    return (
        <>
            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <nav className="text-sm text-gray-500" id="breadcrumb">
                        <Link href="/products" className="hover:underline">
                            Catalog
                        </Link>
                        <span className="mx-1">/</span>
                        <span className="text-gray-700 font-medium">{category.name}</span>
                    </nav>
                    <div className="flex items-center gap-3 flex-wrap">
                        <select
                            className="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-200"
                            value={brandFilter}
                            onChange={event => setBrandFilter(event.target.value)}
                        >
                            <option value="">All brands</option>
                            {availableBrands.map(brand => (
                                <option key={brand} value={brand}>
                                    {brand}
                                </option>
                            ))}
                        </select>
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={event => setSearchTerm(event.target.value)}
                            placeholder="Search products..."
                            className="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-200"
                        />
                        <button
                            type="button"
                            className="px-3 py-2 rounded-lg border hover:bg-gray-100"
                            onClick={() => {
                                setBrandFilter('');
                                setSearchTerm('');
                            }}
                        >
                            Reset filters
                        </button>
                    </div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {renderedProducts.map(product => (
                        <article
                            key={product.id}
                            className={`product-card ${
                                product.stock === 'out' ? 'product-out' : ''
                            }`}
                            data-tilt
                        >
                            <Link
                                href={`/products/${category.slug}/${product.id}`}
                                className="block"
                                aria-label={`View ${product.title}`}
                            >
                                <img
                                    src={product.image}
                                    alt={product.title}
                                    className="card-img"
                                />
                            </Link>
                            <div className="p-6 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {product.title}
                            </h3>
                            <span className="text-xs text-gray-500 uppercase">
                                {product.brand}
                            </span>
                        </div>
                        <p className="product-description">
                            {product.description}
                        </p>
                        <div className="product-price-row">
                            <span className="product-price">
                                {formatPrice(product.price)}
                            </span>
                            <span
                                className={`stock-badge ${
                                    product.stock === 'in'
                                        ? 'stock-badge--in'
                                        : 'stock-badge--out'
                                }`}
                            >
                                {product.stock === 'in'
                                    ? 'In stock'
                                    : 'Out of stock'}
                            </span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {product.usage.map(tag => (
                                <span
                                    key={`${product.id}-${tag}`}
                                    className="tag px-3 py-1 rounded-full text-xs"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <div className="product-actions mt-auto">
                            <Link
                                href={`/products/${category.slug}/${product.id}`}
                                className="product-detail-btn"
                            >
                                View details
                            </Link>
                            <button
                                type="button"
                                className="cart-submit px-4 py-2 text-sm"
                                onClick={() =>
                                    addToCart(
                                        product,
                                        product.variants[0]
                                    )
                                }
                                disabled={product.stock !== 'in'}
                            >
                                Add to cart
                            </button>
                        </div>
                            </div>
                        </article>
                    ))}
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
                        <h3 className="text-lg font-semibold text-gray-900">
                            Your order
                        </h3>
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
                            <div
                                className="cart-item"
                                key={item.id}
                                data-id={item.id}
                            >
                                <img src={item.image} alt={item.title} />
                                <div>
                                    <p className="cart-item-title">
                                        {item.title}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {item.variantLabel
                                            ? item.variantLabel
                                            : item.category}
                                    </p>
                                    <div className="cart-qty mt-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateQuantity(
                                                    item.id,
                                                    item.quantity - 1
                                                )
                                            }
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={event => {
                                                const value = Number(
                                                    event.target.value
                                                );
                                                if (!Number.isFinite(value)) return;
                                                updateQuantity(item.id, value);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateQuantity(
                                                    item.id,
                                                    item.quantity + 1
                                                )
                                            }
                                        >
                                            +
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
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
