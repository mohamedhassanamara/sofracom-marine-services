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
                      variantTranslation?.label ||
                      variant?.label ||
                      `Variant ${index + 1}`,
              };
          })
        : [];

    return {
        ...product,
        title: productTranslation.title || product?.title,
        description: productTranslation.description || product?.description,
        brand: product?.brand,
        usage: Array.isArray(product?.usage) ? product.usage : [],
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
        products: Array.isArray(category.products)
            ? category.products.map(product =>
                  localizeProduct(product, lang, category)
              )
            : [],
    };
};
