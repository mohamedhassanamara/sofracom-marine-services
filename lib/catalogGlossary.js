// Catalog vocabulary in EN/FR/AR for use tags and option labels. The catalog's tags were
// typed by hand in a mix of English and French ("noir", "black", "érodable"), so each entry
// lists the spellings it replaces; tags that aren't here (brands, model codes) are kept as is.
// A product's own translations[lang].usage / .variants[i].label always win over this list.
// (FR/AR wording: drafted, to be checked by the shop with the catalog drafts.)
const ENTRIES = [
    // coatings
    ['Antifouling', 'Antifouling', 'مضاد الحشف', ['antifouling', 'anti-fouling']],
    ['Self-polishing', 'Autopolissant', 'ذاتي التلميع', ['self-polishing', 'self polishing', 'autopolissant']],
    ['Erodible', 'Érodable', 'قابل للتآكل التدريجي', ['erodable', 'érodable', 'erodible', 'hydrolysable']],
    ['Warm waters', 'Eaux chaudes', 'المياه الدافئة', ['warm waters']],
    ['Long-lasting', 'Longue durée', 'يدوم طويلًا', ['long-lasting']],
    ['Easy to apply', 'Application facile', 'سهل التطبيق', ['easy apply']],
    ['Primer', 'Primaire', 'طبقة أساسية', ['primer', 'primaire', 'apprêt']],
    ['Tie coat', 'Couche d’accrochage', 'طبقة ربط', ['tie coat']],
    ['Mid coat', 'Couche intermédiaire', 'طبقة وسطى', ['mid coat']],
    ['Finish coat', 'Couche de finition', 'طبقة نهائية', ['finish coat']],
    ['Epoxy', 'Époxy', 'إيبوكسي', ['epoxy', 'époxy', 'epoxy based']],
    ['Polyamide', 'Polyamide', 'بولي أميد', ['polyamide']],
    ['Polyurethane', 'Polyuréthane', 'بولي يوريثان', ['polyurethane', 'polyuréthane', 'pu']],
    ['Polyurethane primer', 'Apprêt polyuréthane', 'طبقة أساسية بولي يوريثان', ['polyurethane primer', 'apprêt polyuréthane']],
    ['2K polyurethane', 'Polyuréthane 2K', 'بولي يوريثان ثنائي المكوّن', ['2k polyurethane']],
    ['Acrylic', 'Acrylique', 'أكريليك', ['acrylic', 'acrylique']],
    ['Acrylic primer', 'Apprêt acrylique', 'طبقة أساسية أكريليك', ['acrylic primer']],
    ['Two-component (2K)', 'Bicomposant (2K)', 'ثنائي المكوّن (2K)', ['2k']],
    ['One-component (1K)', 'Monocomposant (1K)', 'أحادي المكوّن (1K)', ['1k', 'mono']],
    ['Thinner', 'Diluant', 'مُخفّف', ['thinner', 'diluant']],
    ['Hardener', 'Durcisseur', 'مُصلّب', ['hardener', 'durcisseur']],
    ['Varnish', 'Vernis', 'ورنيش', ['varnish', 'vernis']],
    ['Glossy', 'Brillant', 'لامع', ['glossy', 'brillant']],
    ['Matt', 'Fini mat', 'مطفأ', ['mate', 'matt']],
    ['Cellulose', 'Cellulosique', 'سليلوزي', ['cellulosic', 'cellulosique']],
    ['Spray', 'Aérosol', 'بخاخ', ['spray', 'aerosol', 'aérosol']],
    ['Zinc', 'Zinc', 'زنك', ['zinc']],
    ['Rust remover', 'Dérouillant', 'مزيل الصدأ', ['rust', 'désoxydant', 'rust remover']],
    ['Passivating', 'Passivant', 'مُخمِّل', ['passivant']],
    ['Paint remover', 'Décapant', 'مزيل الطلاء', ['paint remover', 'décapant']],
    ['Propeller', 'Hélice', 'المروحة', ['propeller', 'peller', 'helice', 'hélice']],
    ['Paint', 'Peinture', 'طلاء', ['paint', 'peinture']],
    // colours
    ['Black', 'Noir', 'أسود', ['black', 'noir']],
    ['White', 'Blanc', 'أبيض', ['white', 'blanc']],
    ['Grey', 'Gris', 'رمادي', ['gray', 'grey', 'gris']],
    ['Yellow', 'Jaune', 'أصفر', ['yellow', 'jaune']],
    ['Transparent', 'Transparent', 'شفاف', ['transparent', 'clear']],
    ['Coloured', 'Coloré', 'ملوّن', ['colored', 'coloured', 'coloré']],
    // sealants, fillers, composites
    ['Sealant', 'Mastic', 'مادة عزل', ['mastic', 'mastique']],
    ['Putty', 'Enduit', 'معجون', ['putty', 'enduit']],
    ['Deck hardware', 'Accastillage', 'تجهيزات السطح', ['deck hardware']],
    ['General bonding', 'Collage universel', 'لصق عام', ['general bonding']],
    ['Flexible', 'Flexible', 'مرن', ['flexible', 'elastic']],
    ['Windows', 'Hublots et vitrages', 'النوافذ والزجاج', ['windows']],
    ['UV-resistant', 'Résistant aux UV', 'مقاوم للأشعة فوق البنفسجية', ['uv-resistant']],
    ['Resin', 'Résine', 'راتنج', ['resin', 'résine']],
    ['Polyester', 'Polyester', 'بوليستر', ['polyester', 'polystere']],
    ['Gelcoat', 'Gelcoat', 'جلكوت', ['gelcoat']],
    ['Fiberglass', 'Fibre de verre', 'ألياف زجاجية', ['fiberglass', 'fibre de verre']],
    ['Fabric', 'Tissu', 'نسيج', ['tissu', 'fabric']],
    ['Silicone', 'Silicone', 'سيليكون', ['silicone']],
    ['Acetone', 'Acétone', 'أسيتون', ['acetone', 'acétone']],
    ['Foam', 'Mousse', 'رغوة', ['foam', 'mousse']],
    ['Soundproofing', 'Insonorisant', 'عازل للصوت', ['soundproof', 'insonore']],
    ['Plastic filler', 'Mastic pour plastique', 'معجون للبلاستيك', ['plastic filler', 'mastic flexible pour plastique']],
    ['Aluminium', 'Aluminium', 'ألومنيوم', ['aluminium', 'aluminum']],
    ['Cold weld', 'Soudure à froid', 'لحام بارد', ['cold welding', 'soudure à froid']],
    ['Marine', 'Marine', 'بحري', ['marine']],
    // oils, batteries
    ['Battery', 'Batterie', 'بطارية', ['battery', 'batterie', 'batteries']],
    ['Lithium', 'Lithium', 'ليثيوم', ['lithium']],
    ['Oil', 'Huile', 'زيت', ['oil', 'huile']],
    ['Hydraulic', 'Hydraulique', 'هيدروليكي', ['hydraulic', 'hydraulique']],
    ['Anti-bacterial', 'Antibactérien', 'مضاد للبكتيريا', ['anti-bacterial', 'antibactérien']],
    ['Additive', 'Additif', 'مضاف', ['additive', 'additif']],
    ['Transmission', 'Transmission', 'ناقل الحركة', ['transmission']],
    ['Steering', 'Direction', 'التوجيه', ['direction', 'steering']],
    ['Fluid', 'Fluide', 'سائل', ['fluide', 'fluid']],
    ['Filter', 'Filtre', 'فلتر', ['filter', 'filtre']],
    ['Grease', 'Graisse', 'شحم', ['grease', 'graisse']],
    ['Lubricant', 'Lubrifiant', 'مزلّق', ['lubricant', 'lubrifiant']],
    ['Penetrating oil', 'Dégrippant', 'مزيل التصاق', ['dégrippant']],
    // painting tools
    ['Brush', 'Pinceau', 'فرشاة', ['brush', 'pinceau']],
    ['Roller', 'Rouleau', 'رولة', ['roller', 'rouleau']],
    ['Long pile', 'Poils longs', 'وبر طويل', ['long pile']],
    ['Short pile', 'Poils courts', 'وبر قصير', ['short pile']],
    ['Paint tray', 'Bac à peinture', 'صينية طلاء', ['tray', 'bacs']],
    ['Filling knife', 'Spatule', 'مِلوَق', ['spatule', 'filling knife', 'filling']],
    ['Mixer', 'Malaxeur', 'خلاط', ['malaxeur']],
    ['Masking', 'Masquage', 'تغطية', ['masquage']],
    ['Tape', 'Ruban adhésif', 'شريط لاصق', ['tape', 'ruban', 'scotch']],
    ['Electrical tape', 'Ruban isolant', 'شريط عازل', ['electrical tape', 'toile isolant']],
    ['Spray gun', 'Pistolet de peinture', 'مسدس طلاء', ['spray gun', 'pistolet de peinture']],
    ['Sprayer', 'Pulvérisateur', 'بخّاخ', ['spray bottle', 'pulverisateur', 'pulvérisateur']],
    // safety
    ['Protection', 'Protection', 'حماية', ['protection', 'safety']],
    ['Ear protection', 'Protection auditive', 'واقي الأذن', ['earmuff', 'cache-oreilles']],
    ['Mask', 'Masque', 'كمامة', ['mask', 'masque']],
    ['Gloves', 'Gants', 'قفازات', ['gloves', 'gants']],
    ['Nitrile', 'Nitrile', 'نيتريل', ['nitrile', 'nitril']],
    ['Latex', 'Latex', 'لاتكس', ['latex']],
    ['Disposable', 'Jetable', 'للاستعمال مرة واحدة', ['disposable', 'jetable', 'dispasable']],
    ['Coverall', 'Combinaison', 'بدلة واقية', ['combinaison', 'suit']],
    // sanding and cutting
    ['Polishing', 'Polissage', 'تلميع', ['polish', 'polissage']],
    ['Sanding', 'Ponçage', 'صنفرة', ['sanding', 'ponçage', 'sand']],
    ['Grinding', 'Meulage', 'جلخ', ['grinding', 'grind', 'ebarbage']],
    ['Disc', 'Disque', 'قرص', ['disc', 'disque']],
    ['Flap disc', 'Disque à lamelles', 'قرص رقائقي', ['flap', 'lamel']],
    ['Backing pad', 'Plateau', 'قاعدة', ['plateau', 'pad']],
    ['Sponge', 'Éponge', 'إسفنجة', ['eponge', 'éponge', 'sponge']],
    ['Wool', 'Laine', 'صوف', ['wool', 'laine']],
    ['Abrasive', 'Abrasif', 'مادة كاشطة', ['abrasive', 'abrasives']],
    ['Wire brush', 'Brosse métallique', 'فرشاة سلكية', ['wire cup', 'brosse', 'brossse', 'wire']],
    ['Stainless steel', 'Inox', 'فولاذ مقاوم للصدأ', ['stainless steel', 'inox', 'inoxydable']],
    ['Steel', 'Acier', 'فولاذ', ['steel', 'acier']],
    ['Metal', 'Métal', 'معدن', ['metal', 'metalique', 'métallique']],
    ['Wood', 'Bois', 'خشب', ['wood', 'bois']],
    ['Saw', 'Scie', 'منشار', ['saw', 'scie']],
    ['Blade', 'Lame', 'شفرة', ['blade', 'lames']],
    ['Cutter', 'Cutter', 'قاطعة', ['cutter', 'knife']],
    ['Pipe cutter', 'Coupe-tube', 'قاطعة أنابيب', ['pipe cutter', 'coupe tube pvc']],
    // hand and power tools
    ['Screwdriver', 'Tournevis', 'مفك براغي', ['screwdriver', 'tournevis', 'scredriver']],
    ['Bits', 'Embouts', 'لقم', ['bit', 'bits', 'embout', 'screwdriver bits', 'jeu embout']],
    ['Magnetic', 'Magnétique', 'مغناطيسي', ['magnetic', 'magnetique']],
    ['Pliers', 'Pince', 'كمّاشة', ['plier', 'pince coupante', 'pince a gaz', 'pince universel']],
    ['Hammer', 'Marteau', 'مطرقة', ['hammer', 'marteau']],
    ['Wrench', 'Clé', 'مفتاح', ['wrench', 'spanner', 'clé', 'clé mixte']],
    ['Hex key', 'Clé six pans', 'مفتاح سداسي', ['hex key', 'hex', '6pans', 'clé male']],
    ['Ratchet', 'Cliquet', 'سقّاطة', ['ratchet', 'cliquet']],
    ['Socket', 'Douille', 'لقمة', ['socket']],
    ['Screw', 'Vis', 'برغي', ['screw', 'vis']],
    ['Washers', 'Rondelles', 'حلقات', ['washers', 'rondelle']],
    ['Set', 'Coffret', 'طقم', ['set', 'jeu', 'coffret']],
    ['Measuring tape', 'Mètre ruban', 'شريط قياس', ['measuring tape', 'metre a ruban']],
    ['Lamp', 'Lampe', 'مصباح', ['lamp', 'lampe']],
    ['Camping stove', 'Réchaud', 'موقد تخييم', ['camping stove', 'réchaud']],
    ['Drill', 'Perceuse', 'مثقاب', ['drill', 'perceuse']],
    ['Rotary hammer', 'Marteau perforateur', 'مطرقة دوّارة', ['rotary hammer', 'marteau perforateur']],
    ['Sander', 'Ponceuse', 'آلة صنفرة', ['sander', 'ponceuse', 'orbital sander', 'rotary sander', 'ponceuse vibrante']],
    ['Angle grinder', 'Meuleuse angulaire', 'جلّاخة زاوية', ['angle grinder', 'meuleuse angulaire']],
    ['Laser measure', 'Télémètre laser', 'جهاز قياس بالليزر', ['laser measure', 'télémètre']],
    ['Planer', 'Rabot', 'فارة', ['planer', 'rabot']],
    ['Jigsaw', 'Scie sauteuse', 'منشار أركت', ['jigsaw', 'scie sauteuse']],
    ['Circular saw', 'Scie circulaire', 'منشار دائري', ['circular saw', 'scie circulaire']],
    ['Mitre saw', 'Scie à onglet', 'منشار زوايا', ['mitresaw', 'scie a angle']],
    ['Router bits', 'Fraises de défonceuse', 'لقم راوتر', ['fraise', 'défonceuse']],
    ['Bilge pump', 'Pompe de cale', 'مضخة قاع القارب', ['pompe de cale', 'bilge']],
    ['Pump', 'Pompe', 'مضخة', ['pump', 'pompe']],
    ['Electrician', 'Électricien', 'كهربائي', ['electricien']],
    ['Soldering', 'Soudure', 'لحام', ['solder', 'soudure', 'soudeuse']],
    ['Cleaning', 'Nettoyage', 'تنظيف', ['nettoyage']],
    ['Medium yellow foam', 'Mousse jaune moyenne', 'رغوة صفراء متوسطة', ['medium yellow foam']],
    ['Soft black foam', 'Mousse noire souple', 'رغوة سوداء ناعمة', ['soft black foam']],
    ['Hard orange foam', 'Mousse orange dure', 'رغوة برتقالية صلبة', ['hard orange foam']],
];

export const normalizeTerm = value =>
    String(value || '')
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

const INDEX = new Map();
ENTRIES.forEach(([en, fr, ar, aliases]) => {
    const entry = { en, fr, ar };
    [en, fr, ...aliases].forEach(alias => {
        const key = normalizeTerm(alias);
        if (!INDEX.has(key)) INDEX.set(key, entry);
    });
});

// The term in `lang`, or null when the glossary doesn't know it.
export function glossaryTerm(value, lang) {
    const entry = INDEX.get(normalizeTerm(value));
    return entry ? entry[lang] || entry.en : null;
}

// Use tags for display: translated, without the brand (it's shown already) and without
// duplicates ("noir" and "black" are one tag).
export function localizeTags(tags, lang, { brand = '' } = {}) {
    const seen = new Set();
    const brandKey = normalizeTerm(brand);
    const out = [];
    for (const tag of Array.isArray(tags) ? tags : []) {
        const raw = String(tag || '').trim();
        if (!raw) continue;
        const known = glossaryTerm(raw, lang);
        if (!known && brandKey && normalizeTerm(raw) === brandKey) continue;
        const label = known || raw;
        const key = normalizeTerm(label);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(label);
    }
    return out;
}

export const GLOSSARY_SIZE = ENTRIES.length;
