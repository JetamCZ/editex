import { useTranslation } from 'react-i18next';
import { changeLanguage } from '~/i18n';

export function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const current = i18n.language?.startsWith('cs') ? 'cs' : 'en';

    return (
        <div style={{ display: 'flex', gap: '2px' }}>
            <button
                onClick={() => changeLanguage('en')}
                style={{
                    padding: '2px 8px',
                    fontSize: '12px',
                    fontWeight: current === 'en' ? 700 : 400,
                    opacity: current === 'en' ? 1 : 0.5,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                }}
            >
                EN
            </button>
            <span style={{ opacity: 0.3, alignSelf: 'center' }}>/</span>
            <button
                onClick={() => changeLanguage('cs')}
                style={{
                    padding: '2px 8px',
                    fontSize: '12px',
                    fontWeight: current === 'cs' ? 700 : 400,
                    opacity: current === 'cs' ? 1 : 0.5,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                }}
            >
                CZ
            </button>
        </div>
    );
}
