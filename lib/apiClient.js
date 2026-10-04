// Browser-side helper for calling our API routes. Pass the Firebase `user` to send
// its ID token; the server derives identity from that token only.

export class ApiError extends Error {
    constructor(message, { status, code } = {}) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

export async function apiRequest(path, { method = 'GET', body, user } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
    let response;
    try {
        response = await fetch(path, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        throw new ApiError('Network error', { code: 'network' });
    }
    let payload = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }
    if (!response.ok || !payload || payload.ok === false) {
        throw new ApiError(payload?.error || 'Request failed', {
            status: response.status,
            code: payload?.code,
        });
    }
    return payload;
}

// Prefer a translated message for known error codes, else the server's message.
export const errorMessage = (t, error, fallbackKey = 'errors.generic') => {
    if (error?.code) {
        const key = `errors.${error.code}`;
        const translated = t(key);
        if (translated !== key) return translated;
    }
    return error?.message || t(fallbackKey);
};
