// Shared browser helper for the local admin pages (served at /shared/admin-client.js).
// - AdminClient.fetch(): fetch() that sends the per-session token the server injected
// - AdminClient.openPublish(): shows exactly which files would be committed and pushed,
//   and publishes only after an explicit click.
(() => {
  const meta = document.querySelector('meta[name="admin-token"]');
  const token = meta ? meta.content : '';

  const adminFetch = (path, options = {}) =>
    fetch(path, { ...options, headers: { ...(options.headers || {}), 'X-Admin-Token': token } });

  const STYLE = `
    .publish-dialog { border: none; border-radius: 12px; padding: 0; width: min(640px, calc(100vw - 32px));
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.35); font: 14px/1.5 Inter, system-ui, sans-serif; color: #0f172a; }
    .publish-dialog::backdrop { background: rgba(15, 23, 42, 0.55); }
    .publish-dialog form { display: flex; flex-direction: column; max-height: min(80vh, 720px); }
    .publish-dialog header, .publish-dialog footer { padding: 16px 20px; }
    .publish-dialog header { border-bottom: 1px solid #e2e8f0; }
    .publish-dialog h2 { margin: 0 0 4px; font-size: 18px; }
    .publish-dialog p { margin: 0; color: #475569; }
    .publish-body { padding: 12px 20px; overflow: auto; }
    .publish-body ul { margin: 8px 0 0; padding: 0; list-style: none; font: 12.5px/1.6 ui-monospace, Menlo, monospace; }
    .publish-body li { display: flex; gap: 10px; }
    .publish-body .tag { flex: none; width: 64px; font-weight: 600; }
    .publish-body .added { color: #047857; } .publish-body .modified { color: #1d4ed8; } .publish-body .deleted { color: #b91c1c; }
    .publish-blockers { margin: 0 0 8px; padding: 10px 12px; border-radius: 8px; background: #fef2f2; color: #991b1b; }
    .publish-result { margin-top: 8px; padding: 10px 12px; border-radius: 8px; }
    .publish-result.ok { background: #ecfdf5; color: #065f46; } .publish-result.error { background: #fef2f2; color: #991b1b; }
    .publish-dialog footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid #e2e8f0; }
    .publish-dialog button { font: inherit; padding: 8px 16px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; }
    .publish-dialog button.primary { background: #0b2050; border-color: #0b2050; color: #fff; }
    .publish-dialog button:disabled { opacity: 0.5; cursor: not-allowed; }`;

  const el = (tag, props = {}, children = []) => {
    const node = Object.assign(document.createElement(tag), props);
    children.forEach(child => node.append(child));
    return node;
  };

  async function readJson(response) {
    const payload = await response.json().catch(() => ({ ok: false, error: `HTTP ${response.status}` }));
    if (!response.ok || payload.ok === false) throw new Error(payload.error || `HTTP ${response.status}`);
    return payload;
  }

  // Resolves to the publish result, or null when cancelled.
  function openPublish({ what = 'changes' } = {}) {
    if (!document.getElementById('publish-dialog-style')) {
      document.head.append(el('style', { id: 'publish-dialog-style', textContent: STYLE }));
    }
    return new Promise(resolve => {
      let result = null;
      const body = el('div', { className: 'publish-body' }, [el('p', { textContent: 'Checking changes…' })]);
      const cancel = el('button', { type: 'button', textContent: 'Cancel' });
      const confirm = el('button', { type: 'submit', className: 'primary', textContent: 'Publish', disabled: true });
      const dialog = el('dialog', { className: 'publish-dialog' }, [
        el('form', { method: 'dialog' }, [
          el('header', {}, [
            el('h2', { id: 'publish-title', textContent: `Publish ${what} to the live site` }),
            el('p', { textContent: 'These files will be committed and pushed to main. Vercel then redeploys the site. Nothing else in the repository is included.' }),
          ]),
          body,
          el('footer', {}, [cancel, confirm]),
        ]),
      ]);
      dialog.setAttribute('aria-labelledby', 'publish-title');
      document.body.append(dialog);
      dialog.addEventListener('close', () => {
        dialog.remove();
        resolve(result);
      });
      cancel.addEventListener('click', () => dialog.close());

      let files = [];
      adminFetch('/api/publish/preview')
        .then(readJson)
        .then(preview => {
          files = preview.files;
          body.replaceChildren();
          if (preview.blockers.length) {
            body.append(el('div', { className: 'publish-blockers', role: 'alert' }, preview.blockers.map(text => el('div', { textContent: text }))));
          }
          if (files.length) {
            body.append(
              el('p', { textContent: `${files.length} file(s):` }),
              el('ul', {}, files.map(file => el('li', {}, [
                el('span', { className: `tag ${file.status}`, textContent: file.status }),
                el('span', { textContent: file.path }),
              ])))
            );
          }
          confirm.textContent = files.length ? `Publish ${files.length} file(s)` : 'Publish';
          confirm.disabled = preview.blockers.length > 0;
          if (!confirm.disabled) confirm.focus();
        })
        .catch(err => body.replaceChildren(el('div', { className: 'publish-blockers', role: 'alert', textContent: err.message })));

      confirm.addEventListener('click', async event => {
        event.preventDefault();
        confirm.disabled = true;
        cancel.disabled = true;
        confirm.textContent = 'Publishing…';
        const status = el('div', { className: 'publish-result', role: 'status' });
        body.append(status);
        try {
          result = await readJson(
            await adminFetch('/api/publish', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ files: files.map(file => file.path) }),
            })
          );
          status.className = 'publish-result ok';
          status.textContent = result.message;
          confirm.remove();
        } catch (err) {
          status.className = 'publish-result error';
          status.textContent = err.message;
          confirm.remove();
        }
        cancel.disabled = false;
        cancel.textContent = 'Close';
        cancel.focus();
      });

      dialog.showModal();
    });
  }

  window.AdminClient = { fetch: adminFetch, openPublish };
})();
