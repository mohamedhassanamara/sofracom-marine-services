import { useCallback } from 'react';
import { useCart } from '../contexts/CartContext';
import { useLang } from '../contexts/LangContext';
import { useToast } from '../components/ui/Toast';

// Adds to the cart without leaving the page: a toast confirms, with "View cart".
export default function useAddToCart() {
    const { addProduct, openCart } = useCart();
    const { t } = useLang();
    const toast = useToast();
    return useCallback(
        (product, variant, variantIndex, quantity = 1) => {
            if (!addProduct(product, variant, variantIndex, { quantity, open: false })) return false;
            toast.show({
                title: t('ui.addedToCart'),
                description: [product.title, variant?.label].filter(Boolean).join(' · '),
                action: { label: t('ui.viewCart'), onClick: openCart },
            });
            return true;
        },
        [addProduct, openCart, t, toast]
    );
}
