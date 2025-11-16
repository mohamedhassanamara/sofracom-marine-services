(() => {
  let state = { entries: [] };
  let isSaving = false;

  const statusEl = document.getElementById('status');
  const entriesEl = document.getElementById('entries');
  const entryTemplate = document.getElementById('entryTemplate');
  const saveBtn = document.getElementById('saveBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const addEntryBtn = document.getElementById('addEntryBtn');

  const setStatus = (message, type = '') => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = type ? `status ${type}` : 'status';
  };

  const parseTags = value =>
    (value || '')
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);

  const normalizeEntry = entry => ({
    id: entry.id || `gallery-${Math.random().toString(36).slice(2, 7)}`,
    title: entry.title || '',
    description: entry.description || '',
    type: entry.type === 'video' ? 'video' : 'image',
    src: entry.src || '',
    tags: Array.isArray(entry.tags) ? entry.tags.filter(Boolean) : [],
    date:
      entry.date || new Date().toISOString().slice(0, 10),
  });

  const createEmptyEntry = () => ({
    id: `gallery-${Math.random().toString(36).slice(2, 7)}`,
    title: '',
    description: '',
    type: 'image',
    src: '',
    tags: [],
    date: new Date().toISOString().slice(0, 10),
  });

  const ensurePublicPath = value => {
    const trimmed = (value || '').trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  };

  const updatePreview = (entry, previewEl) => {
    if (!previewEl) return;
    previewEl.innerHTML = '';
    const src = entry.src ? entry.src.trim() : '';
    if (!src) {
      previewEl.textContent = 'Preview will appear here once a source is provided.';
      return;
    }
    if (entry.type === 'image') {
      const img = document.createElement('img');
      img.src = ensurePublicPath(src);
      img.alt = entry.title || 'Gallery image preview';
      previewEl.appendChild(img);
    } else {
      const link = document.createElement('a');
      link.href = src;
      link.textContent = 'Open video';
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.className = 'preview-link';
      previewEl.appendChild(link);
    }
  };

  const applyDropzonePath = (container, entry) => {
    const pathLabel = container.querySelector('.dropzone-path');
    if (pathLabel) {
      pathLabel.textContent = entry.src
        ? entry.src
        : 'Uploads land in assets/gallery';
    }
  };

  const readFileAsDataUrl = file =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const uploadImageFile = async ({ file, bucket }) => {
    if (!file) throw new Error('No file selected for upload');
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are allowed');
    }
    const dataUrl = await readFileAsDataUrl(file);
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataUrl,
        filename: file.name,
        bucket,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || 'Unable to upload image');
    }
    return payload.path;
  };

  const setupDropzone = (dropzone, entry, previewEl) => {
    if (!dropzone) return;
    const fileInput = dropzone.querySelector('.dropzone-input');
    applyDropzonePath(dropzone, entry);

    const beginUpload = async file => {
      if (!file) return;
      dropzone.classList.add('loading');
      try {
        setStatus(`Uploading ${file.name}…`);
        const path = await uploadImageFile({ file, bucket: 'gallery' });
        entry.src = path;
        applyDropzonePath(dropzone, entry);
        updatePreview(entry, previewEl);
        setStatus(`Uploaded ${file.name}`, 'success');
      } catch (error) {
        console.error(error);
        setStatus(error.message || 'Image upload failed', 'error');
      } finally {
        dropzone.classList.remove('loading');
        if (fileInput) fileInput.value = '';
      }
    };

    dropzone.addEventListener('click', () => fileInput?.click());
    dropzone.addEventListener('dragover', event => {
      event.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', event => {
      event.preventDefault();
      dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', event => {
      event.preventDefault();
      dropzone.classList.remove('dragover');
      const [file] = event.dataTransfer.files;
      beginUpload(file);
    });
    fileInput?.addEventListener('change', event => {
      const [file] = event.target.files;
      beginUpload(file);
    });
  };

  const render = () => {
    if (!entriesEl) return;
    entriesEl.innerHTML = '';
    state.entries.forEach((entry, index) => {
      const clone = entryTemplate.content.cloneNode(true);
      const article = clone.querySelector('.entry');
      const titleInput = clone.querySelector('.entry-title');
      const typeSelect = clone.querySelector('.entry-type');
      const srcInput = clone.querySelector('.entry-src');
      const dateInput = clone.querySelector('.entry-date');
      const tagsInput = clone.querySelector('.entry-tags');
      const descriptionInput = clone.querySelector('.entry-description');
      const deleteButton = clone.querySelector('.delete-entry');
      const moveButtons = clone.querySelectorAll('.move-entry');
      const previewEl = clone.querySelector('.preview-content');
      const dropzone = clone.querySelector('.dropzone');

      titleInput.value = entry.title;
      typeSelect.value = entry.type;
      srcInput.value = entry.src;
      dateInput.value = entry.date;
      tagsInput.value = entry.tags.join(', ');
      descriptionInput.value = entry.description;
      updatePreview(entry, previewEl);
      setupDropzone(dropzone, entry, previewEl);

      titleInput.addEventListener('input', event => {
        state.entries[index].title = event.target.value;
      });

      typeSelect.addEventListener('change', event => {
        state.entries[index].type = event.target.value;
        updatePreview(state.entries[index], previewEl);
      });

      srcInput.addEventListener('input', event => {
        state.entries[index].src = event.target.value;
        updatePreview(state.entries[index], previewEl);
        applyDropzonePath(dropzone, state.entries[index]);
      });

      dateInput.addEventListener('change', event => {
        state.entries[index].date = event.target.value;
      });

      tagsInput.addEventListener('input', event => {
        state.entries[index].tags = parseTags(event.target.value);
      });

      descriptionInput.addEventListener('input', event => {
        state.entries[index].description = event.target.value;
      });

      deleteButton.addEventListener('click', () => {
        state.entries.splice(index, 1);
        render();
      });

      moveButtons.forEach(button => {
        button.addEventListener('click', () => {
          const direction = button.dataset.direction;
          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= state.entries.length) return;
          [state.entries[index], state.entries[targetIndex]] = [
            state.entries[targetIndex],
            state.entries[index],
          ];
          render();
        });
      });

      article.dataset.entryId = entry.id;
      entriesEl.appendChild(article);
    });
  };

  const loadData = async () => {
    try {
      setStatus('Loading gallery entries…');
      const response = await fetch('/api/gallery');
      if (!response.ok) {
        throw new Error('Failed to load gallery');
      }
      const payload = await response.json();
      state.entries = Array.isArray(payload.entries)
        ? payload.entries.map(normalizeEntry)
        : [];
      render();
      setStatus('Gallery loaded', 'success');
    } catch (error) {
      console.error(error);
      setStatus(error.message || 'Unable to load gallery', 'error');
    }
  };

  const saveData = async () => {
    if (isSaving) return;
    isSaving = true;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      setStatus('Saving gallery…');
      const payload = {
        entries: state.entries.map(entry => ({
          id: entry.id,
          title: entry.title,
          description: entry.description,
          type: entry.type,
          src: entry.src,
          tags: entry.tags,
          date: entry.date,
        })),
      };
      const response = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Unable to save gallery');
      }
      setStatus('Gallery saved and pushed', 'success');
    } catch (error) {
      console.error(error);
      setStatus(error.message || 'Save failed', 'error');
    } finally {
      isSaving = false;
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save & Deploy';
    }
  };

  addEntryBtn?.addEventListener('click', () => {
    state.entries.unshift(createEmptyEntry());
    render();
  });

  refreshBtn?.addEventListener('click', loadData);
  saveBtn?.addEventListener('click', saveData);

  loadData();
})();
