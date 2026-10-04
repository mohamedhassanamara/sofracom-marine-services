import { useState } from 'react';
import Seo from '../components/Seo';
import { LocaleScope, useLang } from '../contexts/LangContext';
import { getCategories } from '../lib/products';
import { localizeProduct } from '../lib/localize';
import { ORDER_STATUSES, QUOTE_STATUSES } from '../lib/status';
import tokens from '../lib/design/tokens';
import {
    Badge,
    Breadcrumb,
    Button,
    Card,
    Checkbox,
    ChoiceGroup,
    Dialog,
    Drawer,
    EmptyState,
    Field,
    Input,
    LoadMore,
    Pagination,
    Price,
    ProductCard,
    QuantityStepper,
    Radio,
    RatingSummary,
    Segmented,
    Select,
    Skeleton,
    StarInput,
    Stars,
    StatusBadge,
    StockBadge,
    Tabs,
    Textarea,
    useToast,
} from '../components/ui';
import { ArrowRight, MessageSquareText, Search, ShoppingCart, Trash2 } from '../components/ui/icons';

// Developer page (noindex, not in the sitemap): every UI kit component in English and Arabic.
export function getStaticProps() {
    const products = getCategories()
        .flatMap(category => category.products)
        .filter(product => product.variants?.length !== 1)
        .slice(0, 40);
    const pick = [products.find(p => p.variants?.length > 1), products.find(p => !p.variants?.length || p.variants.length === 0), products.find(p => p.stock === 'out' || p.variants?.some(v => v.stock === 'on-order'))]
        .filter(Boolean)
        .map(({ id, categorySlug, title, brand, image, price, stock, variants, translations }) => ({ id, categorySlug, title, brand, image, price, stock, variants, translations }));
    return { props: { products: pick } };
}

function Section({ title, children }) {
    return (
        <section className="border-t border-slate-200 py-10">
            <h2 className="mb-6 text-xl font-semibold text-navy-900">{title}</h2>
            {children}
        </section>
    );
}

// The same content in English and Arabic, side by side on large screens.
function BothLanguages({ children }) {
    return (
        <div className="grid gap-6 lg:grid-cols-2">
            {['en', 'ar'].map(lang => (
                <LocaleScope key={lang} lang={lang}>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{lang === 'en' ? 'English · LTR' : 'العربية · RTL'}</p>
                        {children}
                    </div>
                </LocaleScope>
            ))}
        </div>
    );
}

// Label colour with the better contrast on a swatch.
const labelOn = hex => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return 1.05 / (lum + 0.05) > (lum + 0.05) / 0.05 ? '#ffffff' : '#0f172a';
};

function Swatches() {
    const scales = ['navy', 'accent', 'slate', 'success', 'warning', 'danger'];
    return (
        <div className="space-y-3">
            {scales.map(name => (
                <div key={name} className="flex items-center gap-3">
                    <span className="w-20 text-sm font-medium text-slate-700">{name}</span>
                    <div className="flex flex-1 overflow-hidden rounded-md border border-slate-200">
                        {Object.entries(tokens.colors[name]).map(([shade, hex]) => (
                            <div key={shade} className="h-12 flex-1" style={{ background: hex }} title={`${name}-${shade} ${hex}`}>
                                <span className="block px-1 pt-1 text-[10px] font-semibold" style={{ color: labelOn(hex) }}>
                                    {shade}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function TypeScale() {
    return (
        <div className="space-y-2">
            {Object.entries(tokens.fontSize)
                .reverse()
                .map(([name, [size, lineHeight]]) => (
                    <p key={name} className="font-semibold text-slate-900" style={{ fontSize: size, lineHeight }}>
                        <span className="me-4 inline-block w-14 text-xs font-medium text-slate-500">{name}</span>
                        {size} · Antifouling مضاد الحشف
                    </p>
                ))}
            <div className="flex flex-wrap gap-4 pt-4">
                {['sm', 'md', 'lg', 'xl', 'full'].map(r => (
                    <div key={r} className="flex h-16 w-16 items-center justify-center border border-navy-200 bg-navy-50 text-xs text-navy-800" style={{ borderRadius: tokens.borderRadius[r] }}>
                        {r}
                    </div>
                ))}
                {['sm', 'md', 'lg'].map(s => (
                    <div key={s} className="flex h-16 w-24 items-center justify-center rounded-lg bg-white text-xs text-slate-700" style={{ boxShadow: tokens.boxShadow[s] }}>
                        shadow-{s}
                    </div>
                ))}
            </div>
        </div>
    );
}

function Buttons() {
    const { t } = useLang();
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
                <Button>{t('ui.addToCart')}</Button>
                <Button variant="accent" icon={MessageSquareText}>
                    {t('nav.quote')}
                </Button>
                <Button variant="secondary">{t('ui.showMore')}</Button>
                <Button variant="ghost" iconEnd={ArrowRight} iconFlip>
                    {t('ui.next')}
                </Button>
                <Button variant="danger" icon={Trash2}>
                    {t('cart.remove')}
                </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" icon={ShoppingCart}>
                    {t('ui.addToCart')}
                </Button>
                <Button size="lg">{t('cart.checkout')}</Button>
                <Button loading>{t('ui.loading')}</Button>
                <Button disabled>{t('stock.out')}</Button>
                <Button variant="secondary" icon={Search} label={t('seo.search.title')} />
            </div>
            <div className="flex flex-wrap gap-3 rounded-md bg-navy-900 p-4">
                <Button variant="accent">{t('nav.quote')}</Button>
                <Button variant="inverse">{t('ui.showMore')}</Button>
            </div>
        </div>
    );
}

function Forms() {
    const { t } = useLang();
    const [qty, setQty] = useState(2);
    const [stars, setStars] = useState(4);
    return (
        <div className="grid gap-5">
            <Field label={t('form.name')} required hint="As on your ID">
                <Input autoComplete="name" defaultValue="" />
            </Field>
            <Field label={t('form.email')} error="Enter a valid email address.">
                <Input type="email" autoComplete="email" defaultValue="captain@" />
            </Field>
            <Field label={t('form.subject')} optional>
                <Select defaultValue="b">
                    <option value="a">Antifouling</option>
                    <option value="b">Gelcoat</option>
                </Select>
            </Field>
            <Field label={t('form.message')}>
                <Textarea placeholder="…" />
            </Field>
            <ChoiceGroup legend={t('ui.quantity')}>
                <Radio name={`r-${t('ui.close')}`} label="Delivery to the marina" description="Monastir, same day" defaultChecked />
                <Radio name={`r-${t('ui.close')}`} label="Pick up at the store" />
            </ChoiceGroup>
            <Checkbox label="Save this address" defaultChecked />
            <div className="flex flex-wrap items-center gap-6">
                <QuantityStepper value={qty} onChange={setQty} />
                <StarInput value={stars} onChange={setStars} />
            </div>
        </div>
    );
}

function Display({ products }) {
    const { lang } = useLang();
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
                {ORDER_STATUSES.map(status => (
                    <StatusBadge key={status} kind="order" status={status} />
                ))}
            </div>
            <div className="flex flex-wrap gap-2">
                {QUOTE_STATUSES.map(status => (
                    <StatusBadge key={status} kind="quote" status={status} />
                ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <StockBadge stock="in" />
                <StockBadge stock="on-order" />
                <StockBadge stock="out" />
                <Badge tone="primary">JOTUN</Badge>
                <Badge tone="info" size="sm">
                    New
                </Badge>
            </div>
            <div className="flex flex-wrap items-baseline gap-6">
                <Price value={341.887} size="xl" />
                <Price value={22.5} from />
                <Price value={2498.405} size="sm" />
            </div>
            <div className="flex flex-wrap items-center gap-6">
                <Stars value={4.3} />
                <RatingSummary stats={{ avg: 4.3, count: 12 }} />
            </div>
            <Breadcrumb
                items={[
                    { label: lang === 'ar' ? 'المنتجات' : 'Products', href: '/products' },
                    { label: lang === 'ar' ? 'مضادات الحشف' : 'Antifouling & Coatings', href: '/products/antifouling-coatings' },
                    { label: 'Jotun SeaForce Active 2.5L' },
                ]}
            />
            <div className="grid grid-cols-2 gap-4">
                {products.slice(0, 2).map(product => (
                    <ProductCard key={product.id} product={localizeProduct(product, lang)} stats={{ avg: 4.5, count: 3 }} onQuickAdd={() => {}} />
                ))}
            </div>
        </div>
    );
}

function Overlays() {
    const { t } = useLang();
    const toast = useToast();
    const [dialog, setDialog] = useState(false);
    const [drawer, setDrawer] = useState(false);
    const [tab, setTab] = useState('desc');
    const [sort, setSort] = useState('name');
    const [shown, setShown] = useState(24);
    const [page, setPage] = useState(3);
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => setDialog(true)}>
                    Dialog
                </Button>
                <Button variant="secondary" onClick={() => setDrawer(true)}>
                    Drawer
                </Button>
                <Button variant="secondary" onClick={() => toast.show({ title: t('ui.addedToCart'), description: 'Jotun SeaForce Active 2.5L', action: { label: t('ui.viewCart'), onClick: () => {} } })}>
                    Toast
                </Button>
                <Button variant="secondary" onClick={() => toast.show({ tone: 'danger', title: t('errors.generic') })}>
                    Error toast
                </Button>
            </div>
            <Dialog
                open={dialog}
                onClose={() => setDialog(false)}
                title={t('cart.remove')}
                description="Jotun SeaForce Active 2.5L"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setDialog(false)}>
                            {t('ui.close')}
                        </Button>
                        <Button variant="danger" onClick={() => setDialog(false)} data-autofocus>
                            {t('cart.remove')}
                        </Button>
                    </div>
                }
            >
                <p className="text-slate-700">{t('cart.onOrderBody')}</p>
            </Dialog>
            <Drawer open={drawer} onClose={() => setDrawer(false)} title={t('cart.title')} footer={<Button fullWidth>{t('cart.checkout')}</Button>}>
                <div className="space-y-3">
                    {Array.from({ length: 12 }, (_, i) => (
                        <Skeleton key={i} className="h-14" />
                    ))}
                </div>
            </Drawer>
            <Tabs
                label="Product"
                value={tab}
                onChange={setTab}
                tabs={[
                    { id: 'desc', label: 'Description', content: <p className="text-slate-700">{t('cart.onOrderBody')}</p> },
                    { id: 'specs', label: 'Specs', content: <p className="text-slate-700">2.5 L · 20 L</p> },
                    { id: 'reviews', label: t('ui.reviewsCount', { count: 3 }), content: <Stars value={4} /> },
                ]}
            />
            <Segmented
                label="Sort"
                value={sort}
                onChange={setSort}
                options={[
                    { value: 'name', label: 'A–Z' },
                    { value: 'price-asc', label: '↑ DT' },
                    { value: 'price-desc', label: '↓ DT' },
                ]}
            />
            <LoadMore shown={shown} total={60} onMore={() => setShown(n => n + 24)} />
            <Pagination page={page} pageCount={9} onChange={setPage} />
            <EmptyState title={t('cart.empty')} description={t('products.controls.searchPlaceholder')} action={<Button variant="secondary">{t('products.controls.reset')}</Button>} />
            <Card>
                <div className="space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            </Card>
        </div>
    );
}

export default function Styleguide({ products }) {
    return (
        <div className="mx-auto max-w-container px-4 py-10 sm:px-6">
            <Seo title="Styleguide" noindex />
            <h1 className="text-3xl font-semibold text-navy-900">SOFRACOM UI kit</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
                Tokens from <code>lib/design/tokens.js</code>, components from <code>components/ui</code>. Every component is shown in English (LTR) and Arabic (RTL).
            </p>
            <Section title="Colour, type, radius, elevation">
                <div className="grid gap-8 lg:grid-cols-2">
                    <Swatches />
                    <TypeScale />
                </div>
            </Section>
            <Section title="Buttons">
                <BothLanguages>
                    <Buttons />
                </BothLanguages>
            </Section>
            <Section title="Form fields">
                <BothLanguages>
                    <Forms />
                </BothLanguages>
            </Section>
            <Section title="Badges, prices, ratings, breadcrumb, product card">
                <BothLanguages>
                    <Display products={products} />
                </BothLanguages>
            </Section>
            <Section title="Dialog, drawer, toast, tabs, segmented, pagination, empty state, skeleton">
                <BothLanguages>
                    <Overlays />
                </BothLanguages>
            </Section>
        </div>
    );
}
