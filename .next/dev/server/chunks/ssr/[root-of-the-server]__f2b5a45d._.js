module.exports = [
"[project]/hooks/useCart.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>useCart
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
;
const CART_STORAGE_KEY = 'sofracom.cart.v1';
const loadCartFromStorage = ()=>{
    if ("TURBOPACK compile-time truthy", 1) return [];
    //TURBOPACK unreachable
    ;
};
const saveCartToStorage = (cart)=>{
    if ("TURBOPACK compile-time truthy", 1) return;
    //TURBOPACK unreachable
    ;
};
const calcTotal = (cart)=>cart.reduce((total, item)=>{
        if (Number.isFinite(item.price)) {
            return total + item.quantity * item.price;
        }
        return total;
    }, 0);
function useCart() {
    const [cart, setCart] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(loadCartFromStorage);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        saveCartToStorage(cart);
    }, [
        cart
    ]);
    const addItem = (item)=>{
        setCart((existing)=>{
            const existingIdx = existing.findIndex((entry)=>entry.id === item.id);
            if (existingIdx >= 0) {
                return existing.map((entry)=>entry.id === item.id ? {
                        ...entry,
                        quantity: entry.quantity + item.quantity
                    } : entry);
            }
            return [
                ...existing,
                item
            ];
        });
    };
    const updateQuantity = (id, quantity)=>{
        setCart((existing)=>existing.map((entry)=>entry.id === id ? {
                    ...entry,
                    quantity: Math.max(1, quantity)
                } : entry).filter((entry)=>entry.quantity > 0));
    };
    const removeItem = (id)=>{
        setCart((existing)=>existing.filter((entry)=>entry.id !== id));
    };
    const resetCart = ()=>setCart([]);
    const count = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useMemo"])(()=>cart.reduce((sum, item)=>sum + (item.quantity || 0), 0), [
        cart
    ]);
    const total = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useMemo"])(()=>calcTotal(cart), [
        cart
    ]);
    const hasOnOrderItem = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useMemo"])(()=>cart.some((item)=>item.stock === 'on-order'), [
        cart
    ]);
    return {
        cart,
        addItem,
        updateQuantity,
        removeItem,
        count,
        total,
        resetCart,
        hasOnOrderItem
    };
}
}),
"[project]/lib/products.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getCategories",
    ()=>getCategories,
    "getCategoryBySlug",
    ()=>getCategoryBySlug,
    "getCategorySlugs",
    ()=>getCategorySlugs,
    "getProductById",
    ()=>getProductById,
    "getProductPaths",
    ()=>getProductPaths
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
;
;
const DATA_PATH = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(process.cwd(), 'public', 'assets', 'data', 'products.json');
const ensurePath = (value)=>{
    if (!value) return '';
    return value.startsWith('/') ? value : `/${value}`;
};
const slugify = (value)=>(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const normalizeProduct = (product, category)=>{
    const categorySlug = category.slug || slugify(category.name);
    const id = `${categorySlug}-${slugify(product.title)}`;
    const rawImages = Array.isArray(product.images) && product.images.length ? product.images : product.image ? [
        product.image
    ] : [];
    const images = rawImages.map(ensurePath).filter(Boolean);
    const fallbackImage = images[0] || ensurePath(product.image) || '/logo.jpeg';
    const variants = Array.isArray(product.variants) ? product.variants.map((variant)=>({
            label: variant.label || 'Variant',
            price: Number.isFinite(variant.price) ? variant.price : Number(variant.price) || 0
        })) : [];
    const price = Number.isFinite(product.price) && product.price > 0 ? product.price : variants[0]?.price || 0;
    return {
        ...product,
        id,
        categoryName: category.name,
        categorySlug,
        image: fallbackImage,
        images: images.length ? images : [
            fallbackImage
        ],
        datasheet: ensurePath(product.datasheet),
        variants,
        price,
        stock: product.stock || 'in',
        usage: Array.isArray(product.usage) ? product.usage : []
    };
};
const buildCategories = (rawCategories)=>(rawCategories || []).map((raw)=>{
        const slug = raw.slug || slugify(raw.name);
        return {
            ...raw,
            slug,
            image: ensurePath(raw.image),
            products: Array.isArray(raw.products) && raw.products.length ? raw.products.map((product)=>normalizeProduct(product, {
                    ...raw,
                    slug
                })) : []
        };
    });
function loadRawData() {
    const raw = __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
}
function getCategories() {
    const parsed = loadRawData();
    return buildCategories(parsed.categories || []);
}
function getCategoryBySlug(slug) {
    if (!slug) return null;
    const categories = getCategories();
    return categories.find((category)=>category.slug === slug) || null;
}
function getCategorySlugs() {
    const categories = getCategories();
    return categories.map((category)=>category.slug);
}
function getProductById(productId) {
    if (!productId) return null;
    const categories = getCategories();
    for (const category of categories){
        const product = category.products.find((prod)=>prod.id === productId);
        if (product) {
            return {
                product,
                category
            };
        }
    }
    return null;
}
function getProductPaths() {
    const categories = getCategories();
    return categories.flatMap((category)=>category.products.map((product)=>({
                categorySlug: category.slug,
                productId: product.id
            })));
}
}),
"[project]/pages/products/[categorySlug]/index.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CategoryPage,
    "getStaticPaths",
    ()=>getStaticPaths,
    "getStaticProps",
    ()=>getStaticProps
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/link.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$useCart$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/hooks/useCart.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$products$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/products.js [ssr] (ecmascript)");
;
;
;
;
;
const OUTPUT_CURRENCY = 'TND';
const FR_NUMBER_FORMAT = new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: OUTPUT_CURRENCY
});
const formatPrice = (value)=>{
    if (!Number.isFinite(value)) {
        return `${value || 0} ${OUTPUT_CURRENCY}`;
    }
    return FR_NUMBER_FORMAT.format(value);
};
async function getStaticPaths() {
    const categories = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$products$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["getCategories"])();
    const paths = categories.map((category)=>({
            params: {
                categorySlug: category.slug
            }
        }));
    return {
        paths,
        fallback: false
    };
}
async function getStaticProps({ params }) {
    const category = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$products$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["getCategoryBySlug"])(params.categorySlug);
    if (!category) {
        return {
            notFound: true
        };
    }
    return {
        props: {
            category
        }
    };
}
const STOCK_LABEL = {
    'in': 'In stock',
    'out': 'Out of stock',
    'on-order': 'On order'
};
function CategoryPage({ category }) {
    const [brandFilter, setBrandFilter] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])('');
    const [searchTerm, setSearchTerm] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])('');
    const [cartOpen, setCartOpen] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    const [checkoutStatus, setCheckoutStatus] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])({
        message: '',
        type: ''
    });
    const [checkoutSubmitting, setCheckoutSubmitting] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    const [checkoutForm, setCheckoutForm] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])({
        name: '',
        phone: '',
        address: '',
        notes: ''
    });
    const { cart, addItem, updateQuantity, removeItem, total, count, hasOnOrderItem } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$useCart$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"])();
    const availableBrands = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useMemo"])(()=>{
        const brands = Array.from(new Set(category.products.map((product)=>product.brand).filter(Boolean)));
        return brands.sort();
    }, [
        category.products
    ]);
    const filteredProducts = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useMemo"])(()=>{
        const normalizedTerm = searchTerm.trim().toLowerCase();
        return category.products.filter((product)=>{
            if (brandFilter && product.brand !== brandFilter) return false;
            if (!normalizedTerm) return true;
            const haystack = `${product.title} ${product.description} ${product.brand}`.toLowerCase();
            return haystack.includes(normalizedTerm);
        });
    }, [
        category.products,
        brandFilter,
        searchTerm
    ]);
    const renderedProducts = filteredProducts.length ? filteredProducts : category.products;
    const addToCart = (product, variant)=>{
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
            stock: product.stock
        });
        setCartOpen(true);
    };
    const handleCheckoutInput = (event)=>{
        const { name, value } = event.target;
        setCheckoutForm((form)=>({
                ...form,
                [name]: value
            }));
    };
    const handleCheckoutSubmit = async (event)=>{
        event.preventDefault();
        if (!cart.length) {
            setCheckoutStatus({
                message: 'Cart is empty',
                type: 'error'
            });
            return;
        }
        if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) {
            setCheckoutStatus({
                message: 'Name, phone, and address are required.',
                type: 'error'
            });
            return;
        }
        setCheckoutSubmitting(true);
        setCheckoutStatus({
            message: 'Sending order…',
            type: ''
        });
        const payload = {
            customer: checkoutForm,
            items: cart.map((item)=>({
                    id: item.id,
                    title: item.title,
                    price: item.price,
                    quantity: item.quantity,
                    image: item.image,
                    category: item.category,
                    variantLabel: item.variantLabel
                })),
            total,
            currency: OUTPUT_CURRENCY
        };
        try {
            const response = await fetch('/api/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!response.ok || !result.ok) {
                throw new Error(result.error || 'Unable to place order');
            }
            setCheckoutForm({
                name: '',
                phone: '',
                address: '',
                notes: ''
            });
            setCheckoutStatus({
                message: 'Order submitted! We will confirm shortly.',
                type: 'success'
            });
        } catch (error) {
            console.error('[order] submit failed', error);
            setCheckoutStatus({
                message: error.message || 'Unable to submit order.',
                type: 'error'
            });
        } finally{
            setCheckoutSubmitting(false);
        }
    };
    const openCart = ()=>{
        setCartOpen(true);
        setCheckoutStatus({
            message: '',
            type: ''
        });
    };
    const closeCart = ()=>setCartOpen(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("main", {
                className: "max-w-7xl mx-auto px-6 py-12",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-center justify-between gap-3 mb-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("nav", {
                                className: "text-sm text-gray-500",
                                id: "breadcrumb",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        href: "/products",
                                        className: "hover:underline",
                                        children: "Catalog"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 176,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        className: "mx-1",
                                        children: "/"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 179,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        className: "text-gray-700 font-medium",
                                        children: category.name
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 180,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                lineNumber: 175,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3 flex-wrap",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("select", {
                                        className: "px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-200",
                                        value: brandFilter,
                                        onChange: (event)=>setBrandFilter(event.target.value),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("option", {
                                                value: "",
                                                children: "All brands"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                lineNumber: 188,
                                                columnNumber: 29
                                            }, this),
                                            availableBrands.map((brand)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("option", {
                                                    value: brand,
                                                    children: brand
                                                }, brand, false, {
                                                    fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                    lineNumber: 190,
                                                    columnNumber: 33
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 183,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                        type: "search",
                                        value: searchTerm,
                                        onChange: (event)=>setSearchTerm(event.target.value),
                                        placeholder: "Search products...",
                                        className: "px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-200"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 195,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        className: "px-3 py-2 rounded-lg border hover:bg-gray-100",
                                        onClick: ()=>{
                                            setBrandFilter('');
                                            setSearchTerm('');
                                        },
                                        children: "Reset filters"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 202,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                lineNumber: 182,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                        lineNumber: 174,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-6",
                        children: renderedProducts.map((product)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("article", {
                                className: `product-card ${product.stock === 'out' ? 'product-out' : ''}`,
                                "data-tilt": true,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        href: `/products/${category.slug}/${product.id}`,
                                        className: "block",
                                        "aria-label": `View ${product.title}`,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("img", {
                                            src: product.image,
                                            alt: product.title,
                                            className: "card-img"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/products/[categorySlug]/index.js",
                                            lineNumber: 228,
                                            columnNumber: 33
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 223,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        className: "p-6 flex flex-col gap-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h3", {
                                                        className: "text-lg font-semibold text-gray-900",
                                                        children: product.title
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                        lineNumber: 236,
                                                        columnNumber: 29
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                        className: "text-xs text-gray-500 uppercase",
                                                        children: product.brand
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                        lineNumber: 239,
                                                        columnNumber: 29
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                lineNumber: 235,
                                                columnNumber: 25
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                                className: "product-description",
                                                children: product.description
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                lineNumber: 243,
                                                columnNumber: 25
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                className: "product-price-row",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                        className: "product-price",
                                                        children: formatPrice(product.price)
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                        lineNumber: 247,
                                                        columnNumber: 29
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                        className: `stock-badge ${product.stock === 'in' ? 'stock-badge--in' : product.stock === 'on-order' ? 'stock-badge--order' : 'stock-badge--out'}`,
                                                        children: STOCK_LABEL[product.stock] || 'Unknown'
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                        lineNumber: 250,
                                                        columnNumber: 29
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                lineNumber: 246,
                                                columnNumber: 25
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                className: "flex gap-2 flex-wrap",
                                                children: product.usage.map((tag)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                        className: "tag px-3 py-1 rounded-full text-xs",
                                                        children: tag
                                                    }, `${product.id}-${tag}`, false, {
                                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                        lineNumber: 264,
                                                        columnNumber: 33
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                lineNumber: 262,
                                                columnNumber: 25
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                className: "product-actions mt-auto",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                        href: `/products/${category.slug}/${product.id}`,
                                                        className: "product-detail-btn",
                                                        children: "View details"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                        lineNumber: 273,
                                                        columnNumber: 29
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        className: "cart-submit px-4 py-2 text-sm",
                                                        onClick: ()=>addToCart(product, product.variants[0]),
                                                        disabled: product.stock !== 'in',
                                                        children: "Add to cart"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                        lineNumber: 279,
                                                        columnNumber: 29
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                lineNumber: 272,
                                                columnNumber: 25
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 234,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, product.id, true, {
                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                lineNumber: 216,
                                columnNumber: 25
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                        lineNumber: 214,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/products/[categorySlug]/index.js",
                lineNumber: 173,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                id: "cartFab",
                className: "cart-fab",
                type: "button",
                onClick: openCart,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                        children: "Cart"
                    }, void 0, false, {
                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                        lineNumber: 299,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                        className: "px-2 py-1 rounded-full bg-white/15 text-sm font-semibold",
                        children: count
                    }, void 0, false, {
                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                        lineNumber: 300,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/products/[categorySlug]/index.js",
                lineNumber: 298,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                id: "cartOverlay",
                className: `cart-overlay ${cartOpen ? 'active' : ''}`,
                onClick: closeCart
            }, void 0, false, {
                fileName: "[project]/pages/products/[categorySlug]/index.js",
                lineNumber: 304,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("aside", {
                id: "cartDrawer",
                className: `cart-drawer ${cartOpen ? 'open' : ''}`,
                "aria-hidden": !cartOpen,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "cart-header",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h3", {
                                        className: "text-lg font-semibold text-gray-900",
                                        children: "Your order"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 316,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-gray-500",
                                        children: "Review items then confirm your details."
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 319,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                lineNumber: 315,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                id: "cartClose",
                                type: "button",
                                "aria-label": "Close cart",
                                className: "text-2xl leading-none text-gray-500 hover:text-gray-800",
                                onClick: closeCart,
                                children: "×"
                            }, void 0, false, {
                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                lineNumber: 323,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                        lineNumber: 314,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "cart-body",
                        id: "cartItems",
                        children: cart.length ? cart.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "cart-item",
                                "data-id": item.id,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("img", {
                                        src: item.image,
                                        alt: item.title
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 341,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                                className: "cart-item-title",
                                                children: item.title
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                lineNumber: 343,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-gray-500",
                                                children: item.variantLabel ? item.variantLabel : item.category
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                lineNumber: 346,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                className: "cart-qty mt-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>updateQuantity(item.id, item.quantity - 1),
                                                        children: "−"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                        lineNumber: 352,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                                        type: "number",
                                                        min: "1",
                                                        value: item.quantity,
                                                        onChange: (event)=>{
                                                            const value = Number(event.target.value);
                                                            if (!Number.isFinite(value)) return;
                                                            updateQuantity(item.id, value);
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                        lineNumber: 363,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>updateQuantity(item.id, item.quantity + 1),
                                                        children: "+"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                        lineNumber: 375,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>removeItem(item.id),
                                                        className: "text-xs text-red-500 ml-3",
                                                        children: "Remove"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                        lineNumber: 386,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                                lineNumber: 351,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 342,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, item.id, true, {
                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                lineNumber: 336,
                                columnNumber: 29
                            }, this)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                            className: "empty-cart",
                            children: "Your cart is empty."
                        }, void 0, false, {
                            fileName: "[project]/pages/products/[categorySlug]/index.js",
                            lineNumber: 398,
                            columnNumber: 25
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                        lineNumber: 333,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "cart-summary",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "cart-summary-row",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        children: "Total"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 403,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        children: formatPrice(total)
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 404,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                lineNumber: 402,
                                columnNumber: 21
                            }, this),
                            hasOnOrderItem && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                className: "text-xs text-orange-500 mt-2",
                                children: "Delivery may take longer for on-order items."
                            }, void 0, false, {
                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                lineNumber: 407,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                className: `cart-alert ${checkoutStatus.type}`,
                                role: "status",
                                children: checkoutStatus.message
                            }, void 0, false, {
                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                lineNumber: 411,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                        lineNumber: 401,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("form", {
                        id: "checkoutForm",
                        className: "cart-form",
                        onSubmit: handleCheckoutSubmit,
                        noValidate: true,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        children: "Full name"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 422,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                        type: "text",
                                        name: "name",
                                        value: checkoutForm.name,
                                        onChange: handleCheckoutInput,
                                        required: true
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 423,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                lineNumber: 421,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        children: "Phone"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 432,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                        type: "tel",
                                        name: "phone",
                                        value: checkoutForm.phone,
                                        onChange: handleCheckoutInput,
                                        required: true
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 433,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                lineNumber: 431,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        children: "Delivery address"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 442,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("textarea", {
                                        name: "address",
                                        rows: "2",
                                        value: checkoutForm.address,
                                        onChange: handleCheckoutInput,
                                        required: true
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 443,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                lineNumber: 441,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        children: "Notes (optional)"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 452,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("textarea", {
                                        name: "notes",
                                        rows: "2",
                                        value: checkoutForm.notes,
                                        onChange: handleCheckoutInput
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                                        lineNumber: 453,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                lineNumber: 451,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                id: "cartSubmitBtn",
                                type: "submit",
                                className: "cart-submit",
                                disabled: checkoutSubmitting,
                                children: checkoutSubmitting ? 'Sending…' : 'Send order'
                            }, void 0, false, {
                                fileName: "[project]/pages/products/[categorySlug]/index.js",
                                lineNumber: 460,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/products/[categorySlug]/index.js",
                        lineNumber: 415,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/products/[categorySlug]/index.js",
                lineNumber: 309,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true);
}
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__f2b5a45d._.js.map