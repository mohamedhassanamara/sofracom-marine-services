// Order constants shared by the cart UI and the order API.
export const DELIVERY_FEE = 7;
export const CURRENCY = 'TND';

const PRICE_FORMAT = new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: CURRENCY,
});

export const formatPrice = value => {
    if (!Number.isFinite(value)) {
        return `${value || 0} ${CURRENCY}`;
    }
    return PRICE_FORMAT.format(value);
};
