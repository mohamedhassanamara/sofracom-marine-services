export const STOCK_LABEL = {
    in: 'In stock',
    out: 'Out of stock',
    'on-order': 'On order',
};

export const getStockBadgeClass = stock => {
    if (stock === 'in') return 'stock-badge--in';
    if (stock === 'on-order') return 'stock-badge--order';
    return 'stock-badge--out';
};
