import { glossaryTerm, localizeTags } from './catalogGlossary.js';
import { isolateLtr } from './bidi.js';

const getTranslation = (translations, lang) => {
    const entry = translations && translations[lang];
    return entry && typeof entry === 'object' ? entry : {};
};

export const localizeProduct = (product, lang, category = null) => {
    const productTranslation = getTranslation(product?.translations, lang);
    const categoryTranslation = getTranslation(category?.translations, lang);

    const variantTranslations = Array.isArray(productTranslation.variants)
        ? productTranslation.variants
        : [];
    const localizedVariants = Array.isArray(product?.variants)
        ? product.variants.map((variant, index) => {
              const variantTranslation = variantTranslations[index];
              return {
                  ...variant,
                  label:
                      (lang === 'ar' && variantTranslation?.label ? isolateLtr(variantTranslation.label) : variantTranslation?.label) ||
                      glossaryTerm(variant?.label, lang) ||
                      variant?.label ||
                      `#${index + 1}`,
              };
          })
        : [];

    // Arabic pages: keep Latin/number runs (model codes, "M4 × 20") in their own order.
    const fix = lang === 'ar' ? isolateLtr : text => text;
    return {
        ...product,
        title: fix(productTranslation.title || product?.title),
        description: productTranslation.description || product?.description,
        // Which language each text is really in (English when a translation is missing),
        // so pages can mark fallbacks with lang/dir.
        contentLang: {
            title: productTranslation.title ? lang : 'en',
            description: productTranslation.description ? lang : 'en',
        },
        brand: product?.brand,
        // The product's own translated tags, else the glossary (translated, deduplicated).
        usage: Array.isArray(productTranslation.usage) && productTranslation.usage.length
            ? productTranslation.usage
            : localizeTags(product?.usage, lang, { brand: product?.brand }),
        datasheet: product?.datasheet,
        categoryName: categoryTranslation.name || product?.categoryName,
        variants: localizedVariants.length
            ? localizedVariants
            : product?.variants || [],
    };
};

export const localizeCategory = (category, lang) => {
    if (!category) return category;
    const categoryTranslation = getTranslation(category.translations, lang);
    const localizedName = categoryTranslation.name || category.name;
    const localizedDescription =
        categoryTranslation.description || category.description;

    return {
        ...category,
        name: localizedName,
        description: localizedDescription,
        contentLang: {
            name: categoryTranslation.name ? lang : 'en',
            description: categoryTranslation.description ? lang : 'en',
        },
        products: Array.isArray(category.products)
            ? category.products.map(product =>
                  localizeProduct(product, lang, category)
              )
            : [],
    };
};
