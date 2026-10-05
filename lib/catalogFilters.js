// Category page filters as plain functions (tested in tests/unit/catalog-filters.test.mjs).
// The URL holds them: ?brand=JOTUN&brand=…&stock=in&min=100&max=500&sort=price&q=…
// Retired params (use=, price=) are simply ignored, so old links still load.

export const SORTS = ['name', 'name-desc', 'price', 'price-desc'];

const asList = value => (Array.isArray(value) ? value : value ? [value] : []);

// Every price a product can be bought at (its options' prices, else its own price).
export function productPrices(product) {
    const variants = Array.isArray(product?.variants) && product.variants.length ? product.variants : null;
    return (variants ? variants.map(variant => variant.price) : [product?.price]).map(Number).filter(price => Number.isFinite(price) && price > 0);
}

// "in" when any option is in stock, else "on-order" when any is, else "out".
export function productStock(product) {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (!variants.length) return product?.stock || 'in';
    const stocks = variants.map(variant => variant.stock);
    return stocks.includes('in') ? 'in' : stocks.includes('on-order') ? 'on-order' : 'out';
}

// The slider's range for a list of products: whole dinars around the lowest and highest price.
export function priceBounds(products) {
    const prices = products.flatMap(productPrices);
    if (!prices.length) return { min: 0, max: 0 };
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
}

// min/max from the URL: whole numbers inside the bounds, in order; null = that end is open
// (absent, invalid, or at the bound).
export function parsePriceRange(query, bounds) {
    const read = value => {
        const number = Math.round(Number(Array.isArray(value) ? value[0] : value));
        return value === undefined || value === '' || !Number.isFinite(number) ? null : Math.min(bounds.max, Math.max(bounds.min, number));
    };
    let min = read(query.min);
    let max = read(query.max);
    if (min !== null && max !== null && min > max) [min, max] = [max, min];
    return { min: min !== null && min > bounds.min ? min : null, max: max !== null && max < bounds.max ? max : null };
}

export function parseFilters(query, bounds) {
    return {
        brands: asList(query.brand),
        inStock: query.stock === 'in',
        ...parsePriceRange(query, bounds),
        sort: SORTS.includes(query.sort) ? query.sort : 'name',
        q: typeof query.q === 'string' ? query.q : '',
    };
}

// The query for a set of filters (defaults left out, so a clean category URL stays clean).
export function filterQuery(filters, bounds) {
    const query = {};
    if (filters.brands?.length) query.brand = filters.brands;
    if (filters.inStock) query.stock = 'in';
    const { min, max } = parsePriceRange({ min: filters.min ?? undefined, max: filters.max ?? undefined }, bounds);
    if (min !== null) query.min = String(min);
    if (max !== null) query.max = String(max);
    if (filters.sort && filters.sort !== 'name') query.sort = filters.sort;
    if (filters.q) query.q = filters.q;
    return query;
}

// A product matches a price range when any of its options costs within it.
export function matchesPrice(product, min, max) {
    if (min === null && max === null) return true;
    return productPrices(product).some(price => (min === null || price >= min) && (max === null || price <= max));
}

// Brand, stock and price (search and sorting stay with the page: they depend on the language).
export function filterProducts(products, filters) {
    return products.filter(
        product =>
            (!filters.brands?.length || filters.brands.includes(product.brand)) &&
            (!filters.inStock || productStock(product) === 'in') &&
            matchesPrice(product, filters.min ?? null, filters.max ?? null)
    );
}
