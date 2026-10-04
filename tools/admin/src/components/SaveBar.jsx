import { useEffect } from 'react';
import { Button, useToast } from '../../../../components/ui';
import { ErrorBox } from './common';

// Sticky bar for a document store: unsaved state, Undo, Discard, Save (⌘S / Ctrl+S).
export default function SaveBar({ store, onSaved }) {
    const toast = useToast();
    const save = async () => {
        const result = await store.save();
        if (result.ok) {
            toast.show({ title: `${store.label} saved`, description: 'Saved to the file on this computer. Publish to put it on the website.', action: { label: 'Publish…', onClick: () => (window.location.hash = '#/publish') } });
            onSaved?.();
        } else toast.show({ tone: 'danger', title: 'Not saved', description: result.error.message });
    };
    useEffect(() => {
        const onKey = event => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                if (store.dirty && !store.saving) save();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });
    return (
        <>
            <div className={`sticky top-14 z-20 -mx-5 mb-4 flex flex-wrap items-center gap-3 border-b px-5 py-3 md:-mx-8 md:px-8 ${store.dirty ? 'border-warning-200 bg-warning-50' : 'border-slate-200 bg-slate-100/95'}`}>
                <p className="text-sm font-medium text-slate-800">{store.dirty ? 'Unsaved changes' : 'All changes saved to the file'}</p>
                <div className="ms-auto flex gap-2">
                    <Button size="sm" variant="ghost" onClick={store.undo} disabled={!store.canUndo}>
                        Undo
                    </Button>
                    <Button size="sm" variant="secondary" onClick={store.discard} disabled={!store.dirty}>
                        Discard
                    </Button>
                    <Button size="sm" onClick={save} disabled={!store.dirty} loading={store.saving}>
                        Save
                    </Button>
                </div>
            </div>
            <ErrorBox error={store.error} />
            {store.warnings.length > 0 && !store.dirty && (
                <details className="mb-4 rounded-md border border-warning-200 bg-warning-50 p-3 text-sm text-warning-800">
                    <summary className="cursor-pointer font-semibold">{store.warnings.length} things to check (not blocking)</summary>
                    <ul className="mt-2 list-disc ps-5">
                        {store.warnings.slice(0, 30).map(warning => (
                            <li key={warning.path}>{warning.message}</li>
                        ))}
                    </ul>
                </details>
            )}
        </>
    );
}
