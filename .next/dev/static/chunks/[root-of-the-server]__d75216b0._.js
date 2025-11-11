(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[turbopack]/browser/dev/hmr-client/hmr-client.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/// <reference path="../../../shared/runtime-types.d.ts" />
/// <reference path="../../runtime/base/dev-globals.d.ts" />
/// <reference path="../../runtime/base/dev-protocol.d.ts" />
/// <reference path="../../runtime/base/dev-extensions.ts" />
__turbopack_context__.s([
    "connect",
    ()=>connect,
    "setHooks",
    ()=>setHooks,
    "subscribeToUpdate",
    ()=>subscribeToUpdate
]);
function connect({ addMessageListener, sendMessage, onUpdateError = console.error }) {
    addMessageListener((msg)=>{
        switch(msg.type){
            case 'turbopack-connected':
                handleSocketConnected(sendMessage);
                break;
            default:
                try {
                    if (Array.isArray(msg.data)) {
                        for(let i = 0; i < msg.data.length; i++){
                            handleSocketMessage(msg.data[i]);
                        }
                    } else {
                        handleSocketMessage(msg.data);
                    }
                    applyAggregatedUpdates();
                } catch (e) {
                    console.warn('[Fast Refresh] performing full reload\n\n' + "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" + 'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' + 'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' + 'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' + 'Fast Refresh requires at least one parent function component in your React tree.');
                    onUpdateError(e);
                    location.reload();
                }
                break;
        }
    });
    const queued = globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS;
    if (queued != null && !Array.isArray(queued)) {
        throw new Error('A separate HMR handler was already registered');
    }
    globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS = {
        push: ([chunkPath, callback])=>{
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    };
    if (Array.isArray(queued)) {
        for (const [chunkPath, callback] of queued){
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    }
}
const updateCallbackSets = new Map();
function sendJSON(sendMessage, message) {
    sendMessage(JSON.stringify(message));
}
function resourceKey(resource) {
    return JSON.stringify({
        path: resource.path,
        headers: resource.headers || null
    });
}
function subscribeToUpdates(sendMessage, resource) {
    sendJSON(sendMessage, {
        type: 'turbopack-subscribe',
        ...resource
    });
    return ()=>{
        sendJSON(sendMessage, {
            type: 'turbopack-unsubscribe',
            ...resource
        });
    };
}
function handleSocketConnected(sendMessage) {
    for (const key of updateCallbackSets.keys()){
        subscribeToUpdates(sendMessage, JSON.parse(key));
    }
}
// we aggregate all pending updates until the issues are resolved
const chunkListsWithPendingUpdates = new Map();
function aggregateUpdates(msg) {
    const key = resourceKey(msg.resource);
    let aggregated = chunkListsWithPendingUpdates.get(key);
    if (aggregated) {
        aggregated.instruction = mergeChunkListUpdates(aggregated.instruction, msg.instruction);
    } else {
        chunkListsWithPendingUpdates.set(key, msg);
    }
}
function applyAggregatedUpdates() {
    if (chunkListsWithPendingUpdates.size === 0) return;
    hooks.beforeRefresh();
    for (const msg of chunkListsWithPendingUpdates.values()){
        triggerUpdate(msg);
    }
    chunkListsWithPendingUpdates.clear();
    finalizeUpdate();
}
function mergeChunkListUpdates(updateA, updateB) {
    let chunks;
    if (updateA.chunks != null) {
        if (updateB.chunks == null) {
            chunks = updateA.chunks;
        } else {
            chunks = mergeChunkListChunks(updateA.chunks, updateB.chunks);
        }
    } else if (updateB.chunks != null) {
        chunks = updateB.chunks;
    }
    let merged;
    if (updateA.merged != null) {
        if (updateB.merged == null) {
            merged = updateA.merged;
        } else {
            // Since `merged` is an array of updates, we need to merge them all into
            // one, consistent update.
            // Since there can only be `EcmascriptMergeUpdates` in the array, there is
            // no need to key on the `type` field.
            let update = updateA.merged[0];
            for(let i = 1; i < updateA.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateA.merged[i]);
            }
            for(let i = 0; i < updateB.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateB.merged[i]);
            }
            merged = [
                update
            ];
        }
    } else if (updateB.merged != null) {
        merged = updateB.merged;
    }
    return {
        type: 'ChunkListUpdate',
        chunks,
        merged
    };
}
function mergeChunkListChunks(chunksA, chunksB) {
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    return chunks;
}
function mergeChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted' || updateA.type === 'deleted' && updateB.type === 'added') {
        return undefined;
    }
    if (updateA.type === 'partial') {
        invariant(updateA.instruction, 'Partial updates are unsupported');
    }
    if (updateB.type === 'partial') {
        invariant(updateB.instruction, 'Partial updates are unsupported');
    }
    return undefined;
}
function mergeChunkListEcmascriptMergedUpdates(mergedA, mergedB) {
    const entries = mergeEcmascriptChunkEntries(mergedA.entries, mergedB.entries);
    const chunks = mergeEcmascriptChunksUpdates(mergedA.chunks, mergedB.chunks);
    return {
        type: 'EcmascriptMergedUpdate',
        entries,
        chunks
    };
}
function mergeEcmascriptChunkEntries(entriesA, entriesB) {
    return {
        ...entriesA,
        ...entriesB
    };
}
function mergeEcmascriptChunksUpdates(chunksA, chunksB) {
    if (chunksA == null) {
        return chunksB;
    }
    if (chunksB == null) {
        return chunksA;
    }
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeEcmascriptChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    if (Object.keys(chunks).length === 0) {
        return undefined;
    }
    return chunks;
}
function mergeEcmascriptChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted') {
        // These two completely cancel each other out.
        return undefined;
    }
    if (updateA.type === 'deleted' && updateB.type === 'added') {
        const added = [];
        const deleted = [];
        const deletedModules = new Set(updateA.modules ?? []);
        const addedModules = new Set(updateB.modules ?? []);
        for (const moduleId of addedModules){
            if (!deletedModules.has(moduleId)) {
                added.push(moduleId);
            }
        }
        for (const moduleId of deletedModules){
            if (!addedModules.has(moduleId)) {
                deleted.push(moduleId);
            }
        }
        if (added.length === 0 && deleted.length === 0) {
            return undefined;
        }
        return {
            type: 'partial',
            added,
            deleted
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'partial') {
        const added = new Set([
            ...updateA.added ?? [],
            ...updateB.added ?? []
        ]);
        const deleted = new Set([
            ...updateA.deleted ?? [],
            ...updateB.deleted ?? []
        ]);
        if (updateB.added != null) {
            for (const moduleId of updateB.added){
                deleted.delete(moduleId);
            }
        }
        if (updateB.deleted != null) {
            for (const moduleId of updateB.deleted){
                added.delete(moduleId);
            }
        }
        return {
            type: 'partial',
            added: [
                ...added
            ],
            deleted: [
                ...deleted
            ]
        };
    }
    if (updateA.type === 'added' && updateB.type === 'partial') {
        const modules = new Set([
            ...updateA.modules ?? [],
            ...updateB.added ?? []
        ]);
        for (const moduleId of updateB.deleted ?? []){
            modules.delete(moduleId);
        }
        return {
            type: 'added',
            modules: [
                ...modules
            ]
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'deleted') {
        // We could eagerly return `updateB` here, but this would potentially be
        // incorrect if `updateA` has added modules.
        const modules = new Set(updateB.modules ?? []);
        if (updateA.added != null) {
            for (const moduleId of updateA.added){
                modules.delete(moduleId);
            }
        }
        return {
            type: 'deleted',
            modules: [
                ...modules
            ]
        };
    }
    // Any other update combination is invalid.
    return undefined;
}
function invariant(_, message) {
    throw new Error(`Invariant: ${message}`);
}
const CRITICAL = [
    'bug',
    'error',
    'fatal'
];
function compareByList(list, a, b) {
    const aI = list.indexOf(a) + 1 || list.length;
    const bI = list.indexOf(b) + 1 || list.length;
    return aI - bI;
}
const chunksWithIssues = new Map();
function emitIssues() {
    const issues = [];
    const deduplicationSet = new Set();
    for (const [_, chunkIssues] of chunksWithIssues){
        for (const chunkIssue of chunkIssues){
            if (deduplicationSet.has(chunkIssue.formatted)) continue;
            issues.push(chunkIssue);
            deduplicationSet.add(chunkIssue.formatted);
        }
    }
    sortIssues(issues);
    hooks.issues(issues);
}
function handleIssues(msg) {
    const key = resourceKey(msg.resource);
    let hasCriticalIssues = false;
    for (const issue of msg.issues){
        if (CRITICAL.includes(issue.severity)) {
            hasCriticalIssues = true;
        }
    }
    if (msg.issues.length > 0) {
        chunksWithIssues.set(key, msg.issues);
    } else if (chunksWithIssues.has(key)) {
        chunksWithIssues.delete(key);
    }
    emitIssues();
    return hasCriticalIssues;
}
const SEVERITY_ORDER = [
    'bug',
    'fatal',
    'error',
    'warning',
    'info',
    'log'
];
const CATEGORY_ORDER = [
    'parse',
    'resolve',
    'code generation',
    'rendering',
    'typescript',
    'other'
];
function sortIssues(issues) {
    issues.sort((a, b)=>{
        const first = compareByList(SEVERITY_ORDER, a.severity, b.severity);
        if (first !== 0) return first;
        return compareByList(CATEGORY_ORDER, a.category, b.category);
    });
}
const hooks = {
    beforeRefresh: ()=>{},
    refresh: ()=>{},
    buildOk: ()=>{},
    issues: (_issues)=>{}
};
function setHooks(newHooks) {
    Object.assign(hooks, newHooks);
}
function handleSocketMessage(msg) {
    sortIssues(msg.issues);
    handleIssues(msg);
    switch(msg.type){
        case 'issues':
            break;
        case 'partial':
            // aggregate updates
            aggregateUpdates(msg);
            break;
        default:
            // run single update
            const runHooks = chunkListsWithPendingUpdates.size === 0;
            if (runHooks) hooks.beforeRefresh();
            triggerUpdate(msg);
            if (runHooks) finalizeUpdate();
            break;
    }
}
function finalizeUpdate() {
    hooks.refresh();
    hooks.buildOk();
    // This is used by the Next.js integration test suite to notify it when HMR
    // updates have been completed.
    // TODO: Only run this in test environments (gate by `process.env.__NEXT_TEST_MODE`)
    if (globalThis.__NEXT_HMR_CB) {
        globalThis.__NEXT_HMR_CB();
        globalThis.__NEXT_HMR_CB = null;
    }
}
function subscribeToChunkUpdate(chunkListPath, sendMessage, callback) {
    return subscribeToUpdate({
        path: chunkListPath
    }, sendMessage, callback);
}
function subscribeToUpdate(resource, sendMessage, callback) {
    const key = resourceKey(resource);
    let callbackSet;
    const existingCallbackSet = updateCallbackSets.get(key);
    if (!existingCallbackSet) {
        callbackSet = {
            callbacks: new Set([
                callback
            ]),
            unsubscribe: subscribeToUpdates(sendMessage, resource)
        };
        updateCallbackSets.set(key, callbackSet);
    } else {
        existingCallbackSet.callbacks.add(callback);
        callbackSet = existingCallbackSet;
    }
    return ()=>{
        callbackSet.callbacks.delete(callback);
        if (callbackSet.callbacks.size === 0) {
            callbackSet.unsubscribe();
            updateCallbackSets.delete(key);
        }
    };
}
function triggerUpdate(msg) {
    const key = resourceKey(msg.resource);
    const callbackSet = updateCallbackSets.get(key);
    if (!callbackSet) {
        return;
    }
    for (const callback of callbackSet.callbacks){
        callback(msg);
    }
    if (msg.type === 'notFound') {
        // This indicates that the resource which we subscribed to either does not exist or
        // has been deleted. In either case, we should clear all update callbacks, so if a
        // new subscription is created for the same resource, it will send a new "subscribe"
        // message to the server.
        // No need to send an "unsubscribe" message to the server, it will have already
        // dropped the update stream before sending the "notFound" message.
        updateCallbackSets.delete(key);
    }
}
}),
"[project]/pages/products.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__N_SSG",
    ()=>__N_SSG,
    "default",
    ()=>ProductsPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
const CART_STORAGE_KEY = 'sofracom.cart.v1';
const OUTPUT_CURRENCY = 'TND';
const FR_NUMBER_FORMAT = new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: OUTPUT_CURRENCY
});
const ensurePath = (value)=>{
    if (!value) return '';
    return value.startsWith('/') ? value : `/${value}`;
};
const slugify = (value)=>(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const normalizeProduct = (product, category)=>{
    const id = `${category.slug}-${slugify(product.title)}`;
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
        categorySlug: category.slug,
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
const buildCategories = (rawCategories)=>(rawCategories || []).map((category)=>{
        const slug = category.slug || slugify(category.name);
        return {
            ...category,
            slug,
            image: ensurePath(category.image),
            products: Array.isArray(category.products) && category.products.length ? category.products.map((product)=>normalizeProduct(product, {
                    ...category,
                    slug
                })) : []
        };
    });
const formatPrice = (value)=>{
    if (!Number.isFinite(value)) {
        return `${value || 0} ${OUTPUT_CURRENCY}`;
    }
    return FR_NUMBER_FORMAT.format(value);
};
var __N_SSG = true;
function ProductsPage({ categories = [] }) {
    _s();
    const [clientCategories, setClientCategories] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])({
        "ProductsPage.useState": ()=>categories
    }["ProductsPage.useState"]);
    const [activeCategorySlug, setActiveCategorySlug] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [brandFilter, setBrandFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [searchTerm, setSearchTerm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [selectedProductId, setSelectedProductId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [selectedVariantIndex, setSelectedVariantIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [activeImageIndex, setActiveImageIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [detailStatus, setDetailStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])({
        message: '',
        type: ''
    });
    const [cart, setCart] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [cartOpen, setCartOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [checkoutStatus, setCheckoutStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])({
        message: '',
        type: ''
    });
    const [checkoutSubmitting, setCheckoutSubmitting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [checkoutForm, setCheckoutForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])({
        name: '',
        phone: '',
        address: '',
        notes: ''
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ProductsPage.useEffect": ()=>{
            if (categories.length) {
                setClientCategories(categories);
            }
        }
    }["ProductsPage.useEffect"], [
        categories
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ProductsPage.useEffect": ()=>{
            if (clientCategories.length) return;
            let canceled = false;
            ({
                "ProductsPage.useEffect": async ()=>{
                    try {
                        const response = await fetch('/assets/data/products.json');
                        if (!response.ok) {
                            console.warn('[products] client fetch failed', response.status);
                            return;
                        }
                        const data = await response.json();
                        if (canceled) return;
                        setClientCategories(buildCategories(data.categories || []));
                    } catch (error) {
                        console.error('[products] failed to load categories', error);
                    }
                }
            })["ProductsPage.useEffect"]();
            return ({
                "ProductsPage.useEffect": ()=>{
                    canceled = true;
                }
            })["ProductsPage.useEffect"];
        }
    }["ProductsPage.useEffect"], [
        clientCategories.length
    ]);
    const categoriesToRender = clientCategories.length ? clientCategories : categories;
    const productMap = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ProductsPage.useMemo[productMap]": ()=>{
            const map = new Map();
            categoriesToRender.forEach({
                "ProductsPage.useMemo[productMap]": (category)=>{
                    (category.products || []).forEach({
                        "ProductsPage.useMemo[productMap]": (product)=>{
                            map.set(product.id, product);
                        }
                    }["ProductsPage.useMemo[productMap]"]);
                }
            }["ProductsPage.useMemo[productMap]"]);
            return map;
        }
    }["ProductsPage.useMemo[productMap]"], [
        categoriesToRender
    ]);
    const activeCategory = categoriesToRender.find((category)=>category.slug === activeCategorySlug);
    const availableBrands = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ProductsPage.useMemo[availableBrands]": ()=>{
            if (!activeCategory) return [];
            const brands = Array.from(new Set(activeCategory.products.map({
                "ProductsPage.useMemo[availableBrands].brands": (product)=>product.brand
            }["ProductsPage.useMemo[availableBrands].brands"]).filter(Boolean)));
            return brands.sort();
        }
    }["ProductsPage.useMemo[availableBrands]"], [
        activeCategory
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ProductsPage.useEffect": ()=>{
            if (!availableBrands.includes(brandFilter)) {
                setBrandFilter('');
            }
        }
    }["ProductsPage.useEffect"], [
        availableBrands,
        brandFilter
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ProductsPage.useEffect": ()=>{
            const stored = ("TURBOPACK compile-time truthy", 1) ? window.localStorage.getItem(CART_STORAGE_KEY) : "TURBOPACK unreachable";
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        setCart(parsed);
                    }
                } catch (error) {
                    console.warn('[cart] failed to read storage', error);
                }
            }
        }
    }["ProductsPage.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ProductsPage.useEffect": ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            try {
                window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
            } catch (error) {
                console.warn('[cart] failed to persist', error);
            }
        }
    }["ProductsPage.useEffect"], [
        cart
    ]);
    const filteredProducts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ProductsPage.useMemo[filteredProducts]": ()=>{
            if (!activeCategory) return [];
            const normalizedTerm = searchTerm.trim().toLowerCase();
            return activeCategory.products.filter({
                "ProductsPage.useMemo[filteredProducts]": (product)=>{
                    if (brandFilter && product.brand !== brandFilter) return false;
                    if (!normalizedTerm) return true;
                    const haystack = `${product.title} ${product.description} ${product.brand}`.toLowerCase();
                    return haystack.includes(normalizedTerm);
                }
            }["ProductsPage.useMemo[filteredProducts]"]);
        }
    }["ProductsPage.useMemo[filteredProducts]"], [
        activeCategory,
        brandFilter,
        searchTerm
    ]);
    const selectedProduct = selectedProductId ? productMap.get(selectedProductId) : null;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ProductsPage.useEffect": ()=>{
            setActiveImageIndex(0);
            setSelectedVariantIndex(0);
            setDetailStatus({
                message: '',
                type: ''
            });
        }
    }["ProductsPage.useEffect"], [
        selectedProductId
    ]);
    const cartCount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ProductsPage.useMemo[cartCount]": ()=>cart.reduce({
                "ProductsPage.useMemo[cartCount]": (total, item)=>total + (item.quantity || 0)
            }["ProductsPage.useMemo[cartCount]"], 0)
    }["ProductsPage.useMemo[cartCount]"], [
        cart
    ]);
    const cartTotal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ProductsPage.useMemo[cartTotal]": ()=>cart.reduce({
                "ProductsPage.useMemo[cartTotal]": (total, item)=>{
                    if (Number.isFinite(item.price)) {
                        return total + item.price * item.quantity;
                    }
                    return total;
                }
            }["ProductsPage.useMemo[cartTotal]"], 0)
    }["ProductsPage.useMemo[cartTotal]"], [
        cart
    ]);
    const handleSearchChange = (event)=>{
        setSearchTerm(event.target.value);
    };
    const openCart = ()=>setCartOpen(true);
    const closeCart = ()=>setCartOpen(false);
    const updateCartQuantity = (id, quantity)=>{
        setCart((existing)=>existing.map((item)=>item.id === id ? {
                    ...item,
                    quantity: Math.max(1, quantity)
                } : item).filter((item)=>item.quantity > 0));
    };
    const removeCartItem = (id)=>{
        setCart((existing)=>existing.filter((item)=>item.id !== id));
    };
    const addToCart = (product, variant)=>{
        if (!product) return;
        const price = variant?.price ?? product.price ?? 0;
        const variantLabel = variant?.label;
        const cartId = variantLabel ? `${product.id}-${slugify(variantLabel)}` : product.id;
        setCart((existing)=>{
            const existingItem = existing.find((item)=>item.id === cartId);
            if (existingItem) {
                return existing.map((item)=>item.id === cartId ? {
                        ...item,
                        quantity: item.quantity + 1
                    } : item);
            }
            return [
                ...existing,
                {
                    id: cartId,
                    title: product.title,
                    price,
                    quantity: 1,
                    image: product.images[0] || product.image,
                    category: product.categoryName,
                    brand: product.brand,
                    variantLabel
                }
            ];
        });
        setDetailStatus({
            message: 'Added to cart',
            type: 'success'
        });
        openCart();
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
                    brand: item.brand,
                    variantLabel: item.variantLabel
                })),
            total: cartTotal,
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
            setCart([]);
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
    const detailVariant = selectedProduct?.variants?.[selectedVariantIndex] ?? null;
    const detailPrice = detailVariant?.price ?? selectedProduct?.price ?? 0;
    const detailImage = selectedProduct?.images?.[activeImageIndex] || selectedProduct?.image;
    const renderedProducts = filteredProducts.length ? filteredProducts : activeCategory?.products || [];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: "max-w-7xl mx-auto px-6 py-12",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-center justify-between gap-3 mb-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                                className: "text-sm text-gray-500",
                                id: "breadcrumb",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                        href: "/",
                                        className: "hover:underline",
                                        children: "Home"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 390,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "mx-1",
                                        children: "/"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 393,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-gray-700 font-medium",
                                        children: "Products"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 394,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products.js",
                                lineNumber: 389,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3",
                                children: activeCategory && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            id: "brandFilter",
                                            className: "px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-200",
                                            value: brandFilter,
                                            onChange: (event)=>setBrandFilter(event.target.value),
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "",
                                                    children: "All brands"
                                                }, void 0, false, {
                                                    fileName: "[project]/pages/products.js",
                                                    lineNumber: 407,
                                                    columnNumber: 37
                                                }, this),
                                                availableBrands.map((brand)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: brand,
                                                        children: brand
                                                    }, brand, false, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 409,
                                                        columnNumber: 41
                                                    }, this))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/pages/products.js",
                                            lineNumber: 399,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            id: "searchBox",
                                            type: "search",
                                            value: searchTerm,
                                            onChange: handleSearchChange,
                                            placeholder: "Search products...",
                                            className: "px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-200"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/products.js",
                                            lineNumber: 414,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            id: "backBtn",
                                            type: "button",
                                            className: "px-3 py-2 rounded-lg border hover:bg-gray-100",
                                            onClick: ()=>{
                                                setActiveCategorySlug(null);
                                                setBrandFilter('');
                                                setSearchTerm('');
                                                setSelectedProductId(null);
                                            },
                                            children: "← Back to categories"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/products.js",
                                            lineNumber: 422,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true)
                            }, void 0, false, {
                                fileName: "[project]/pages/products.js",
                                lineNumber: 396,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/products.js",
                        lineNumber: 388,
                        columnNumber: 17
                    }, this),
                    !activeCategory && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        id: "categoriesSection",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-2xl font-extrabold mb-4",
                                children: "Categories"
                            }, void 0, false, {
                                fileName: "[project]/pages/products.js",
                                lineNumber: 443,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-6",
                                children: categoriesToRender.map((category)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                                        className: "product-card hover:cursor-pointer",
                                        "data-animate": true,
                                        onClick: ()=>setActiveCategorySlug(category.slug),
                                        "data-tilt": true,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                src: category.image,
                                                alt: category.name,
                                                className: "card-img"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 455,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "p-6",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                                                        className: "text-lg font-semibold text-gray-900",
                                                        children: category.name
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 461,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "mt-3 text-sm text-gray-600 leading-relaxed",
                                                        children: category.description
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 464,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mt-4 text-xs uppercase tracking-wide text-blue-700 font-semibold",
                                                        children: [
                                                            category.products.length,
                                                            " products"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 467,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 460,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, category.slug, true, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 448,
                                        columnNumber: 33
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/pages/products.js",
                                lineNumber: 446,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/products.js",
                        lineNumber: 442,
                        columnNumber: 21
                    }, this),
                    activeCategory && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        id: "productsSection",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pt-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        id: "catTitle",
                                        className: "text-2xl font-extrabold text-gray-900",
                                        children: activeCategory.name
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 481,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        id: "catDesc",
                                        className: "text-sm text-gray-500 mt-1",
                                        children: activeCategory.description
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 487,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products.js",
                                lineNumber: 480,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6",
                                children: renderedProducts.map((product)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                                        className: `product-card ${product.stock === 'out' ? 'product-out' : ''}`,
                                        "data-animate": true,
                                        "data-tilt": true,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                src: product.image,
                                                alt: product.title,
                                                className: "card-img"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 504,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "p-6 flex flex-col gap-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center justify-between",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                                className: "text-lg font-semibold text-gray-900",
                                                                children: product.title
                                                            }, void 0, false, {
                                                                fileName: "[project]/pages/products.js",
                                                                lineNumber: 511,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-xs text-gray-500 uppercase",
                                                                children: product.brand
                                                            }, void 0, false, {
                                                                fileName: "[project]/pages/products.js",
                                                                lineNumber: 514,
                                                                columnNumber: 45
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 510,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "product-description",
                                                        children: product.description
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 518,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "product-price-row",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "product-price",
                                                                "data-product-price": true,
                                                                children: formatPrice(product.price)
                                                            }, void 0, false, {
                                                                fileName: "[project]/pages/products.js",
                                                                lineNumber: 522,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: `stock-badge ${product.stock === 'in' ? 'stock-badge--in' : 'stock-badge--out'}`,
                                                                children: product.stock === 'in' ? 'In stock' : 'Out of stock'
                                                            }, void 0, false, {
                                                                fileName: "[project]/pages/products.js",
                                                                lineNumber: 528,
                                                                columnNumber: 45
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 521,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex gap-2 flex-wrap",
                                                        children: product.usage.map((tag)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "tag px-3 py-1 rounded-full text-xs",
                                                                children: tag
                                                            }, `${product.id}-${tag}`, false, {
                                                                fileName: "[project]/pages/products.js",
                                                                lineNumber: 542,
                                                                columnNumber: 49
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 540,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "product-actions mt-auto",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                type: "button",
                                                                className: "product-detail-btn",
                                                                onClick: ()=>{
                                                                    setSelectedProductId(product.id);
                                                                    setSelectedVariantIndex(0);
                                                                    setActiveImageIndex(0);
                                                                },
                                                                children: "View details"
                                                            }, void 0, false, {
                                                                fileName: "[project]/pages/products.js",
                                                                lineNumber: 551,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                type: "button",
                                                                className: "cart-submit px-4 py-2 text-sm",
                                                                onClick: ()=>addToCart(product, product.variants[0]),
                                                                children: "Add to cart"
                                                            }, void 0, false, {
                                                                fileName: "[project]/pages/products.js",
                                                                lineNumber: 562,
                                                                columnNumber: 45
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 550,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 509,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, product.id, true, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 496,
                                        columnNumber: 33
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/pages/products.js",
                                lineNumber: 494,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/products.js",
                        lineNumber: 479,
                        columnNumber: 21
                    }, this),
                    selectedProduct && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        id: "productDetailSection",
                        className: "mt-10 detail-panel rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "detail-header flex items-center justify-between gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        id: "detailBreadcrumb",
                                        className: "detail-breadcrumb",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                className: "detail-crumb",
                                                onClick: ()=>setActiveCategorySlug(null),
                                                children: "Categories"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 590,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "•"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 597,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: selectedProduct.categoryName
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 598,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 586,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        id: "productDetailClose",
                                        className: "detail-close text-sm text-gray-500 border border-gray-200 rounded-full px-3 py-1 hover:border-gray-400 hover:text-gray-900 transition",
                                        onClick: ()=>setSelectedProductId(null),
                                        children: "Close"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 600,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products.js",
                                lineNumber: 585,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "detail-layout grid gap-6 lg:grid-cols-2 mt-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "detail-gallery",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                id: "detailMainImage",
                                                src: detailImage,
                                                alt: selectedProduct.title,
                                                className: "detail-main-img block w-full rounded-2xl border border-gray-200 bg-gray-50 object-contain"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 611,
                                                columnNumber: 33
                                            }, this),
                                            selectedProduct.images.length > 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                id: "detailThumbs",
                                                className: "detail-thumbs mt-4 flex flex-wrap gap-3",
                                                children: selectedProduct.images.map((src, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                        src: src,
                                                        alt: `${selectedProduct.title} ${index}`,
                                                        className: `rounded-2xl cursor-pointer ${activeImageIndex === index ? 'active' : ''}`,
                                                        onClick: ()=>setActiveImageIndex(index)
                                                    }, src, false, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 623,
                                                        columnNumber: 45
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 618,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 610,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "detail-meta flex flex-col gap-4",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-gray-500",
                                                        id: "detailCategoryName",
                                                        children: selectedProduct.categoryName
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 642,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                        id: "detailTitle",
                                                        className: "text-3xl font-semibold text-gray-900 leading-tight",
                                                        children: selectedProduct.title
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 645,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        id: "detailBrand",
                                                        className: "text-sm text-gray-500 mt-1",
                                                        children: selectedProduct.brand
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 651,
                                                        columnNumber: 37
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 641,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                id: "detailUsage",
                                                className: "flex flex-wrap gap-2",
                                                children: selectedProduct.usage.map((tag)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "tag px-3 py-1 rounded-full text-xs",
                                                        children: tag
                                                    }, `${selectedProduct.id}-usage-${tag}`, false, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 663,
                                                        columnNumber: 41
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 658,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "detail-price-row flex flex-wrap items-center gap-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        id: "detailPrice",
                                                        className: "text-3xl font-bold text-gray-900",
                                                        children: formatPrice(detailPrice)
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 672,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        id: "detailStockBadge",
                                                        className: `stock-badge ${selectedProduct.stock === 'in' ? 'stock-badge--in' : 'stock-badge--out'}`,
                                                        children: selectedProduct.stock === 'in' ? 'In stock' : 'Out of stock'
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 678,
                                                        columnNumber: 37
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 671,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                id: "detailVariants",
                                                className: "detail-variants flex flex-wrap gap-2",
                                                children: selectedProduct.variants.length ? selectedProduct.variants.map((variant, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        className: `detail-variant-btn ${selectedVariantIndex === index ? 'active' : ''}`,
                                                        onClick: ()=>setSelectedVariantIndex(index),
                                                        children: [
                                                            variant.label,
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                children: formatPrice(variant.price)
                                                            }, void 0, false, {
                                                                fileName: "[project]/pages/products.js",
                                                                lineNumber: 713,
                                                                columnNumber: 53
                                                            }, this)
                                                        ]
                                                    }, `${variant.label}-${index}`, true, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 698,
                                                        columnNumber: 49
                                                    }, this)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-sm text-gray-500",
                                                    children: "Single configuration"
                                                }, void 0, false, {
                                                    fileName: "[project]/pages/products.js",
                                                    lineNumber: 720,
                                                    columnNumber: 41
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 691,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                id: "detailDescription",
                                                className: "text-sm text-gray-700 leading-relaxed",
                                                children: selectedProduct.description
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 725,
                                                columnNumber: 33
                                            }, this),
                                            selectedProduct.datasheet && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                id: "detailDatasheet",
                                                href: selectedProduct.datasheet,
                                                target: "_blank",
                                                rel: "noreferrer",
                                                className: "datasheet-link",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                        viewBox: "0 0 24 24",
                                                        fill: "none",
                                                        stroke: "currentColor",
                                                        strokeWidth: "2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                                d: "M4 17v-6a4 4 0 014-4h8a4 4 0 014 4v6"
                                                            }, void 0, false, {
                                                                fileName: "[project]/pages/products.js",
                                                                lineNumber: 745,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                                d: "M10 14l3 3 6-6"
                                                            }, void 0, false, {
                                                                fileName: "[project]/pages/products.js",
                                                                lineNumber: 746,
                                                                columnNumber: 45
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 739,
                                                        columnNumber: 41
                                                    }, this),
                                                    "Download datasheet"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 732,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                id: "detailAddBtn",
                                                type: "button",
                                                className: "w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 transition",
                                                onClick: ()=>addToCart(selectedProduct, detailVariant),
                                                disabled: selectedProduct.stock !== 'in',
                                                children: "Add to cart"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 751,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                id: "detailStatus",
                                                className: `quote-status ${detailStatus.type} mt-4 text-sm ${detailStatus.message ? '' : 'hidden'}`,
                                                "aria-live": "polite",
                                                children: detailStatus.message
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 765,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 640,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products.js",
                                lineNumber: 609,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/products.js",
                        lineNumber: 581,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/products.js",
                lineNumber: 387,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                id: "cartFab",
                className: "cart-fab",
                type: "button",
                onClick: ()=>{
                    openCart();
                    setCheckoutStatus({
                        message: '',
                        type: ''
                    });
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "Cart"
                    }, void 0, false, {
                        fileName: "[project]/pages/products.js",
                        lineNumber: 790,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "px-2 py-1 rounded-full bg-white/15 text-sm font-semibold",
                        children: cartCount
                    }, void 0, false, {
                        fileName: "[project]/pages/products.js",
                        lineNumber: 791,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/products.js",
                lineNumber: 781,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                id: "cartOverlay",
                className: `cart-overlay ${cartOpen ? 'active' : ''}`,
                onClick: closeCart
            }, void 0, false, {
                fileName: "[project]/pages/products.js",
                lineNumber: 796,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                id: "cartDrawer",
                className: `cart-drawer ${cartOpen ? 'open' : ''}`,
                "aria-hidden": !cartOpen,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "cart-header",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        id: "cartTitle",
                                        className: "text-lg font-semibold text-gray-900",
                                        children: "Your order"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 809,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-gray-500",
                                        children: "Review items then confirm your details."
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 815,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products.js",
                                lineNumber: 808,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                id: "cartClose",
                                type: "button",
                                "aria-label": "Close cart",
                                className: "text-2xl leading-none text-gray-500 hover:text-gray-800",
                                onClick: closeCart,
                                children: "×"
                            }, void 0, false, {
                                fileName: "[project]/pages/products.js",
                                lineNumber: 819,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/products.js",
                        lineNumber: 807,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "cart-body",
                        id: "cartItems",
                        children: cart.length ? cart.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "cart-item",
                                "data-id": item.id,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                        src: item.image,
                                        alt: item.title
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 837,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "cart-item-title",
                                                children: item.title
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 839,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-gray-500",
                                                children: item.variantLabel ? item.variantLabel : item.category
                                            }, void 0, false, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 842,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "cart-qty mt-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        "data-action": "decrement",
                                                        onClick: ()=>updateCartQuantity(item.id, item.quantity - 1),
                                                        children: "−"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 848,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "number",
                                                        min: "1",
                                                        value: item.quantity,
                                                        onChange: (event)=>{
                                                            const value = Number(event.target.value);
                                                            if (!Number.isFinite(value)) return;
                                                            updateCartQuantity(item.id, value);
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 860,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        "data-action": "increment",
                                                        onClick: ()=>updateCartQuantity(item.id, item.quantity + 1),
                                                        children: "+"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 872,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        "data-action": "remove",
                                                        onClick: ()=>removeCartItem(item.id),
                                                        className: "text-xs text-red-500 ml-3",
                                                        children: "Remove"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/products.js",
                                                        lineNumber: 884,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/products.js",
                                                lineNumber: 847,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 838,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, item.id, true, {
                                fileName: "[project]/pages/products.js",
                                lineNumber: 832,
                                columnNumber: 29
                            }, this)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "empty-cart",
                            children: "Your cart is empty."
                        }, void 0, false, {
                            fileName: "[project]/pages/products.js",
                            lineNumber: 899,
                            columnNumber: 25
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/pages/products.js",
                        lineNumber: 829,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "cart-summary",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "cart-summary-row",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Total"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 904,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        id: "cartTotal",
                                        children: formatPrice(cartTotal)
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 905,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products.js",
                                lineNumber: 903,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                id: "cartAlert",
                                className: `cart-alert ${checkoutStatus.type}`,
                                role: "status",
                                children: checkoutStatus.message
                            }, void 0, false, {
                                fileName: "[project]/pages/products.js",
                                lineNumber: 907,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/products.js",
                        lineNumber: 902,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                        id: "checkoutForm",
                        className: "cart-form",
                        onSubmit: handleCheckoutSubmit,
                        noValidate: true,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Full name"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 922,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "text",
                                        name: "name",
                                        value: checkoutForm.name,
                                        onChange: handleCheckoutInput,
                                        required: true
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 923,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products.js",
                                lineNumber: 921,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Phone"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 932,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "tel",
                                        name: "phone",
                                        value: checkoutForm.phone,
                                        onChange: handleCheckoutInput,
                                        required: true
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 933,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products.js",
                                lineNumber: 931,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Delivery address"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 942,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                        name: "address",
                                        rows: "2",
                                        value: checkoutForm.address,
                                        onChange: handleCheckoutInput,
                                        required: true
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 943,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products.js",
                                lineNumber: 941,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Notes (optional)"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 952,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                        name: "notes",
                                        rows: "2",
                                        value: checkoutForm.notes,
                                        onChange: handleCheckoutInput
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products.js",
                                        lineNumber: 953,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products.js",
                                lineNumber: 951,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                id: "cartSubmitBtn",
                                type: "submit",
                                className: "cart-submit",
                                disabled: checkoutSubmitting,
                                children: checkoutSubmitting ? 'Sending…' : 'Send order'
                            }, void 0, false, {
                                fileName: "[project]/pages/products.js",
                                lineNumber: 960,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/products.js",
                        lineNumber: 915,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/products.js",
                lineNumber: 802,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true);
}
_s(ProductsPage, "9c1h+hhwe6NLRXaNxAWJ/tSuf6s=");
_c = ProductsPage;
var _c;
__turbopack_context__.k.register(_c, "ProductsPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/pages/products.js [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/products";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/pages/products.js [client] (ecmascript)");
    }
]);
// @ts-expect-error module.hot exists
if (module.hot) {
    // @ts-expect-error module.hot exists
    module.hot.dispose(function() {
        window.__NEXT_P.push([
            PAGE_PATH
        ]);
    });
}
}),
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/pages/products\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/pages/products.js [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__d75216b0._.js.map