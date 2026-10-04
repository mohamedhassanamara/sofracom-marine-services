// Server-side cart pricing. Prices, titles and stock always come from the catalog
// JSON; the browser only says which product, which variant and how many.
import { getCategories } from '../products.js';
import { DELIVERY_FEE, CURRENCY } from '../constants.js';
import { HttpError } from './http.js';

const MAX_LINES = 100;
const MAX_QUANTITY = 999;

let index = null;

function getIndex() {
    if (index) return index;
    const byId = new Map();
    getCategories().forEach(category => {
        category.products.forEach(product => {
            const entry = { product, category };
            byId.set(product.id, entry);
            if (product.legacyId) byId.set(product.legacyId, entry);
        });
    });
    index = byId;
    return index;
}

export function findProduct(productId) {
    if (!productId || typeof productId !== 'string') return null;
    return getIndex().get(productId) || null;
}

// Carts saved before stable ids only carry `id` = `${productId}` or
// `${productId}-${variantLabel}`, where productId may be a legacy id.
function resolveLegacyLine(itemId) {
    const byId = getIndex();
    const direct = byId.get(itemId);
    if (direct) return { entry: direct, variantLabel: null };
    let best = null;
    for (const [key, entry] of byId) {
        if (itemId.startsWith(`${key}-`) && (!best || key.length > best.key.length)) {
            best = { key, entry };
        }
    }
    if (!best) return null;
    return { entry: best.entry, variantLabel: itemId.slice(best.key.length + 1) };
}

function pickVariant(product, { variantIndex, variantLabel }) {
    const variants = product.variants || [];
    if (!variants.length) return { variant: null, index: null };
    if (Number.isInteger(variantIndex) && variants[variantIndex]) {
        const candidate = variants[variantIndex];
        if (!variantLabel || candidate.label === variantLabel) {
            return { variant: candidate, index: variantIndex };
        }
    }
    if (variantLabel) {
        const found = variants.findIndex(variant => variant.label === variantLabel);
        if (found >= 0) return { variant: variants[found], index: found };
    }
    return null;
}

const roundMoney = value => Math.round(value * 1000) / 1000;

// Returns normalised order lines and totals, or throws a 400 naming the problem.
export function priceCart(rawItems) {
    if (!Array.isArray(rawItems) || !rawItems.length) {
        throw new HttpError(400, 'Cart is empty', 'cart/empty');
    }
    if (rawItems.length > MAX_LINES) {
        throw new HttpError(400, 'Too many items in cart', 'cart/too-large');
    }

    const lines = new Map();
    rawItems.forEach(raw => {
        const item = raw && typeof raw === 'object' ? raw : {};
        let entry = null;
        let variantLabel = typeof item.variantLabel === 'string' ? item.variantLabel : null;
        if (item.productId) {
            entry = findProduct(String(item.productId));
        } else if (item.id) {
            const legacy = resolveLegacyLine(String(item.id));
            if (legacy) {
                entry = legacy.entry;
                variantLabel = variantLabel || legacy.variantLabel;
            }
        }
        if (!entry) {
            throw new HttpError(400, 'An item in your cart is no longer available. Please remove it and try again.', 'cart/unknown-product');
        }
        const { product } = entry;
        const picked = pickVariant(product, {
            variantIndex: Number.isInteger(item.variantIndex) ? item.variantIndex : null,
            variantLabel,
        });
        if (!picked) {
            throw new HttpError(400, `"${product.title}" is no longer available in that size. Please remove it and try again.`, 'cart/unknown-variant');
        }
        const stock = picked.variant?.stock ?? product.stock ?? 'in';
        if (stock === 'out') {
            throw new HttpError(400, `"${product.title}" is out of stock. Please remove it and try again.`, 'cart/out-of-stock');
        }
        const quantity = Math.trunc(Number(item.quantity));
        if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
            throw new HttpError(400, 'Invalid quantity', 'cart/invalid-quantity');
        }
        const unitPrice = Number(picked.variant?.price ?? product.price) || 0;
        const key = `${product.id}:${picked.index ?? ''}`;
        const existing = lines.get(key);
        if (existing) {
            existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + quantity);
            existing.lineTotal = roundMoney(existing.unitPrice * existing.quantity);
            return;
        }
        lines.set(key, {
            productId: product.id,
            variantIndex: picked.index,
            variantLabel: picked.variant?.label || null,
            title: product.title,
            image: product.image,
            category: product.categoryName,
            categorySlug: product.categorySlug,
            unitPrice,
            quantity,
            lineTotal: roundMoney(unitPrice * quantity),
            stock,
        });
    });

    const items = [...lines.values()];
    const subtotal = roundMoney(items.reduce((sum, line) => sum + line.lineTotal, 0));
    return {
        items,
        productIds: [...new Set(items.map(line => line.productId))],
        subtotal,
        deliveryFee: DELIVERY_FEE,
        total: roundMoney(subtotal + DELIVERY_FEE),
        currency: CURRENCY,
        hasOnOrderItem: items.some(line => line.stock === 'on-order'),
    };
}
