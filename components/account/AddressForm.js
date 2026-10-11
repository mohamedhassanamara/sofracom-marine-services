import { useLang } from '../../contexts/LangContext';
import { Field, Input, Textarea } from '../ui';

export const EMPTY_ADDRESS = { label: '', fullName: '', phone: '', line: '', city: '', notes: '' };

const digits = value => String(value || '').replace(/\D/g, '');

// Every problem as { field: translationKey } (empty when the address is usable).
export const addressErrors = address => {
    const errors = {};
    if ((address.fullName || '').trim().length < 2) errors.fullName = 'address.errorName';
    if (digits(address.phone).length < 8) errors.phone = 'address.errorPhone';
    if ((address.line || '').trim().length < 4) errors.line = 'address.errorLine';
    if ((address.city || '').trim().length < 2) errors.city = 'address.errorCity';
    return errors;
};

// The first problem's translation key, or null (kept for callers that show one message).
export const addressError = address => Object.values(addressErrors(address))[0] || null;

// Controlled address fields, shared by the addresses page and checkout. `errors` maps a
// field to a translation key; `idPrefix` keeps ids unique when two forms are on a page.
export default function AddressFields({ value, onChange, showLabel = true, errors = {}, idPrefix = 'address' }) {
    const { t } = useLang();
    const update = field => event => onChange({ ...value, [field]: event.target.value });
    const error = field => (errors[field] ? t(errors[field]) : undefined);

    return (
        <div className="grid gap-4">
            {showLabel && (
                <Field id={`${idPrefix}-label`} label={t('address.label')} optional>
                    <Input value={value.label} onChange={update('label')} maxLength={40} placeholder={t('address.labelPlaceholder')} />
                </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
                <Field id={`${idPrefix}-fullName`} label={t('address.fullName')} required error={error('fullName')}>
                    <Input autoComplete="name" value={value.fullName} onChange={update('fullName')} maxLength={120} />
                </Field>
                <Field id={`${idPrefix}-phone`} label={t('address.phone')} required error={error('phone')}>
                    <Input type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={value.phone} onChange={update('phone')} maxLength={40} />
                </Field>
            </div>
            <Field id={`${idPrefix}-line`} label={t('address.line')} required error={error('line')}>
                <Input autoComplete="street-address" value={value.line} onChange={update('line')} maxLength={300} />
            </Field>
            <Field id={`${idPrefix}-city`} label={t('address.city')} required error={error('city')}>
                <Input autoComplete="address-level2" value={value.city} onChange={update('city')} maxLength={80} />
            </Field>
            <Field id={`${idPrefix}-notes`} label={t('address.notes')}>
                <Textarea rows={2} value={value.notes} onChange={update('notes')} maxLength={300} />
            </Field>
        </div>
    );
}
