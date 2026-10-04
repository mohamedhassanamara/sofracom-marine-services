import { useEffect, useState } from 'react';
import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../lib/apiClient';
import ResponsiveImage from '../components/ui/ResponsiveImage';
import Seo from '../components/Seo';
import { localBusinessJsonLd } from '../lib/seo';

const BRAND_LOGOS = [
    { name: 'AKZONOBEL', src: '/assets/brands/akzonobel-400.webp' },
    { name: 'BOSCH', src: '/assets/brands/bosch-400.webp' },
    { name: 'CROWN', src: '/assets/brands/crown-400.webp' },
    { name: 'HEMPEL', src: '/assets/brands/hempel-400.webp' },
    { name: 'INTERNATIONAL', src: '/assets/brands/international-400.webp' },
    { name: 'JOTUN', src: '/assets/brands/jotun-400.webp' },
    { name: 'SIKA', src: '/assets/brands/sika-400.webp' },
    { name: 'VARTA', src: '/assets/brands/varta-400.webp' },
];

const SERVICE_CARDS = [
    {
        title: 'Antifouling & Painting',
        description: 'Surface prep, primer, coatings. Correct systems for local waters.',
        path: 'M3 8l7.89 5.26c.68.45 1.54.45 2.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    },
    {
        title: 'Gelcoat & Fiberglass',
        description: 'Crack repair, fairing, color matching, finish restoration.',
        path: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 4v-4m0-4h.01',
    },
    {
        title: 'Deck & Hardware',
        description: 'Non-skid renewal, teak work, fittings, sealants (SIKA).',
        path: 'M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4',
    },
    {
        title: 'Electrical & Mechanical',
        description: 'Batteries (VARTA), engines (SHELL oils), wiring, diagnostics.',
        path: 'M6 13l4 4L18 9',
    },
    {
        title: 'Polishing & Protection',
        description: 'Cut, polish, sealants, corrosion & chain galvanizing support.',
        path: 'M12 6v12m6-6H6',
    },
    {
        title: 'Haul-out Coordination',
        description: 'Partner yard in Port de pêche. Free quote on request.',
        path: 'M8 7v10l9-5-9-5z',
    },
];

const TIMELINE = [
    {
        title: '1. Share your project',
        description: 'Tell us what you need: size, material, timeline.',
    },
    {
        title: '2. Quote & scheduling',
        description: 'We propose the system, products, and plan.',
    },
    {
        title: '3. Execution',
        description: 'Professionals carry out the work with our supplies.',
    },
    {
        title: '4. Delivery',
        description: 'Inspection, guidance, and after-care products.',
    },
];

const TESTIMONIALS = [
    {
        quote: '“Quick turnaround on antifouling. Helpful advice and fair pricing.”',
        author: '— A., 42ft sloop',
    },
    {
        quote: '“They organized haul-out and sorted a gelcoat repair that looks new.”',
        author: '— M., catamaran owner',
    },
    {
        quote: '“Stocked most of what we needed and delivered to the marina.”',
        author: '— M., motor yacht',
    },
];

const FAQ_ITEMS = [
    { questionKey: 'faq.q1', answerKey: 'faq.a1' },
    { questionKey: 'faq.q2', answerKey: 'faq.a2' },
    { questionKey: 'faq.q3', answerKey: 'faq.a3' },
];

export default function HomePage() {
    const { t, lang } = useLang();
    const [openFaq, setOpenFaq] = useState(null);
    const [quoteForm, setQuoteForm] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        details: '',
    });
    const [formStatus, setFormStatus] = useState({ message: '', type: '' });
    const { user, email: accountEmail, profile } = useAuth();

    // Signed-in visitors get their details prefilled; empty fields only.
    useEffect(() => {
        if (!user) return;
        setQuoteForm(form => ({
            ...form,
            name: form.name || profile?.name || user.displayName || '',
            email: form.email || accountEmail || profile?.email || '',
            phone: form.phone || profile?.phone || '',
        }));
    }, [user, profile]);
    const [submitting, setSubmitting] = useState(false);

    const handleFaqToggle = index => {
        setOpenFaq(openFaq === index ? null : index);
    };

    const handleInput = event => {
        const { name, value } = event.target;
        setQuoteForm(form => ({ ...form, [name]: value }));
    };

    const handleSubmit = async event => {
        event.preventDefault();
        const { name, email, details } = quoteForm;
        if (!name || !email || !details) {
            setFormStatus({
                message: 'Please provide name, email, and a message.',
                type: 'error',
            });
            return;
        }
        setSubmitting(true);
        setFormStatus({ message: 'Sending quote…', type: '' });
        try {
            await apiRequest('/api/create-quote', {
                method: 'POST',
                body: quoteForm,
                user,
            });
            setFormStatus({
                message: 'Quote received! We will reply within a day.',
                type: 'success',
            });
            setQuoteForm({
                name: '',
                email: '',
                phone: '',
                subject: '',
                details: '',
            });
        } catch (error) {
            console.error('[quote] submit failed', error);
            setFormStatus({
                message: error.message || 'Unable to send quote right now.',
                type: 'error',
            });
        } finally {
            setSubmitting(false);
            setTimeout(() => setFormStatus({ message: '', type: '' }), 6000);
        }
    };

    return (
        <>
            <Seo title={t('seo.home.title')} description={t('seo.home.description')} path="/" jsonLd={localBusinessJsonLd(lang)} />
            <section
                id="home"
                className="relative h-screen flex items-center justify-center text-white"
            >
                <ResponsiveImage
                    src="/assets/site/hero-800.webp"
                    alt="Monastir Marina"
                    sizes="100vw"
                    priority
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 hero-overlay" />
                <div className="absolute top-20 start-16 w-24 h-24 bg-white bg-opacity-10 rounded-full blur-lg float-slow" />
                <div className="absolute bottom-24 end-24 w-40 h-40 bg-navy-300 bg-opacity-10 rounded-full blur-xl float-slower" />
                <div className="relative text-center px-6" data-animate>
                    <h1 className="text-4xl sm:text-4xl lg:text-4xl font-extrabold leading-tight">
                        {t('hero.title')}
                    </h1>
                    <p className="mt-4 text-lg sm:text-xl text-navy-100 max-w-2xl mx-auto">
                        {t('hero.subtitle')}
                    </p>
                    <div className="mt-8 flex items-center justify-center gap-4">
                        <a
                            href="#services"
                            className="px-6 py-3 rounded-xl bg-white text-navy-900 font-semibold shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition"
                        >
                            {t('hero.cta1')}
                        </a>
                        <a
                            href="#contact"
                            className="px-6 py-3 rounded-xl bg-transparent border border-white text-white font-semibold hover:bg-white hover:text-navy-900 transition"
                        >
                            {t('hero.cta2')}
                        </a>
                    </div>
                </div>
                <div className="absolute bottom-0 start-0 end-0">
                    <svg
                        viewBox="0 0 1440 160"
                        className="w-full h-24 text-white"
                    >
                        <path
                            fill="currentColor"
                            d="M0,96L48,117.3C96,139,192,181,288,170.7C384,160,480,96,576,101.3C672,107,768,181,864,208C960,235,1056,213,1152,176C1248,139,1344,85,1392,58.7L1440,32L1440,160L1392,160C1344,160,1248,160,1152,160C1056,160,960,160,864,160C768,160,672,160,576,160C480,160,384,160,288,160C192,160,96,160,48,160L0,160Z"
                        />
                    </svg>
                </div>
            </section>

            <section
                className="parallax"
                style={{ backgroundImage: 'url(/assets/site/monastir-2-1600.webp)' }}
            >
                <div className="shade" />
                <div className="content max-w-7xl mx-auto px-6 py-24 text-center text-white" data-animate>
                    <h2 className="text-4xl font-extrabold">
                        {t('monoA.title')}
                    </h2>
                    <p className="mt-3 text-navy-100">{t('monoA.subtitle')}</p>
                </div>
            </section>

            <section id="about" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-center">
                    <div data-animate>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                            {t('about.title')}
                        </h2>
                        <p className="mt-4 text-slate-600 leading-relaxed">
                            SOFRACOM is based in Monastir, Tunisia. We provide a
                            complete package for the marine community: a
                            well-stocked store and a services division. We’re
                            close to <strong>Marina Monastir</strong> and the{' '}
                            <strong>Port de pêche</strong>, enabling quick
                            deliveries throughout the day.
                        </p>
                        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                            <li>
                                • Premium marine paints:{' '}
                                <b>JOTUN</b>, <b>HEMPEL</b>, <b>INTERNATIONAL</b>,{' '}
                                <b>AKZONOBEL</b>
                            </li>
                            <li>
                                • Products & tools: <b>SIKA</b>, <b>SHELL</b>{' '}
                                oils, <b>VARTA</b> batteries, <b>BOSCH</b>{' '}
                                machinery
                            </li>
                            <li>
                                • Network of pros: carpenters, electricians,
                                mechanics, upholsterers, welders
                            </li>
                            <li>
                                • Expert support for quick fixes & major refits
                            </li>
                        </ul>
                    </div>
                    <div className="relative" data-animate>
                        <div className="tilt bg-gradient-to-br from-navy-50 to-navy-100 rounded-xl p-6 shadow-lg">
                            <div className="layer">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white rounded-xl shadow-sm">
                                        <p className="font-semibold text-navy-900">
                                            Antifouling
                                        </p>
                                        <p className="text-sm text-slate-600">
                                            Protection & performance.
                                        </p>
                                    </div>
                                    <div className="p-4 bg-white rounded-xl shadow-sm">
                                        <p className="font-semibold text-navy-900">
                                            Gelcoat Repair
                                        </p>
                                        <p className="text-sm text-slate-600">
                                            Finish restoration.
                                        </p>
                                    </div>
                                    <div className="p-4 bg-white rounded-xl shadow-sm">
                                        <p className="font-semibold text-navy-900">
                                            Deck Renewal
                                        </p>
                                        <p className="text-sm text-slate-600">
                                            Teak & non-skid.
                                        </p>
                                    </div>
                                    <div className="p-4 bg-white rounded-xl shadow-sm">
                                        <p className="font-semibold text-navy-900">
                                            Haul-out
                                        </p>
                                        <p className="text-sm text-slate-600">
                                            Partner yard, 1 mile away.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="brands" className="py-20 bg-slate-50 wave-top">
                <div className="max-w-7xl mx-auto px-6">
                    <h2
                        className="text-3xl sm:text-4xl font-extrabold text-center text-slate-900"
                        data-animate
                    >
                        {t('brands.title')}
                    </h2>
                    <p
                        className="text-center text-slate-600 mt-2 max-w-2xl mx-auto"
                        data-animate
                    >
                        {t('brands.subtitle')}
                    </p>
                    <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                        {BRAND_LOGOS.map(brand => (
                            <div
                                key={brand.name}
                                className="brand-card tilt bg-white rounded-xl p-6 flex flex-col items-center justify-center shadow-sm transition duration-300 hover:scale-105 hover:shadow-lg"
                                data-animate
                                data-tilt
                            >
                                <img
                                    loading="lazy"
                                    src={brand.src}
                                    alt={brand.name}
                                    className="h-20 w-auto object-contain"
                                />
                                <span className="mt-3 text-sm font-semibold text-navy-900 layer">
                                    {brand.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="services" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <h2
                        className="text-3xl sm:text-4xl font-extrabold text-center text-slate-900"
                        data-animate
                    >
                        {t('services.title')}
                    </h2>
                    <p
                        className="text-center text-slate-600 mt-2 max-w-2xl mx-auto"
                        data-animate
                    >
                        From quick fixes to full refits. Our partner haul-out
                        facility is located in Monastir’s Port de pêche, about 1
                        mile from Monastir Marina.
                    </p>
                    <div className="mt-10 grid md:grid-cols-3 gap-6">
                        {SERVICE_CARDS.map(card => (
                            <div
                                key={card.title}
                                className="tilt bg-gradient-to-br from-white to-navy-50 rounded-xl p-6 shadow-sm"
                                data-animate
                                data-tilt
                            >
                                <div className="layer">
                                    <div className="flex items-start gap-3">
                                        <svg
                                            className="w-7 h-7 text-navy-700"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d={card.path}
                                            />
                                        </svg>
                                        <div>
                                            <h3 className="font-semibold text-lg text-navy-900">
                                                {card.title}
                                            </h3>
                                            <p className="text-slate-600 text-sm mt-1">
                                                {card.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-16 max-w-4xl mx-auto" data-animate>
                        <ol className="relative border-s-2 border-navy-100 ps-6 space-y-8">
                            {TIMELINE.map((step, index) => (
                                <li key={step.title}>
                                    <span
                                        className="absolute -start-3 w-6 h-6 rounded-full"
                                        style={{
                                            backgroundColor: `rgba(15,32,80,${
                                                1 -
                                                index / TIMELINE.length / 2
                                            })`,
                                        }}
                                    />
                                    <h4 className="font-semibold text-navy-900">
                                        {step.title}
                                    </h4>
                                    <p className="text-slate-600 text-sm">
                                        {step.description}
                                    </p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </section>

            <section
                className="parallax"
                style={{ backgroundImage: 'url(/assets/site/monastir-1-1600.webp)' }}
            >
                <div className="shade" />
                <div className="content max-w-7xl mx-auto px-6 py-24 text-center text-white" data-animate>
                    <h2 className="text-3xl font-bold">
                        {t('monoB.title')}
                    </h2>
                    <p className="mt-2 text-navy-100">{t('monoB.subtitle')}</p>
                </div>
            </section>

            <section className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6">
                    <h2
                        className="text-3xl sm:text-4xl font-extrabold text-center text-slate-900"
                        data-animate
                    >
                        {t('testimonials.title')}
                    </h2>
                    <div className="mt-10 grid md:grid-cols-3 gap-6">
                        {TESTIMONIALS.map(item => (
                            <figure
                                key={item.quote}
                                className="tilt bg-white rounded-xl p-6 shadow-sm"
                                data-animate
                                data-tilt
                            >
                                <blockquote className="layer text-slate-700">
                                    {item.quote}
                                </blockquote>
                                <figcaption className="mt-4 text-sm text-slate-500">
                                    {item.author}
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-20 bg-white">
                <div className="max-w-4xl mx-auto px-6">
                    <h2
                        className="text-3xl sm:text-4xl font-extrabold text-slate-900"
                        data-animate
                    >
                        {t('faq.title')}
                    </h2>
                    <div className="mt-6 divide-y">
                        {FAQ_ITEMS.map((item, index) => (
                            <div key={item.questionKey} className="faq-item py-4" data-animate>
                                <div
                                    className="faq-q flex items-center justify-between"
                                    onClick={() => handleFaqToggle(index)}
                                >
                                    <p className="font-semibold text-navy-900">
                                        {t(item.questionKey)}
                                    </p>
                                    <span>{openFaq === index ? '−' : '+'}</span>
                                </div>
                                <div
                                    className={`faq-a text-slate-600 mt-2 transition ${
                                        openFaq === index ? 'block' : 'hidden'
                                    }`}
                                >
                                    {t(item.answerKey)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="contact" className="py-20 bg-slate-50 wave-top">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-10">
                    <div data-animate>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                            {t('contact.title')}
                        </h2>
                        <p className="mt-3 text-slate-700">
                            {t('contact.address1')}
                            <br />
                            {t('contact.address2')}
                        </p>
                        <p className="mt-3 text-slate-700">
                            Phone:{' '}
                            <a className="text-navy-700" href="tel:+21652663210">
                                +216 52 663 210
                            </a>
                        </p>
                        <p className="text-slate-700">
                            Email:{' '}
                            <a
                                className="text-navy-700"
                                href="mailto:sofracomtunisia@gmail.com"
                            >
                                sofracomtunisia@gmail.com
                            </a>
                        </p>
                        <p className="text-slate-700">{t('contact.hours')}</p>
                        <div className="mt-6">
                            <a
                                href="#contact"
                                className="inline-block px-6 py-3 rounded-xl bg-navy-900 text-white font-semibold hover:bg-navy-800 transition"
                            >
                                {t('contact.btn')}
                            </a>
                        </div>
                    </div>
                    <form
                        id="quote-form"
                        className="bg-white rounded-xl p-6 shadow-sm"
                        onSubmit={handleSubmit}
                        data-animate
                    >
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-600" htmlFor="name">
                                    {t('form.name')}
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    value={quoteForm.name}
                                    onChange={handleInput}
                                    className="mt-1 w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-navy-200"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-600" htmlFor="email">
                                    {t('form.email')}
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={quoteForm.email}
                                    onChange={handleInput}
                                    className="mt-1 w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-navy-200"
                                    required
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm text-slate-600" htmlFor="phone">
                                    Phone
                                </label>
                                <input
                                    id="phone"
                                    name="phone"
                                    value={quoteForm.phone}
                                    onChange={handleInput}
                                    className="mt-1 w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-navy-200"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm text-slate-600" htmlFor="subject">
                                    {t('form.subject')}
                                </label>
                                <input
                                    id="subject"
                                    name="subject"
                                    value={quoteForm.subject}
                                    onChange={handleInput}
                                    className="mt-1 w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-navy-200"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm text-slate-600" htmlFor="details">
                                    {t('form.message')}
                                </label>
                                <textarea
                                    id="details"
                                    name="details"
                                    rows="4"
                                    value={quoteForm.details}
                                    onChange={handleInput}
                                    className="mt-1 w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-navy-200"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="mt-4 w-full px-6 py-3 rounded-xl bg-navy-900 text-white font-semibold hover:bg-navy-800 transition"
                            disabled={submitting}
                        >
                            {t('form.send')}
                        </button>
                        <p
                            id="quote-status"
                            className={`quote-status ${formStatus.type} mt-4 text-sm ${
                                formStatus.message ? '' : 'hidden'
                            }`}
                            aria-live="polite"
                        >
                            {formStatus.message}
                        </p>
                    </form>
                </div>
            </section>
        </>
    );
}
