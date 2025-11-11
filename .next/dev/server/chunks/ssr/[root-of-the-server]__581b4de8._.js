module.exports = [
"[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("react/jsx-dev-runtime", () => require("react/jsx-dev-runtime"));

module.exports = mod;
}),
"[externals]/react/jsx-runtime [external] (react/jsx-runtime, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("react/jsx-runtime", () => require("react/jsx-runtime"));

module.exports = mod;
}),
"[externals]/react [external] (react, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("react", () => require("react"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/pages-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/pages-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/pages-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/pages-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/contexts/LangContext.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LangProvider",
    ()=>LangProvider,
    "useLang",
    ()=>useLang
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
;
;
const TRANSLATIONS = {
    en: {
        'nav.home': 'Home',
        'nav.about': 'About',
        'nav.brands': 'Brands',
        'nav.products': 'Products',
        'nav.services': 'Services',
        'nav.contact': 'Contact',
        'hero.title': 'Marine Supplies & Services in Monastir',
        'hero.subtitle': 'Quick repairs and full projects: antifouling, polishing, gelcoat, deck renewal, hauling & more.',
        'hero.cta1': 'Explore Services',
        'hero.cta2': 'Get a Quote',
        'about.title': 'About SOFRACOM',
        'brands.title': 'Trusted Brands',
        'brands.subtitle': 'We stock leading marine brands and can quickly order what’s not on-hand via established suppliers.',
        'services.title': 'Services',
        'monoA.title': 'Monastir, Tunisia',
        'monoA.subtitle': 'Marina views • Ribat • Old town',
        'monoB.title': 'Haul-out near Port de pêche',
        'monoB.subtitle': '1 mile from Monastir Marina',
        'testimonials.title': 'What skippers say',
        'faq.title': 'FAQ',
        'faq.q1': 'Do you deliver to the marina?',
        'faq.a1': 'Yes, we’re nearby and can arrange quick deliveries to Marina Monastir.',
        'faq.q2': 'Can I request a free quote?',
        'faq.a2': 'Absolutely. Use the contact form below or call us to discuss your project.',
        'faq.q3': 'Do you stock everything shown?',
        'faq.a3': 'Not all items are in stock at all times, but we can order quickly via suppliers.',
        'contact.title': 'Contact Us',
        'contact.address1': 'SOFRACOM Store',
        'contact.address2': 'Remada Street, Monastir',
        'contact.hours': 'Hours: Mon–Sat, 8:00–17:00 (Closed public holidays)',
        'contact.btn': 'Request a Free Quote',
        'form.name': 'Name',
        'form.email': 'Email',
        'form.subject': 'Subject',
        'form.message': 'Message',
        'form.send': 'Send',
        'footer.quick': 'Quick Links',
        'footer.monastir': 'Near Marina Monastir & Port de pêche'
    },
    fr: {
        'nav.home': 'Accueil',
        'nav.about': 'À propos',
        'nav.brands': 'Marques',
        'nav.products': 'Produits',
        'nav.services': 'Services',
        'nav.contact': 'Contact',
        'hero.title': 'Fournitures et services marins à Monastir',
        'hero.subtitle': 'Petites réparations et projets complets : antifouling, polissage, gelcoat, pont, carénage et plus.',
        'hero.cta1': 'Découvrir les services',
        'hero.cta2': 'Demander un devis',
        'about.title': 'À propos de SOFRACOM',
        'brands.title': 'Marques de confiance',
        'brands.subtitle': 'Nous stockons des marques marines leaders et pouvons commander rapidement ce qui manque.',
        'services.title': 'Services',
        'monoA.title': 'Monastir, Tunisie',
        'monoA.subtitle': 'Vue marina • Ribat • Médina',
        'monoB.title': 'Carénage près du Port de pêche',
        'monoB.subtitle': 'À 1 mile de la Marina de Monastir',
        'testimonials.title': 'Avis de skippers',
        'faq.title': 'FAQ',
        'faq.q1': 'Livrez-vous à la marina ?',
        'faq.a1': 'Oui, nous sommes proches et pouvons livrer rapidement à la Marina de Monastir.',
        'faq.q2': 'Puis-je demander un devis gratuit ?',
        'faq.a2': 'Bien sûr. Utilisez le formulaire de contact ou appelez-nous pour discuter de votre projet.',
        'faq.q3': 'Tout est-il en stock ?',
        'faq.a3': 'Pas toujours, mais nous pouvons commander rapidement via nos fournisseurs.',
        'contact.title': 'Nous contacter',
        'contact.address1': 'Magasin SOFRACOM',
        'contact.address2': 'Rue Remada, Monastir',
        'contact.hours': 'Horaires : Lun–Sam, 8:00–17:00 (Fériés fermés)',
        'contact.btn': 'Demander un devis',
        'form.name': 'Nom',
        'form.email': 'E-mail',
        'form.subject': 'Objet',
        'form.message': 'Message',
        'form.send': 'Envoyer',
        'footer.quick': 'Liens rapides',
        'footer.monastir': 'Près de la Marina de Monastir & Port de pêche'
    },
    ar: {
        'nav.home': 'الرئيسية',
        'nav.about': 'من نحن',
        'nav.brands': 'العلامات',
        'nav.products': 'المنتجات',
        'nav.services': 'الخدمات',
        'nav.contact': 'اتصل بنا',
        'hero.title': 'خدمات ومستلزمات بحرية في المنستير',
        'hero.subtitle': 'إصلاحات سريعة ومشاريع كاملة: مضاد fouling، تلميع، جيلكوت، تجديد السطح، الرفع والمزيد.',
        'hero.cta1': 'استكشاف الخدمات',
        'hero.cta2': 'طلب عرض سعر',
        'about.title': 'عن SOFRACOM',
        'brands.title': 'علامات موثوقة',
        'brands.subtitle': 'نوفر أشهر العلامات البحرية ويمكننا طلب أي منتج غير متوفر بسرعة.',
        'services.title': 'الخدمات',
        'monoA.title': 'المنستير، تونس',
        'monoA.subtitle': 'إطلالات المرسى • الرباط • المدينة العتيقة',
        'monoB.title': 'حوض رفع قرب ميناء الصيد',
        'monoB.subtitle': 'على بُعد 1 ميل من مرسى المنستير',
        'testimonials.title': 'آراء الملاك',
        'faq.title': 'الأسئلة الشائعة',
        'faq.q1': 'هل توصلون إلى المرسى؟',
        'faq.a1': 'نعم، نحن قريبون ويمكننا التوصيل بسرعة إلى مرسى المنستير.',
        'faq.q2': 'هل يمكنني طلب عرض سعر مجاني؟',
        'faq.a2': 'بالتأكيد. استخدم نموذج الاتصال أدناه أو اتصل بنا لمناقشة مشروعك.',
        'faq.q3': 'هل كل ما هو معروض متوفر؟',
        'faq.a3': 'ليست كل العناصر متوفرة دائمًا، لكن يمكننا طلبها بسرعة من الموردين.',
        'contact.title': 'اتصل بنا',
        'contact.address1': 'متجر سوفراكوم',
        'contact.address2': 'شارع رمادة، المنستير',
        'contact.hours': 'الساعات: الإثنين–السبت 8:00–17:00 (عطلات مغلق)',
        'contact.btn': 'طلب عرض سعر',
        'form.name': 'الاسم',
        'form.email': 'البريد الإلكتروني',
        'form.subject': 'الموضوع',
        'form.message': 'الرسالة',
        'form.send': 'إرسال',
        'footer.quick': 'روابط سريعة',
        'footer.monastir': 'بالقرب من مرسى المنستير وميناء الصيد'
    }
};
const LangContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["createContext"])({
    lang: 'en',
    setLang: ()=>{},
    t: (key)=>TRANSLATIONS.en[key] || key
});
const STORAGE_KEY = 'sofracom.lang.v1';
function LangProvider({ children }) {
    const [lang, setLangState] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])('en');
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        const saved = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : null;
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
    }, []);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return;
        //TURBOPACK unreachable
        ;
    }, [
        lang
    ]);
    const value = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useMemo"])(()=>{
        const translator = (key)=>{
            return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
        };
        return {
            lang,
            setLang: (newLang)=>{
                if (TRANSLATIONS[newLang]) {
                    setLangState(newLang);
                }
            },
            t: translator
        };
    }, [
        lang
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(LangContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/contexts/LangContext.js",
        lineNumber: 167,
        columnNumber: 12
    }, this);
}
function useLang() {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useContext"])(LangContext);
}
}),
"[project]/components/Layout.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Layout
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/link.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$contexts$2f$LangContext$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/contexts/LangContext.js [ssr] (ecmascript)");
;
;
;
;
const NAV_LINKS = [
    {
        href: '#home',
        key: 'nav.home',
        type: 'anchor'
    },
    {
        href: '#about',
        key: 'nav.about',
        type: 'anchor'
    },
    {
        href: '#brands',
        key: 'nav.brands',
        type: 'anchor'
    },
    {
        href: '/products',
        key: 'nav.products',
        type: 'page'
    },
    {
        href: '#services',
        key: 'nav.services',
        type: 'anchor'
    },
    {
        href: '#contact',
        key: 'nav.contact',
        type: 'anchor'
    }
];
const resolveLinkHref = (link)=>{
    if (link.type === 'anchor') {
        const target = link.href.startsWith('#') ? link.href.slice(1) : link.href;
        return target ? `/#${target}` : '/';
    }
    return link.href;
};
function Layout({ children }) {
    const { lang, setLang, t } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$contexts$2f$LangContext$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["useLang"])();
    const [isNavSolid, setIsNavSolid] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    const [showToTop, setShowToTop] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    const [menuOpen, setMenuOpen] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    const sections = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useMemo"])(()=>[
            'home',
            'about',
            'brands',
            'services',
            'contact'
        ], []);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        const handleScroll = ()=>{
            setIsNavSolid(window.scrollY > 40);
            setShowToTop(window.scrollY > 500);
        };
        handleScroll();
        window.addEventListener('scroll', handleScroll);
        return ()=>window.removeEventListener('scroll', handleScroll);
    }, []);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        const elements = document.querySelectorAll('[data-animate]');
        const observer = new IntersectionObserver((entries)=>{
            entries.forEach((entry)=>{
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15
        });
        elements.forEach((el)=>observer.observe(el));
        return ()=>observer.disconnect();
    }, []);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        const tiltCards = Array.from(document.querySelectorAll('[data-tilt]'));
        const handlers = new Map();
        tiltCards.forEach((card)=>{
            const move = (e)=>{
                const rect = card.getBoundingClientRect();
                const px = (e.clientX - rect.left) / rect.width;
                const py = (e.clientY - rect.top) / rect.height;
                const rx = (0.5 - py) * 12;
                const ry = (px - 0.5) * 12;
                card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
            };
            const reset = ()=>{
                card.style.transform = 'rotateX(0) rotateY(0)';
            };
            card.addEventListener('mousemove', move);
            card.addEventListener('mouseleave', reset);
            handlers.set(card, {
                move,
                reset
            });
        });
        return ()=>{
            handlers.forEach((handler, card)=>{
                card.removeEventListener('mousemove', handler.move);
                card.removeEventListener('mouseleave', handler.reset);
            });
        };
    }, []);
    const handleSearchKey = (event)=>{
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const query = event.currentTarget.value.trim().toLowerCase();
        if (!query) return;
        const matchedSection = sections.find((id)=>id.includes(query));
        if (matchedSection) {
            document.getElementById(matchedSection)?.scrollIntoView({
                behavior: 'smooth'
            });
            return;
        }
        const cards = Array.from(document.querySelectorAll('#brands .brand-card'));
        const hit = cards.find((card)=>card.textContent.toLowerCase().includes(query));
        if (hit) {
            hit.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            hit.classList.add('ring', 'ring-4', 'ring-blue-300');
            window.setTimeout(()=>hit.classList.remove('ring', 'ring-4', 'ring-blue-300'), 1500);
        }
    };
    const handleLangChange = (event)=>{
        setLang(event.target.value);
    };
    const handleBackToTop = ()=>{
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("header", {
                id: "top",
                className: `sticky top-0 z-40 text-white transition-colors duration-300 ${isNavSolid ? 'nav-solid' : 'nav-glass'}`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "max-w-7xl mx-auto flex items-center justify-between px-4 py-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: "/",
                                className: "flex items-center gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("img", {
                                        src: "/logo.jpeg",
                                        alt: "SOFRACOM Logo",
                                        className: "h-10 w-10 rounded-lg ring-2 ring-white ring-opacity-30"
                                    }, void 0, false, {
                                        fileName: "[project]/components/Layout.js",
                                        lineNumber: 135,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        className: "text-xl font-extrabold tracking-wide",
                                        children: "SOFRACOM"
                                    }, void 0, false, {
                                        fileName: "[project]/components/Layout.js",
                                        lineNumber: 140,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/Layout.js",
                                lineNumber: 134,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("nav", {
                                className: "hidden md:flex items-center gap-8 text-sm font-medium",
                                children: NAV_LINKS.map((link)=>{
                                    const href = resolveLinkHref(link);
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        href: href,
                                        className: "hover:text-blue-200",
                                        children: t(link.key)
                                    }, link.key, false, {
                                        fileName: "[project]/components/Layout.js",
                                        lineNumber: 148,
                                        columnNumber: 33
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/components/Layout.js",
                                lineNumber: 144,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                        id: "siteSearch",
                                        type: "text",
                                        placeholder: "Search…",
                                        className: "hidden sm:block px-3 py-1.5 rounded-md bg-white bg-opacity-15 placeholder-black text-black border border-white border-opacity-20 focus:outline-none focus:ring-2 focus:ring-blue-200",
                                        onKeyDown: handleSearchKey
                                    }, void 0, false, {
                                        fileName: "[project]/components/Layout.js",
                                        lineNumber: 159,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("select", {
                                        id: "lang",
                                        className: "px-3 py-1.5 rounded-md bg-white bg-opacity-15 text-black border border-white border-opacity-20 focus:outline-none focus:ring-2 focus:ring-blue-200",
                                        value: lang,
                                        onChange: handleLangChange,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("option", {
                                                value: "en",
                                                children: "EN"
                                            }, void 0, false, {
                                                fileName: "[project]/components/Layout.js",
                                                lineNumber: 172,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("option", {
                                                value: "fr",
                                                children: "FR"
                                            }, void 0, false, {
                                                fileName: "[project]/components/Layout.js",
                                                lineNumber: 173,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("option", {
                                                value: "ar",
                                                children: "AR"
                                            }, void 0, false, {
                                                fileName: "[project]/components/Layout.js",
                                                lineNumber: 174,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/Layout.js",
                                        lineNumber: 166,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                        id: "mobileMenuBtn",
                                        type: "button",
                                        className: "md:hidden rounded-full border border-white border-opacity-40 p-2",
                                        onClick: ()=>setMenuOpen((open)=>!open),
                                        "aria-label": "Toggle navigation",
                                        children: "☰"
                                    }, void 0, false, {
                                        fileName: "[project]/components/Layout.js",
                                        lineNumber: 176,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/Layout.js",
                                lineNumber: 158,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/Layout.js",
                        lineNumber: 133,
                        columnNumber: 17
                    }, this),
                    menuOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        id: "mobileMenu",
                        className: "md:hidden bg-white/90 text-gray-900 px-4 py-3",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "flex flex-col gap-3",
                            children: NAV_LINKS.map((link)=>{
                                const href = resolveLinkHref(link);
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                                    href: href,
                                    className: "block font-medium",
                                    onClick: ()=>setMenuOpen(false),
                                    children: t(link.key)
                                }, link.key, false, {
                                    fileName: "[project]/components/Layout.js",
                                    lineNumber: 196,
                                    columnNumber: 37
                                }, this);
                            })
                        }, void 0, false, {
                            fileName: "[project]/components/Layout.js",
                            lineNumber: 192,
                            columnNumber: 25
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/Layout.js",
                        lineNumber: 188,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/Layout.js",
                lineNumber: 127,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("main", {
                children: children
            }, void 0, false, {
                fileName: "[project]/components/Layout.js",
                lineNumber: 211,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("footer", {
                className: "bg-blue-950 text-blue-100 mt-16",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-8",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h3", {
                                        className: "font-bold",
                                        children: "SOFRACOM"
                                    }, void 0, false, {
                                        fileName: "[project]/components/Layout.js",
                                        lineNumber: 216,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                        className: "text-sm mt-2 opacity-80",
                                        children: "Marine coatings & supplies in Monastir. Products, expertise, and partner yard for hassle-free projects."
                                    }, void 0, false, {
                                        fileName: "[project]/components/Layout.js",
                                        lineNumber: 217,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/Layout.js",
                                lineNumber: 215,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h4", {
                                        className: "font-semibold",
                                        children: t('footer.quick')
                                    }, void 0, false, {
                                        fileName: "[project]/components/Layout.js",
                                        lineNumber: 223,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("ul", {
                                        className: "mt-2 space-y-1 text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("li", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("a", {
                                                    href: "#home",
                                                    className: "hover:underline",
                                                    children: t('nav.home')
                                                }, void 0, false, {
                                                    fileName: "[project]/components/Layout.js",
                                                    lineNumber: 226,
                                                    columnNumber: 33
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/Layout.js",
                                                lineNumber: 225,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("li", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("a", {
                                                    href: "#about",
                                                    className: "hover:underline",
                                                    children: t('nav.about')
                                                }, void 0, false, {
                                                    fileName: "[project]/components/Layout.js",
                                                    lineNumber: 231,
                                                    columnNumber: 33
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/Layout.js",
                                                lineNumber: 230,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("li", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("a", {
                                                    href: "#brands",
                                                    className: "hover:underline",
                                                    children: t('nav.brands')
                                                }, void 0, false, {
                                                    fileName: "[project]/components/Layout.js",
                                                    lineNumber: 236,
                                                    columnNumber: 33
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/Layout.js",
                                                lineNumber: 235,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("li", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("a", {
                                                    href: "#services",
                                                    className: "hover:underline",
                                                    children: t('nav.services')
                                                }, void 0, false, {
                                                    fileName: "[project]/components/Layout.js",
                                                    lineNumber: 241,
                                                    columnNumber: 33
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/Layout.js",
                                                lineNumber: 240,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("li", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("a", {
                                                    href: "#contact",
                                                    className: "hover:underline",
                                                    children: t('nav.contact')
                                                }, void 0, false, {
                                                    fileName: "[project]/components/Layout.js",
                                                    lineNumber: 246,
                                                    columnNumber: 33
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/Layout.js",
                                                lineNumber: 245,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/Layout.js",
                                        lineNumber: 224,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/Layout.js",
                                lineNumber: 222,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h4", {
                                        className: "font-semibold",
                                        children: "Monastir"
                                    }, void 0, false, {
                                        fileName: "[project]/components/Layout.js",
                                        lineNumber: 253,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                        className: "text-sm mt-2 opacity-80",
                                        children: t('footer.monastir')
                                    }, void 0, false, {
                                        fileName: "[project]/components/Layout.js",
                                        lineNumber: 254,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/Layout.js",
                                lineNumber: 252,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/Layout.js",
                        lineNumber: 214,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "border-t border-blue-900",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "max-w-7xl mx-auto px-6 py-5 flex items-center justify-between text-xs opacity-70",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                    children: [
                                        "© ",
                                        new Date().getFullYear(),
                                        " SOFRACOM. All rights reserved."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/Layout.js",
                                    lineNumber: 261,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: "hover:underline",
                                    onClick: handleBackToTop,
                                    children: "Back to top"
                                }, void 0, false, {
                                    fileName: "[project]/components/Layout.js",
                                    lineNumber: 265,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/Layout.js",
                            lineNumber: 260,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/Layout.js",
                        lineNumber: 259,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/Layout.js",
                lineNumber: 213,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                id: "toTop",
                className: `fixed bottom-6 right-6 px-4 py-2 rounded-full bg-blue-900 text-white shadow-lg ${showToTop ? 'show' : ''}`,
                type: "button",
                onClick: handleBackToTop,
                children: "↑"
            }, void 0, false, {
                fileName: "[project]/components/Layout.js",
                lineNumber: 276,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/Layout.js",
        lineNumber: 126,
        columnNumber: 9
    }, this);
}
}),
"[project]/pages/_app.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$head$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/head.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Layout$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/Layout.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$contexts$2f$LangContext$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/contexts/LangContext.js [ssr] (ecmascript)");
;
;
;
;
;
function MyApp({ Component, pageProps }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$contexts$2f$LangContext$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["LangProvider"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$head$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("title", {
                        children: "SOFRACOM"
                    }, void 0, false, {
                        fileName: "[project]/pages/_app.js",
                        lineNumber: 10,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("meta", {
                        name: "viewport",
                        content: "width=device-width, initial-scale=1"
                    }, void 0, false, {
                        fileName: "[project]/pages/_app.js",
                        lineNumber: 11,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("link", {
                        rel: "preconnect",
                        href: "https://fonts.googleapis.com"
                    }, void 0, false, {
                        fileName: "[project]/pages/_app.js",
                        lineNumber: 12,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("link", {
                        rel: "preconnect",
                        href: "https://fonts.gstatic.com",
                        crossOrigin: "anonymous"
                    }, void 0, false, {
                        fileName: "[project]/pages/_app.js",
                        lineNumber: 16,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("link", {
                        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
                        rel: "stylesheet"
                    }, void 0, false, {
                        fileName: "[project]/pages/_app.js",
                        lineNumber: 21,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("link", {
                        href: "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css",
                        rel: "stylesheet"
                    }, void 0, false, {
                        fileName: "[project]/pages/_app.js",
                        lineNumber: 25,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/_app.js",
                lineNumber: 9,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Layout$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(Component, {
                    ...pageProps
                }, void 0, false, {
                    fileName: "[project]/pages/_app.js",
                    lineNumber: 31,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/pages/_app.js",
                lineNumber: 30,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/pages/_app.js",
        lineNumber: 8,
        columnNumber: 9
    }, this);
}
const __TURBOPACK__default__export__ = MyApp;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__581b4de8._.js.map