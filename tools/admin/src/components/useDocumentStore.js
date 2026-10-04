import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { registerGuard } from '../router';

// A JSON document edited in memory (products.json or gallery.json): load, change with undo,
// save with the server's version check, and warn before leaving with unsaved changes.
export default function useDocumentStore({ url, field, label }) {
    const [doc, setDoc] = useState(null);
    const [saved, setSaved] = useState(null);
    const [version, setVersion] = useState(null);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [warnings, setWarnings] = useState([]);
    const history = useRef([]);
    const [canUndo, setCanUndo] = useState(false);

    const dirty = Boolean(doc && saved && JSON.stringify(doc) !== JSON.stringify(saved));
    const dirtyRef = useRef(false);
    dirtyRef.current = dirty;
    useEffect(() => registerGuard(() => dirtyRef.current), []);

    const load = useCallback(async () => {
        setError(null);
        try {
            const result = await api(url);
            setDoc(result[field]);
            setSaved(result[field]);
            setVersion(result.version);
            history.current = [];
            setCanUndo(false);
        } catch (err) {
            setError(err);
        }
    }, [url, field]);

    useEffect(() => {
        load();
    }, [load]);

    // update(draft => { …mutate… }) or update(newDoc)
    const update = useCallback(change => {
        setDoc(current => {
            history.current = [...history.current.slice(-49), current];
            setCanUndo(true);
            if (typeof change !== 'function') return change;
            const draft = structuredClone(current);
            return change(draft) || draft;
        });
    }, []);

    const undo = useCallback(() => {
        const previous = history.current.pop();
        if (previous) setDoc(previous);
        setCanUndo(history.current.length > 0);
    }, []);

    const discard = useCallback(() => {
        setDoc(saved);
        history.current = [];
        setCanUndo(false);
    }, [saved]);

    const save = useCallback(async () => {
        setSaving(true);
        setError(null);
        try {
            const result = await api(url, { method: 'PUT', body: { [field]: doc, version } });
            setDoc(result[field]);
            setSaved(result[field]);
            setVersion(result.version);
            setWarnings(result.warnings || []);
            history.current = [];
            setCanUndo(false);
            return { ok: true, warnings: result.warnings || [] };
        } catch (err) {
            setError(err);
            return { ok: false, error: err };
        } finally {
            setSaving(false);
        }
    }, [url, field, doc, version]);

    return { doc, saved, dirty, error, setError, saving, warnings, load, update, undo, canUndo, discard, save, label };
}
