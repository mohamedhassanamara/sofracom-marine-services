import { useEffect, useMemo, useState } from 'react';

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

export default function useCart() {
    const [cart, setCart] = useState(loadCartFromStorage);

    useEffect(() => {
        saveCartToStorage(cart);
    }, [cart]);

    const addItem = item => {
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
    };

    const updateQuantity = (id, quantity) => {
        setCart(existing =>
            existing
                .map(entry =>
                    entry.id === id
                        ? { ...entry, quantity: Math.max(1, quantity) }
                        : entry
                )
                .filter(entry => entry.quantity > 0)
        );
    };

    const removeItem = id => {
        setCart(existing => existing.filter(entry => entry.id !== id));
    };

    const resetCart = () => setCart([]);

    const count = useMemo(
        () => cart.reduce((sum, item) => sum + (item.quantity || 0), 0),
        [cart]
    );

    const total = useMemo(() => calcTotal(cart), [cart]);

    return {
        cart,
        addItem,
        updateQuantity,
        removeItem,
        count,
        total,
        resetCart,
    };
}
