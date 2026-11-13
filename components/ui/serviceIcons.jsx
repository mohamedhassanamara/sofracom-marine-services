import { Anchor, Layers, MessageSquareText, Package, Paintbrush, Ship, Sparkles, Zap } from './icons';

// One icon per service (every key in lib/quote.js QUOTE_SERVICES), used wherever a service is
// listed: the quote form's picker and the home page's service chips.
export const SERVICE_ICONS = {
    antifouling: Paintbrush,
    gelcoat: Layers,
    deck: Anchor,
    electrical: Zap,
    polishing: Sparkles,
    haulout: Ship,
    products: Package,
    other: MessageSquareText,
};
