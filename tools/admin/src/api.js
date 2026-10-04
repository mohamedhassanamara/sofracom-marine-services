// Calls the admin API with the per-session token (required on every write).
const token = document.querySelector('meta[name="admin-token"]')?.content || '';

export class ApiError extends Error {
    constructor(message, { status, code, details } = {}) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

export async function api(path, { method = 'GET', body } = {}) {
    let response;
    try {
        response = await fetch(path, {
            method,
            headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' ? { 'X-Admin-Token': token } : {}) },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        throw new ApiError('The admin server is not responding. Is `npm run admin` still running?', { code: 'network' });
    }
    const payload = await response.json().catch(() => ({ ok: false, error: `HTTP ${response.status}` }));
    if (!response.ok || payload.ok === false) {
        throw new ApiError(payload.error || `HTTP ${response.status}`, { status: response.status, code: payload.code, details: payload.details });
    }
    return payload;
}

export const readFileAsDataUrl = file =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read the file'));
        reader.readAsDataURL(file);
    });

export const upload = async (file, bucket) => (await api('/api/upload', { method: 'POST', body: { dataUrl: await readFileAsDataUrl(file), filename: file.name, bucket } })).path;

// Public site files for previews (served by the admin server at /site/...).
export const siteUrl = value => (!value ? '' : /^https?:/.test(value) ? value : `/site/${String(value).replace(/^\/+/, '')}`);
