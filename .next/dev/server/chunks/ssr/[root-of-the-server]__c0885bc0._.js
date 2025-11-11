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
    return {
        cart,
        addItem,
        updateQuantity,
        removeItem,
        count,
        total,
        resetCart
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
"[project]/pages/products/[categorySlug]/[productId].js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ProductDetailPage,
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
    const paths = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$products$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["getProductPaths"])().map((path)=>({
            params: {
                categorySlug: path.categorySlug,
                productId: path.productId
            }
        }));
    return {
        paths,
        fallback: false
    };
}
async function getStaticProps({ params }) {
    const entry = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$products$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["getProductById"])(params.productId);
    if (!entry || entry.category.slug !== params.categorySlug) {
        return {
            notFound: true
        };
    }
    return {
        props: {
            product: entry.product,
            category: entry.category
        }
    };
}
function ProductDetailPage({ product, category }) {
    const [selectedVariantIndex, setSelectedVariantIndex] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(0);
    const [activeImageIndex, setActiveImageIndex] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(0);
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
    const { cart, addItem, updateQuantity, removeItem, total, count } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$useCart$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"])();
    const detailVariant = product.variants[selectedVariantIndex] ?? null;
    const detailPrice = detailVariant?.price ?? product.price ?? 0;
    const detailImage = product.images[activeImageIndex] || product.image;
    const addToCart = ()=>{
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
            variantLabel
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
    const updateCartQty = (id, quantity)=>updateQuantity(id, quantity);
    const removeCart = (id)=>removeItem(id);
    const openCart = ()=>{
        setCartOpen(true);
        setCheckoutStatus({
            message: '',
            type: ''
        });
    };
    const closeCart = ()=>setCartOpen(false);
    const description = product.description || '';
    const READ_MORE_LENGTH = 320;
    const [showFullDescription, setShowFullDescription] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    const isLongDescription = description.length > READ_MORE_LENGTH;
    const previewDescription = description.slice(0, READ_MORE_LENGTH);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("main", {
                className: "max-w-6xl mx-auto px-6 py-12",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "flex flex-col gap-4 mb-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                className: "text-sm text-gray-500 uppercase tracking-wide",
                                children: "Product detail"
                            }, void 0, false, {
                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                lineNumber: 163,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2 text-sm text-gray-600",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        href: "/products",
                                        className: "hover:underline",
                                        children: "Catalog"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 167,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        children: "/"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 170,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        href: `/products/${category.slug}`,
                                        className: "hover:underline",
                                        children: category.name
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 171,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        children: "/"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 174,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        className: "font-semibold text-gray-700",
                                        children: product.title
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 175,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                lineNumber: 166,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                        lineNumber: 162,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "grid lg:grid-cols-[1.1fr,0.9fr] gap-10",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "bg-white rounded-3xl shadow-lg border border-gray-100 p-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("img", {
                                        src: detailImage,
                                        alt: product.title,
                                        className: "w-full h-96 object-contain rounded-2xl bg-gray-50"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 180,
                                        columnNumber: 25
                                    }, this),
                                    product.images.length > 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        className: "flex flex-wrap gap-3 mt-4",
                                        children: product.images.map((src, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: ()=>setActiveImageIndex(index),
                                                className: `w-20 h-20 rounded-2xl border ${activeImageIndex === index ? 'border-blue-500' : 'border-gray-200'}`,
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("img", {
                                                    src: src,
                                                    alt: `${product.title}-${index}`,
                                                    className: "w-full h-full object-cover rounded-2xl"
                                                }, void 0, false, {
                                                    fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                                    lineNumber: 198,
                                                    columnNumber: 41
                                                }, this)
                                            }, src, false, {
                                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                                lineNumber: 188,
                                                columnNumber: 37
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 186,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                lineNumber: 179,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "space-y-5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-gray-500 uppercase tracking-wide",
                                                children: product.categoryName
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                                lineNumber: 210,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h1", {
                                                className: "text-3xl font-bold text-gray-900",
                                                children: product.title
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                                lineNumber: 213,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                                className: "text-sm text-gray-500 mt-1",
                                                children: product.brand
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                                lineNumber: 216,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 209,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        className: "flex flex-wrap gap-2",
                                        children: product.usage.map((tag)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                className: "tag px-3 py-1 rounded-full text-xs",
                                                children: tag
                                            }, `${product.id}-tag-${tag}`, false, {
                                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                                lineNumber: 220,
                                                columnNumber: 33
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 218,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-4",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                className: "text-4xl font-bold text-gray-900",
                                                children: formatPrice(detailPrice)
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                                lineNumber: 229,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                className: `stock-badge ${product.stock === 'in' ? 'stock-badge--in' : 'stock-badge--out'}`,
                                                children: product.stock === 'in' ? 'In stock' : 'Out of stock'
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                                lineNumber: 232,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 228,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        className: "flex flex-wrap gap-2",
                                        children: product.variants.length ? product.variants.map((variant, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                className: `detail-variant-btn ${selectedVariantIndex === index ? 'active' : ''}`,
                                                onClick: ()=>setSelectedVariantIndex(index),
                                                children: [
                                                    variant.label,
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                        children: formatPrice(variant.price)
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                                        lineNumber: 256,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, `${variant.label}-${index}`, true, {
                                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                                lineNumber: 245,
                                                columnNumber: 37
                                            }, this)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                            className: "text-sm text-gray-500",
                                            children: "Single configuration"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                            lineNumber: 260,
                                            columnNumber: 33
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 242,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-gray-700 leading-relaxed",
                                        children: showFullDescription ? description : `${previewDescription}${isLongDescription ? '…' : ''}`
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 265,
                                        columnNumber: 25
                                    }, this),
                                    isLongDescription && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        className: "text-blue-600 hover:underline text-sm font-semibold",
                                        onClick: ()=>setShowFullDescription((prev)=>!prev),
                                        children: showFullDescription ? 'Show less' : 'Read more'
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 271,
                                        columnNumber: 29
                                    }, this),
                                    product.datasheet && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("a", {
                                        href: product.datasheet,
                                        target: "_blank",
                                        rel: "noreferrer",
                                        className: "datasheet-link",
                                        children: "Download datasheet"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 280,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        className: "w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 transition",
                                        onClick: addToCart,
                                        disabled: product.stock !== 'in',
                                        children: "Add to cart"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 289,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                        className: `quote-status ${checkoutStatus.type} mt-2 text-sm ${checkoutStatus.message ? '' : 'hidden'}`,
                                        "aria-live": "polite",
                                        children: checkoutStatus.message
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 297,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                lineNumber: 208,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                        lineNumber: 178,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                lineNumber: 161,
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
                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                        lineNumber: 309,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                        className: "px-2 py-1 rounded-full bg-white/15 text-sm font-semibold",
                        children: count
                    }, void 0, false, {
                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                        lineNumber: 310,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                lineNumber: 308,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                id: "cartOverlay",
                className: `cart-overlay ${cartOpen ? 'active' : ''}`,
                onClick: closeCart
            }, void 0, false, {
                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                lineNumber: 314,
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
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 326,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-gray-500",
                                        children: "Review items then confirm your details."
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 327,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                lineNumber: 325,
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
                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                lineNumber: 331,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                        lineNumber: 324,
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
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 345,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                                className: "cart-item-title",
                                                children: item.title
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                                lineNumber: 347,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-gray-500",
                                                children: item.variantLabel ? item.variantLabel : item.category
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                                lineNumber: 348,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                className: "cart-qty mt-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>updateCartQty(item.id, item.quantity - 1),
                                                        children: "−"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
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
                                                            updateCartQty(item.id, value);
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                                        lineNumber: 360,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>updateCartQty(item.id, item.quantity + 1),
                                                        children: "+"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                                        lineNumber: 370,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>removeCart(item.id),
                                                        className: "text-xs text-red-500 ml-3",
                                                        children: "Remove"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                                        lineNumber: 378,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                                lineNumber: 351,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 346,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, item.id, true, {
                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                lineNumber: 344,
                                columnNumber: 29
                            }, this)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                            className: "empty-cart",
                            children: "Your cart is empty."
                        }, void 0, false, {
                            fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                            lineNumber: 390,
                            columnNumber: 25
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                        lineNumber: 341,
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
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 395,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        children: formatPrice(total)
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 396,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                lineNumber: 394,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                className: `cart-alert ${checkoutStatus.type}`,
                                role: "status",
                                children: checkoutStatus.message
                            }, void 0, false, {
                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                lineNumber: 398,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                        lineNumber: 393,
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
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 409,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                        type: "text",
                                        name: "name",
                                        value: checkoutForm.name,
                                        onChange: handleCheckoutInput,
                                        required: true
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 410,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                lineNumber: 408,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        children: "Phone"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 419,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                        type: "tel",
                                        name: "phone",
                                        value: checkoutForm.phone,
                                        onChange: handleCheckoutInput,
                                        required: true
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 420,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                lineNumber: 418,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        children: "Delivery address"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 429,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("textarea", {
                                        name: "address",
                                        rows: "2",
                                        value: checkoutForm.address,
                                        onChange: handleCheckoutInput,
                                        required: true
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 430,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                lineNumber: 428,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        children: "Notes (optional)"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 439,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("textarea", {
                                        name: "notes",
                                        rows: "2",
                                        value: checkoutForm.notes,
                                        onChange: handleCheckoutInput
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                        lineNumber: 440,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                lineNumber: 438,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                id: "cartSubmitBtn",
                                type: "submit",
                                className: "cart-submit",
                                disabled: checkoutSubmitting,
                                children: checkoutSubmitting ? 'Sending…' : 'Send order'
                            }, void 0, false, {
                                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                                lineNumber: 447,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                        lineNumber: 402,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/products/[categorySlug]/[productId].js",
                lineNumber: 319,
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

//# sourceMappingURL=%5Broot-of-the-server%5D__c0885bc0._.js.map