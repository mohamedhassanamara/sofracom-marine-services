import { useLang } from '../../contexts/LangContext';

export const EMPTY_ADDRESS = { label: '', fullName: '', phone: '', line: '', city: '', notes: '' };

// Returns a translation key for the first problem, or null when the address is usable.
export const addressError = address => {
    if ((address.fullName || '').trim().length < 2) return 'address.errorName';
    if ((address.phone || '').trim().length < 6) return 'address.errorPhone';
    if ((address.line || '').trim().length < 4) return 'address.errorLine';
    if ((address.city || '').trim().length < 2) return 'address.errorCity';
    return null;
};

// Controlled address fields, shared by the addresses page and checkout.
export default function AddressFields({ value, onChange, showLabel = true }) {
    const { t } = useLang();
    const update = field => event => onChange({ ...value, [field]: event.target.value });

    return (
        <div className="ui-form">
            {showLabel && (
                <label className="ui-field">
                    <span>{t('address.label')}</span>
                    <input
                        value={value.label}
                        onChange={update('label')}
                        maxLength={40}
                        placeholder={t('address.labelPlaceholder')}
                    />
                </label>
            )}
            <div className="ui-form-row ui-form-row--2">
                <label className="ui-field">
                    <span>{t('address.fullName')}</span>
                    <input autoComplete="name" value={value.fullName} onChange={update('fullName')} maxLength={120} required />
                </label>
                <label className="ui-field">
                    <span>{t('address.phone')}</span>
                    <input type="tel" autoComplete="tel" value={value.phone} onChange={update('phone')} maxLength={40} required />
                </label>
            </div>
            <label className="ui-field">
                <span>{t('address.line')}</span>
                <input autoComplete="street-address" value={value.line} onChange={update('line')} maxLength={300} required />
            </label>
            <label className="ui-field">
                <span>{t('address.city')}</span>
                <input autoComplete="address-level2" value={value.city} onChange={update('city')} maxLength={80} required />
            </label>
            <label className="ui-field">
                <span>{t('address.notes')}</span>
                <textarea rows="2" value={value.notes} onChange={update('notes')} maxLength={300} />
            </label>
        </div>
    );
}
