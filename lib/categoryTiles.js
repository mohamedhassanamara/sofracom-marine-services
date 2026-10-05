// The 1–3 products drawn on a category tile (home, shop menu, /products): the ones picked in
// the admin (category.featuredProductIds), else in-stock products with a photo, one per brand.
export function categoryTileProducts(category, count = 3) {
    const products = category?.products || [];
    const picked = (category?.featuredProductIds || []).map(id => products.find(product => product.id === id)).filter(Boolean);
    if (picked.length) return picked.slice(0, count);
    const brands = new Set();
    return products
        .filter(product => product.stock !== 'out' && product.image && !product.image.includes('logo'))
        .filter(product => (brands.has(product.brand) ? false : brands.add(product.brand)))
        .slice(0, count);
}
