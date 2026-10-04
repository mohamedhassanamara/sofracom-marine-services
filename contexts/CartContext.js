import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Cart lines live in localStorage so they survive reloads, sign-in and sign-out.
// Lines saved before stable product ids only have `id`; the order API resolves those.
const CART_STORAGE_KEY = 'sofracom.cart.v1';

const loadCartFromStorage = () => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(CART_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(item => ({
            ...item,
            quantity:
                Number.isFinite(item.quantity) && item.quantity > 0
                    ? Math.max(1, Math.trunc(item.quantity))
                    : 1,
        }));
    } catch (error) {
        console.warn('[cart] failed to read storage', error);
        return [];
    }
};

const saveCartToStorage = cart => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
        console.warn('[cart] failed to persist', error);
    }
};

const calcTotal = cart =>
    cart.reduce((total, item) => {
        if (Number.isFinite(item.price)) {
            return total + item.quantity * item.price;
        }
        return total;
    }, 0);

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const [cart, setCart] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // Read storage after mount so server and client render the same markup.
    useEffect(() => {
        setCart(loadCartFromStorage());
        setLoaded(true);
    }, []);

    useEffect(() => {
        if (loaded) saveCartToStorage(cart);
    }, [cart, loaded]);

    const addItem = useCallback(item => {
        setCart(existing => {
            const existingIdx = existing.findIndex(entry => entry.id === item.id);
            if (existingIdx >= 0) {
                return existing.map(entry =>
                    entry.id === item.id
                        ? { ...entry, quantity: entry.quantity + item.quantity }
                        : entry
                );
            }
            return [...existing, item];
        });
    }, []);

    // Adds one unit of a (localized) product/variant and opens the drawer.
    const addProduct = useCallback(
        (product, variant, variantIndex) => {
            const stock = variant?.stock ?? product.stock ?? 'in';
            if (stock === 'out') return;
            const variantLabel = variant?.label;
            addItem({
                id: variantLabel ? `${product.id}-${variantLabel}` : product.id,
                productId: product.id,
                variantIndex: variant ? variantIndex : null,
                variantLabel,
                title: product.title,
                price: variant?.price ?? product.price ?? 0,
                quantity: 1,
                image: product.image,
                category: product.categoryName,
                categorySlug: product.categorySlug,
                brand: product.brand,
                stock,
            });
            setIsOpen(true);
        },
        [addItem]
    );

    const updateQuantity = useCallback((id, quantity) => {
        setCart(existing =>
            existing.map(entry =>
                entry.id === id ? { ...entry, quantity: Math.max(1, quantity) } : entry
            )
        );
    }, []);

    const removeItem = useCallback(id => {
        setCart(existing => existing.filter(entry => entry.id !== id));
    }, []);

    const resetCart = useCallback(() => setCart([]), []);
    const openCart = useCallback(() => setIsOpen(true), []);
    const closeCart = useCallback(() => setIsOpen(false), []);

    const value = useMemo(
        () => ({
            cart,
            loaded,
            addItem,
            addProduct,
            updateQuantity,
            removeItem,
            resetCart,
            count: cart.reduce((sum, item) => sum + (item.quantity || 0), 0),
            total: calcTotal(cart),
            hasOnOrderItem: cart.some(item => item.stock === 'on-order'),
            isOpen,
            openCart,
            closeCart,
        }),
        [cart, loaded, addItem, addProduct, updateQuantity, removeItem, resetCart, isOpen, openCart, closeCart]
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used inside CartProvider');
    return context;
}
