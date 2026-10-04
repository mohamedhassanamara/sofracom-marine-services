import { createRoot } from 'react-dom/client';
import { LangProvider } from '../../../contexts/LangContext';
import { ToastProvider } from '../../../components/ui/Toast';
import App from './App';
import './admin.css';

createRoot(document.getElementById('root')).render(
    <LangProvider>
        <ToastProvider>
            <App />
        </ToastProvider>
    </LangProvider>
);
