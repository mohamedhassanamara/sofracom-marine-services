import { createRoot } from 'react-dom/client';
import { LangProvider } from '../../../contexts/LangContext';
import { ToastProvider } from '../../../components/ui/Toast';
import en from '../../../lib/i18n/en';
import { registerMessages } from '../../../lib/i18n/messages';
import App from './App';

registerMessages('en', en);
import './admin.css';

createRoot(document.getElementById('root')).render(
    <LangProvider>
        <ToastProvider>
            <App />
        </ToastProvider>
    </LangProvider>
);
