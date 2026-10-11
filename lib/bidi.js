// Mixed Arabic + Latin text ("براغي VYS، M4 × 20 مم"): the bidi algorithm reorders a
// Latin/number run like "M4 × 20" inside right-to-left text into "20 × M4". Wrapping each
// such run in Unicode isolates (LRI … PDI) keeps it in its own left-to-right order.
const LRI = '⁦';
const PDI = '⁩';
const RUN = /[A-Za-z0-9][A-Za-z0-9×*/.,:'"’+&®()-]*(?:[  ]+[A-Za-z0-9×*/.,:'"’+&®()-]+)*/g;

// Only runs that contain a Latin letter or "×" (plain numbers already read correctly).
export function isolateLtr(text) {
    if (typeof text !== 'string' || !/[؀-ۿ]/.test(text) || text.includes(LRI)) return text;
    return text.replace(RUN, run => (/[A-Za-z×]/.test(run) ? `${LRI}${run}${PDI}` : run));
}

export const stripIsolates = text => (typeof text === 'string' ? text.replace(/[⁦-⁩]/g, '') : text);
