// Stable product identifiers shared by the site, the admin tool and one-off scripts.
// CommonJS so the plain-Node admin tool can require it.
const { randomBytes } = require('crypto');

const ID_PATTERN = /^p_[a-z0-9]{8}$/;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

const slugify = value =>
    (value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

const generateProductId = () => {
    const bytes = randomBytes(8);
    let suffix = '';
    for (const byte of bytes) {
        suffix += ALPHABET[byte % ALPHABET.length];
    }
    return `p_${suffix}`;
};

// The id products had before stable ids existed: `${categorySlug}-${slugify(title)}`.
const computeLegacyId = (product, category) => {
    const categorySlug = category.slug || slugify(category.name);
    return `${categorySlug}-${slugify(product.title)}`;
};

// Gives every product a unique stable id. Existing valid ids are kept; missing or
// duplicated ones are replaced. Returns the number of ids assigned.
const ensureProductIds = data => {
    const seen = new Set();
    let assigned = 0;
    (data.categories || []).forEach(category => {
        (category.products || []).forEach(product => {
            if (!ID_PATTERN.test(product.id || '') || seen.has(product.id)) {
                let id = generateProductId();
                while (seen.has(id)) id = generateProductId();
                product.id = id;
                assigned += 1;
            }
            seen.add(product.id);
        });
    });
    return assigned;
};

module.exports = {
    ID_PATTERN,
    slugify,
    generateProductId,
    computeLegacyId,
    ensureProductIds,
};
