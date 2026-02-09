import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';

const formatCurrency = (value, currency = 'TND') => {
    const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
    return new Intl.NumberFormat('fr-TN', {
        style: 'currency',
        currency,
    }).format(amount);
};

const formatDate = value => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString('en-US', {
        hour12: true,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const ORDER_FLOW = ['new', 'waiting', 'in_progress', 'treated'];
const ORDER_STATUS_SET = new Set([...ORDER_FLOW, 'declined']);

const slugify = value =>
    String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

const buildCatalogProductMap = payload => {
    const categories = Array.isArray(payload?.categories) ? payload.categories : [];
    const mapping = {};
    categories.forEach(category => {
        const categorySlug = category?.slug || slugify(category?.name);
        const products = Array.isArray(category?.products) ? category.products : [];
        products.forEach(product => {
            const productId = `${categorySlug}-${slugify(product?.title)}`;
            mapping[productId] = `/products/${categorySlug}/${productId}`;
        });
    });
    return mapping;
};

const generateAddressId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `addr-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export default function AccountPage() {
    const {
        user,
        profile,
        token,
        isAuthenticated,
        signIn,
        signUp,
        signOut,
        updateProfile,
        profileLoading,
        profileError,
    } = useAuth();
    const { t } = useLang();
    const [signInForm, setSignInForm] = useState({ email: '', password: '' });
    const [signUpForm, setSignUpForm] = useState({ name: '', phone: '', email: '', password: '' });
    const [signInStatus, setSignInStatus] = useState({ message: '', type: '' });
    const [signUpStatus, setSignUpStatus] = useState({ message: '', type: '' });
    const [addressForm, setAddressForm] = useState({ label: '', address: '' });
    const [addressStatus, setAddressStatus] = useState({ message: '', type: '' });
    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersError, setOrdersError] = useState('');
    const [openOrders, setOpenOrders] = useState([]);
    const [catalogProductMap, setCatalogProductMap] = useState({});

    const savedAddresses = useMemo(
        () => (Array.isArray(profile?.addresses) ? profile.addresses : []),
        [profile]
    );
    const avatarInitials = useMemo(() => {
        const source = profile?.name || user?.displayName || user?.email || '';
        const words = source.trim().split(/\s+/).filter(Boolean);
        if (!words.length) return '👤';
        if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
        return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
    }, [user, profile]);
    const defaultAddress = savedAddresses.find(addr => addr.id === profile?.defaultAddressId);

    const loadOrders = useCallback(async () => {
        if (!token) return;
        setOrdersLoading(true);
        setOrdersError('');
        try {
            const response = await fetch('/api/orders', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const payload = await response.json();
            if (!response.ok || !payload.ok) {
                throw new Error(payload.error || 'Unable to load orders');
            }
            setOrders(Array.isArray(payload.orders) ? payload.orders : []);
        } catch (error) {
            setOrdersError(error.message || 'Failed to load orders');
        } finally {
            setOrdersLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    useEffect(() => {
        if (!token) {
            setOrders([]);
        }
    }, [token]);

    useEffect(() => {
        let cancelled = false;
        const loadCatalogMap = async () => {
            try {
                const response = await fetch('/assets/data/products.json');
                if (!response.ok) return;
                const payload = await response.json();
                if (cancelled) return;
                setCatalogProductMap(buildCatalogProductMap(payload));
            } catch {
                if (cancelled) return;
                setCatalogProductMap({});
            }
        };
        loadCatalogMap();
        return () => {
            cancelled = true;
        };
    }, []);

    const toggleOrderDetails = useCallback(id => {
        setOpenOrders(prev =>
            prev.includes(id) ? prev.filter(entry => entry !== id) : [...prev, id]
        );
    }, []);

    const inputClass =
        'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200';

    const cardClass = 'bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]';

    const orderStatusClasses = {
        new: 'bg-blue-100 text-blue-800 border border-blue-200',
        waiting: 'bg-orange-100 text-orange-700 border border-orange-200',
        in_progress: 'bg-yellow-100 text-amber-800 border border-amber-200',
        treated: 'bg-green-100 text-green-800 border border-green-200',
        declined: 'bg-red-100 text-red-800 border border-red-200',
    };

    const normalizeOrderStatus = useCallback(status => {
        const normalized = String(status || 'new')
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, '_');
        if (ORDER_STATUS_SET.has(normalized)) {
            return normalized;
        }
        return 'new';
    }, []);

    const getStatusBadge = status => {
        const key = normalizeOrderStatus(status);
        return orderStatusClasses[key] || orderStatusClasses.new;
    };

    const getOrderStatusLabel = status => {
        const key = normalizeOrderStatus(status);
        const translated = t(`orderStatus.${key}`);
        return translated || t('orderStatus.new');
    };

    const formatItemCount = count => {
        const singular = t('account.itemsSingular');
        const plural = t('account.itemsPlural');
        if (count === 1) {
            return `1 ${singular}`;
        }
        return `${count} ${plural}`;
    };

    const resolveOrderItemUrl = useCallback(item => {
        if (!item || typeof item !== 'object') return '';
        if (typeof item.product_url === 'string' && item.product_url) {
            return item.product_url;
        }
        const productId = item.product_id || item.productId || '';
        return catalogProductMap[productId] || '';
    }, [catalogProductMap]);

    const handleSignInSubmit = async event => {
        event.preventDefault();
        setSignInStatus({ message: t('account.signingIn'), type: 'info' });
        try {
            await signIn(signInForm.email.trim(), signInForm.password);
            setSignInStatus({ message: t('account.signInSuccess'), type: 'success' });
            setSignInForm({ email: '', password: '' });
        } catch (error) {
            setSignInStatus({ message: error.message || t('account.signInFailed'), type: 'error' });
        }
    };

    const handleSignUpSubmit = async event => {
        event.preventDefault();
        if (signUpForm.password.length < 6) {
            setSignUpStatus({ message: t('account.passwordMinChars'), type: 'error' });
            return;
        }
        setSignUpStatus({ message: t('account.creatingAccount'), type: 'info' });
        try {
            await signUp({
                email: signUpForm.email.trim(),
                password: signUpForm.password,
                name: signUpForm.name.trim(),
                phone: signUpForm.phone.trim(),
            });
            setSignUpStatus({ message: t('account.accountCreatedSuccess'), type: 'success' });
            setSignUpForm({ name: '', phone: '', email: '', password: '' });
        } catch (error) {
            setSignUpStatus({ message: error.message || t('account.signUpFailed'), type: 'error' });
        }
    };

    const handleAddAddress = async event => {
        event.preventDefault();
        const trimmedAddress = addressForm.address.trim();
        if (!trimmedAddress) {
            setAddressStatus({ message: t('account.addressRequired'), type: 'error' });
            return;
        }
        const nextAddress = {
            id: generateAddressId(),
            label: addressForm.label.trim(),
            address: trimmedAddress,
        };
        const nextAddresses = [...savedAddresses, nextAddress];
        const nextDefault = profile?.defaultAddressId || nextAddress.id;
        try {
            await updateProfile({
                addresses: nextAddresses,
                defaultAddressId: nextDefault,
            });
            setAddressForm({ label: '', address: '' });
            setAddressStatus({ message: t('account.addressSaved'), type: 'success' });
        } catch (error) {
            setAddressStatus({ message: error.message || t('account.addressSaveFailed'), type: 'error' });
        }
    };

    const handleRemoveAddress = async id => {
        const nextAddresses = savedAddresses.filter(addr => addr.id !== id);
        const nextDefault =
            profile?.defaultAddressId === id ? nextAddresses[0]?.id : profile?.defaultAddressId;
        try {
            await updateProfile({
                addresses: nextAddresses,
                defaultAddressId: nextDefault || '',
            });
            setAddressStatus({ message: t('account.addressRemoved'), type: 'success' });
        } catch (error) {
            setAddressStatus({ message: error.message || t('account.addressRemoveFailed'), type: 'error' });
        }
    };

    const handleSetDefault = async id => {
        try {
            await updateProfile({ defaultAddressId: id });
            setAddressStatus({ message: t('account.defaultAddressUpdated'), type: 'success' });
        } catch (error) {
            setAddressStatus({ message: error.message || t('account.defaultAddressUpdateFailed'), type: 'error' });
        }
    };

    const stats = {
        addresses: savedAddresses.length,
        orders: orders.length,
        lastOrder: orders[0] ? formatDate(orders[0].created_at) : t('account.noOrders'),
        defaultAddressLabel:
            defaultAddress?.label || defaultAddress?.address || t('account.noDefaultAddress'),
    };

    return (
        <>
            <Head>
                <title>Account • SOFRACOM</title>
            </Head>
            <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
                <section className="space-y-4">
                    <p className="text-sm text-gray-500 uppercase tracking-wide">{t('account.label')}</p>
                    <h1 className="text-3xl font-extrabold text-gray-900">{t('account.mainTitle')}</h1>
                    <p className="text-gray-600">
                        {t('account.subtitle')}
                    </p>
                </section>
                {isAuthenticated ? (
                    <section className="space-y-6">
                        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                        <div className={`${cardClass} space-y-4`}>
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-900 to-blue-500 text-2xl font-bold text-white shadow-2xl">
                                        {avatarInitials}
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-gray-400">
                                            {t('account.label')}
                                        </p>
                                        <h2 className="text-2xl font-bold text-gray-900">
                                            {profile?.name || user?.displayName || t('account.yourProfile')}
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {user?.email || profile?.phone || t('account.phoneNotSaved')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => signOut()}
                                    className="rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-blue-600 transition hover:border-blue-500 hover:text-blue-500"
                                >
                                    {t('account.signOut')}
                                </button>
                            </div>
                            <p className="text-sm text-gray-500">
                                {t('account.profileSubtitle')}
                            </p>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-xs uppercase tracking-wide text-gray-500">
                                    <p>{t('account.savedAddresses')}</p>
                                    <p className="mt-1 text-lg font-semibold text-gray-900">{stats.addresses}</p>
                                </div>
                                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-xs uppercase tracking-wide text-gray-500">
                                    <p>{t('account.orders')}</p>
                                    <p className="mt-1 text-lg font-semibold text-gray-900">{stats.orders}</p>
                                </div>
                                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-xs uppercase tracking-wide text-gray-500">
                                    <p>{t('account.lastOrder')}</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-900">{stats.lastOrder}</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500">
                                {t('account.statsTip')}
                            </p>
                            {profileLoading && (
                                <p className="text-xs text-gray-500">{t('account.refreshingProfile')}</p>
                            )}
                            {profileError && (
                                <p className="quote-status error">{profileError}</p>
                            )}
                        </div>
                            <div className={`${cardClass} space-y-4`}>
                                <p className="text-xs uppercase tracking-wide text-gray-500">
                                    {t('account.highlights')}
                                </p>
                                <div className="space-y-3 text-sm text-gray-600">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-gray-900">
                                            {t('account.defaultAddress')}
                                        </span>
                                        <span className="text-gray-500">{stats.defaultAddressLabel}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-gray-900">
                                            {t('account.phoneLabel')}
                                        </span>
                                        <span className="text-gray-500">
                                            {profile?.phone || t('account.phoneNotSaved')}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-gray-900">
                                            {t('account.accountCreated')}
                                        </span>
                                        <span className="text-gray-500">
                                            {profile?.created_at ? formatDate(profile.created_at) : '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-6 lg:grid-cols-2">
                            <div className={`${cardClass} space-y-4`}>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-gray-900">{t('account.savedAddresses')}</h2>
                                    <p className="text-sm text-gray-500">
                                        {savedAddresses.length}{' '}
                                        {savedAddresses.length === 1 ? t('account.address') : t('account.addresses')}
                                    </p>
                                </div>
                                <form className="space-y-3" onSubmit={handleAddAddress}>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <label className="block text-sm font-semibold text-gray-700">
                                            <span>{t('account.addressLabel')}</span>
                                            <input
                                                type="text"
                                                placeholder={t('account.labelPlaceholder')}
                                                value={addressForm.label}
                                                onChange={event =>
                                                    setAddressForm(prev => ({
                                                        ...prev,
                                                        label: event.target.value,
                                                    }))
                                                }
                                                className={inputClass}
                                            />
                                        </label>
                                        <label className="block text-sm font-semibold text-gray-700">
                                            <span>{t('account.addressField')}</span>
                                            <textarea
                                                rows="2"
                                                placeholder={t('account.addressPlaceholder')}
                                                value={addressForm.address}
                                                onChange={event =>
                                                    setAddressForm(prev => ({
                                                        ...prev,
                                                        address: event.target.value,
                                                    }))
                                                }
                                                className={inputClass}
                                            />
                                        </label>
                                    </div>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center justify-center rounded-full bg-blue-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-800"
                                    >
                                        {t('account.saveAddress')}
                                    </button>
                                    {addressStatus.message && (
                                        <p className={`quote-status ${addressStatus.type}`.trim()}>
                                            {addressStatus.message}
                                        </p>
                                    )}
                                </form>
                                <div className="space-y-3">
                                    {savedAddresses.length ? (
                                        savedAddresses.map(address => (
                                            <article
                                                key={address.id}
                                                className="group rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-blue-50 p-4 transition hover:border-blue-300"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {address.label || t('account.address')}
                                                        </p>
                                                        <p className="text-xs text-gray-500">#{address.id.slice(-6)}</p>
                                                    </div>
                                                    <span
                                                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-center ${address.id === defaultAddress?.id ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-white text-gray-600 border border-gray-200'}`}
                                                    >
                                                        {address.id === defaultAddress?.id
                                                            ? t('account.badgeDefault')
                                                            : t('account.badgeSaved')}
                                                    </span>
                                                </div>
                                                <p className="mt-2 text-sm text-gray-700">{address.address}</p>
                                                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide">
                                                    {address.id !== defaultAddress?.id && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetDefault(address.id)}
                                                            className="text-blue-600 hover:underline"
                                                        >
                                                            {t('account.setDefault')}
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveAddress(address.id)}
                                                        className="text-red-600 hover:underline"
                                                    >
                                                        {t('account.remove')}
                                                    </button>
                                                </div>
                                            </article>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500">
                                            {t('account.saveFirstAddress')}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className={`${cardClass} space-y-4`}>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-gray-900">{t('account.orderHistory')}</h2>
                                    <button
                                        type="button"
                                        onClick={loadOrders}
                                        className="text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-800"
                                    >
                                        {t('account.refresh')}
                                    </button>
                                </div>
                                {ordersLoading && <p className="text-sm text-gray-500">{t('account.loadingOrders')}</p>}
                                {ordersError && <p className="quote-status error">{ordersError}</p>}
                                {!ordersLoading && !orders.length && (
                                    <p className="text-sm text-gray-500">{t('account.noOrders')}</p>
                                )}
                                <div className="space-y-3">
                                    {orders.map(order => {
                                        const orderItems = Array.isArray(order.items) ? order.items : [];
                                        const isOpen = openOrders.includes(order.id);
                                        const totalCurrency = order.currency || 'TND';
                                        const normalizedStatus = normalizeOrderStatus(order.status);
                                        const timelineIndex = ORDER_FLOW.includes(normalizedStatus)
                                            ? ORDER_FLOW.indexOf(normalizedStatus)
                                            : -1;
                                        const statusUnknown = normalizedStatus === 'declined';
                                        return (
                                            <article
                                                key={order.id}
                                                className="space-y-4 rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 shadow-sm"
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div>
                                                        <span className="text-xs uppercase tracking-wide text-gray-500">
                                                            {formatDate(order.created_at)}
                                                        </span>
                                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                                            <span
                                                                className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold ${getStatusBadge(order.status)}`}
                                                            >
                                                                {getOrderStatusLabel(order.status)}
                                                            </span>
                                                            <span className="text-xs font-semibold text-gray-900">
                                                                {formatItemCount(orderItems.length)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {formatCurrency(order.total, totalCurrency)}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[0.65rem] uppercase tracking-wide text-gray-500">
                                                        {t('orders.timelineLabel')}
                                                    </p>
                                                    <div className="rounded-xl border border-gray-100 bg-white p-3">
                                                        <div className="grid gap-2 sm:grid-cols-4">
                                                        {ORDER_FLOW.map((step, idx) => {
                                                            const completed = idx <= timelineIndex;
                                                            const current = idx === timelineIndex;
                                                            return (
                                                                <div key={`${order.id}-flow-${step}`} className="space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span
                                                                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[0.65rem] font-bold ${
                                                                                completed
                                                                                    ? 'bg-blue-600 text-white'
                                                                                    : 'bg-gray-200 text-gray-500'
                                                                            }`}
                                                                        >
                                                                        {idx + 1}
                                                                        </span>
                                                                        <span className={`text-[0.65rem] uppercase tracking-wide ${current ? 'font-semibold text-gray-900' : completed ? 'text-gray-700' : 'text-gray-400'}`}>
                                                                        {t(`orderStatus.${step}`)}
                                                                        </span>
                                                                    </div>
                                                                    {idx < ORDER_FLOW.length - 1 && (
                                                                        <div className={`h-0.5 w-full ${idx < timelineIndex ? 'bg-blue-500' : 'bg-gray-200'}`} />
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                        </div>
                                                        {statusUnknown && (
                                                            <p className="mt-2 text-xs text-gray-500">
                                                                {getOrderStatusLabel(order.status)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs uppercase tracking-wide text-gray-500">
                                                        {t('orders.detailsTitle')}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleOrderDetails(order.id)}
                                                        className="text-xs font-semibold text-blue-600 hover:underline"
                                                    >
                                                        {isOpen ? t('orders.hideDetails') : t('orders.showDetails')}
                                                    </button>
                                                </div>
                                                {isOpen && (
                                                    <div className="space-y-4 rounded-2xl border border-gray-100 bg-white px-4 py-4 text-sm text-gray-700">
                                                        <div>
                                                            <p className="text-[0.65rem] uppercase tracking-wide text-gray-500">
                                                                {t('orders.itemsLabel')}
                                                            </p>
                                                            <div className="mt-3 space-y-3">
                                                                {orderItems.length ? (
                                                                    orderItems.map((item, index) => {
                                                                        const resolvedProductUrl = resolveOrderItemUrl(item);
                                                                        return (
                                                                        <div
                                                                            key={`${order.id}-${item.id || index}`}
                                                                            className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3"
                                                                        >
                                                                            <div className="flex items-start justify-between gap-3">
                                                                                <div className="space-y-1">
                                                                                    {resolvedProductUrl ? (
                                                                                        <Link href={resolvedProductUrl} className="text-sm font-semibold text-blue-700 hover:underline">
                                                                                            {item.title}
                                                                                        </Link>
                                                                                    ) : (
                                                                                        <span className="text-sm font-semibold text-gray-900">
                                                                                            {item.title}
                                                                                        </span>
                                                                                    )}
                                                                                    {resolvedProductUrl && (
                                                                                        <Link href={resolvedProductUrl} className="block text-xs font-medium text-blue-500 hover:underline">
                                                                                            {t('orders.itemOpenProduct')}
                                                                                        </Link>
                                                                                    )}
                                                                                    <p className="text-xs text-gray-500">
                                                                                        {item.quantity} × {formatCurrency(item.price, totalCurrency)}
                                                                                    </p>
                                                                                </div>
                                                                                {resolvedProductUrl ? (
                                                                                    <Link
                                                                                        href={`${resolvedProductUrl}#reviews`}
                                                                                        className="text-xs font-semibold text-blue-600 hover:underline"
                                                                                    >
                                                                                        {t('orders.itemLeaveReview')}
                                                                                    </Link>
                                                                                ) : (
                                                                                    <span className="text-xs text-gray-400">
                                                                                        {t('orders.itemUnavailable')}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <p className="text-xs text-gray-500">
                                                                        {t('orders.noItems')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {order.customer_address && (
                                                            <div>
                                                                <p className="text-[0.65rem] uppercase tracking-wide text-gray-500">
                                                                    {t('orders.addressLabel')}
                                                                </p>
                                                                <p className="text-sm text-gray-700 mt-1">
                                                                    {order.customer_address}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {order.customer_notes && (
                                                            <p className="text-xs text-gray-500">
                                                                {t('account.notesPrefix')} {order.customer_notes}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center justify-between text-sm font-semibold text-gray-900">
                                                            <span>{t('orders.totalLabel')}</span>
                                                            <span>{formatCurrency(order.total, totalCurrency)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="grid gap-6 md:grid-cols-2">
                        <form
                            className={`${cardClass} space-y-4`}
                            onSubmit={handleSignInSubmit}
                        >
                            <p className="text-xs uppercase tracking-wide text-gray-500">
                                {t('account.returningCustomer')}
                            </p>
                            <h2 className="text-lg font-semibold text-gray-900">
                                {t('account.signInTitle')}
                            </h2>
                            <label className="block text-sm font-semibold text-gray-700">
                                <span>{t('account.email')}</span>
                                <input
                                    type="email"
                                    value={signInForm.email}
                                    onChange={event =>
                                        setSignInForm(prev => ({ ...prev, email: event.target.value }))
                                    }
                                    className={inputClass}
                                    required
                                />
                            </label>
                            <label className="block text-sm font-semibold text-gray-700">
                                <span>{t('account.password')}</span>
                                <input
                                    type="password"
                                    value={signInForm.password}
                                    onChange={event =>
                                        setSignInForm(prev => ({ ...prev, password: event.target.value }))
                                    }
                                    className={inputClass}
                                    required
                                />
                            </label>
                            <button
                                type="submit"
                                className="inline-flex w-full items-center justify-center rounded-full bg-blue-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-800"
                            >
                                {t('account.signInButton')}
                            </button>
                            {signInStatus.message && (
                                <p className={`quote-status ${signInStatus.type}`.trim()}>
                                    {signInStatus.message}
                                </p>
                            )}
                        </form>
                        <form
                            className={`${cardClass} space-y-4`}
                            onSubmit={handleSignUpSubmit}
                        >
                            <p className="text-xs uppercase tracking-wide text-gray-500">
                                {t('account.signUpSubtitle')}
                            </p>
                            <h2 className="text-lg font-semibold text-gray-900">
                                {t('account.signUpTitle')}
                            </h2>
                            <label className="block text-sm font-semibold text-gray-700">
                                <span>{t('account.name')}</span>
                                <input
                                    type="text"
                                    value={signUpForm.name}
                                    onChange={event =>
                                        setSignUpForm(prev => ({ ...prev, name: event.target.value }))
                                    }
                                    className={inputClass}
                                    required
                                />
                            </label>
                            <label className="block text-sm font-semibold text-gray-700">
                                <span>{t('account.phoneNumber')}</span>
                                <input
                                    type="tel"
                                    value={signUpForm.phone}
                                    onChange={event =>
                                        setSignUpForm(prev => ({ ...prev, phone: event.target.value }))
                                    }
                                    className={inputClass}
                                    required
                                />
                            </label>
                            <label className="block text-sm font-semibold text-gray-700">
                                <span>{t('account.email')}</span>
                                <input
                                    type="email"
                                    value={signUpForm.email}
                                    onChange={event =>
                                        setSignUpForm(prev => ({ ...prev, email: event.target.value }))
                                    }
                                    className={inputClass}
                                    required
                                />
                            </label>
                            <label className="block text-sm font-semibold text-gray-700">
                                <span>{t('account.password')}</span>
                                <input
                                    type="password"
                                    value={signUpForm.password}
                                    onChange={event =>
                                        setSignUpForm(prev => ({ ...prev, password: event.target.value }))
                                    }
                                    className={inputClass}
                                    required
                                />
                            </label>
                            <button
                                type="submit"
                                className="inline-flex w-full items-center justify-center rounded-full bg-blue-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-800"
                            >
                                {t('account.signUpButton')}
                            </button>
                            {signUpStatus.message && (
                                <p className={`quote-status ${signUpStatus.type}`.trim()}>
                                    {signUpStatus.message}
                                </p>
                            )}
                        </form>
                    </section>
                )}
            </main>
        </>
    );
}
