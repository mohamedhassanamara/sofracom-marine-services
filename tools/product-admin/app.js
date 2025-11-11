(() => {
  let state = null;
  let isSaving = false;

  const categoryTemplate = document.getElementById('categoryTemplate');
  const productTemplate = document.getElementById('productTemplate');
  const categoriesContainer = document.getElementById('categories');
  const categoryNav = document.getElementById('categoryNav');
  const statusEl = document.getElementById('status');
  const saveBtn = document.getElementById('saveBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const addCategoryBtn = document.getElementById('addCategoryBtn');
  let activeCategoryIndex = 0;

  function setStatus(message, type = '') {
    statusEl.textContent = message || '';
    statusEl.className = `status ${type}`;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  async function uploadImageFile({ file, bucket }) {
    if (!file) throw new Error('No file selected for upload');
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are allowed');
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new Error('Image exceeds 8MB limit');
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

    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || 'Unable to upload image');
    }
    return result.path;
  }

  async function uploadAssetFile({ file, bucket }) {
    if (!file) throw new Error('No file selected for upload');
    if (file.size > 12 * 1024 * 1024) {
      throw new Error('File exceeds 12MB limit');
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
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || 'Unable to upload file');
    }
    return result.path;
  }

  function setupImageDropzone(container, { currentPath, bucket, onChange }) {
    const fileInput = container.querySelector('.dropzone-input');
    const preview = container.querySelector('.dropzone-preview');
    const pathLabel = container.querySelector('.dropzone-path');

    const applyPath = path => {
      const value = (path || '').trim();
      const resolvedPath = value
        ? value.startsWith('http://') ||
          value.startsWith('https://') ||
          value.startsWith('data:')
          ? value
          : `/${value.replace(/^\/+/, '')}`
        : '';
      if (resolvedPath) {
        preview.style.backgroundImage = `url("${resolvedPath}")`;
      } else {
        preview.style.backgroundImage = 'none';
      }
      pathLabel.textContent = value || 'No image selected';
    };

    applyPath(currentPath);

    const beginUpload = async file => {
      if (!file) return;
      container.classList.add('loading');
      try {
        setStatus(`Uploading ${file.name}…`);
        const uploadedPath = await uploadImageFile({ file, bucket });
        onChange(uploadedPath);
        applyPath(uploadedPath);
        setStatus(`Uploaded ${file.name}`, 'success');
      } catch (error) {
        console.error(error);
        setStatus(error.message || 'Image upload failed', 'error');
      } finally {
        container.classList.remove('loading');
        fileInput.value = '';
      }
    };

    container.addEventListener('click', () => fileInput.click());
    container.addEventListener('dragover', event => {
      event.preventDefault();
      container.classList.add('dragover');
    });
    container.addEventListener('dragleave', event => {
      event.preventDefault();
      container.classList.remove('dragover');
    });
    container.addEventListener('drop', event => {
      event.preventDefault();
      container.classList.remove('dragover');
      const [file] = event.dataTransfer.files;
      beginUpload(file);
    });

    fileInput.addEventListener('change', event => {
      const [file] = event.target.files;
      beginUpload(file);
    });

    return {
      update: applyPath,
    };
  }

  function setupAssetDropzone(container, { bucket, onChange, accept }) {
    if (!container) return null;
    const fileInput = container.querySelector('.dropzone-input');
    const preview = container.querySelector('.dropzone-preview');
    const pathLabel = container.querySelector('.dropzone-path');

    if (accept && fileInput) {
      fileInput.setAttribute('accept', accept);
    }

    const applyPath = value => {
      const resolved = value || '';
      if (preview && resolved) {
        preview.style.backgroundImage = `url("${resolved}")`;
      }
      if (pathLabel) {
        pathLabel.textContent = resolved || 'No file selected';
      }
    };

    const beginUpload = async file => {
      if (!file) return;
      container.classList.add('loading');
      try {
        setStatus(`Uploading ${file.name}…`);
        const uploadedPath = await uploadAssetFile({ file, bucket });
        applyPath(uploadedPath);
        onChange(uploadedPath);
        setStatus(`Uploaded ${file.name}`, 'success');
      } catch (error) {
        console.error(error);
        setStatus(error.message || 'File upload failed', 'error');
      } finally {
        container.classList.remove('loading');
        fileInput.value = '';
      }
    };

    const selectButton = container.querySelector('.asset-select-button');
    if (selectButton && fileInput) {
      selectButton.addEventListener('click', event => {
        event.stopPropagation();
        fileInput.click();
      });
    }
    container.addEventListener('click', event => {
      if (!fileInput) return;
      if (selectButton?.contains(event.target)) return;
      fileInput.click();
    });
    container.addEventListener('dragover', event => {
      event.preventDefault();
      container.classList.add('dragover');
    });
    container.addEventListener('dragleave', event => {
      event.preventDefault();
      container.classList.remove('dragover');
    });
    container.addEventListener('drop', event => {
      event.preventDefault();
      container.classList.remove('dragover');
      const [file] = event.dataTransfer.files;
      beginUpload(file);
    });
    fileInput.addEventListener('change', event => {
      const [file] = event.target.files;
      beginUpload(file);
    });

    return {
      applyPath,
    };
  }

  function sanitizeUsage(usage) {
    if (Array.isArray(usage)) return usage;
    if (typeof usage === 'string') {
      return usage
        .split(',')
        .map(token => token.trim())
        .filter(Boolean);
    }
    return [];
  }

  function ensureStateShape(data) {
    if (!data.categories) data.categories = [];
    data.categories = data.categories.map(category => ({
      ...category,
      products: Array.isArray(category.products)
        ? category.products.map(product => ({
            ...product,
            usage: sanitizeUsage(product.usage),
            stock: ['out', 'in', 'on-order'].includes(product.stock)
              ? product.stock
              : 'in',
            images:
              Array.isArray(product.images) && product.images.length
                ? product.images
                : product.image
                  ? [product.image]
                  : [],
            variants: Array.isArray(product.variants)
              ? product.variants.map(variant => ({
                  label: variant.label || '',
                  price:
                    Number.isFinite(Number(variant.price)) &&
                    Number(variant.price) >= 0
                      ? Number(variant.price)
                      : null,
                }))
              : [],
            datasheet: product.datasheet || '',
          }))
        : [],
    }));
    return data;
  }

  function handleCategoryInput(event, categoryIndex, field) {
    state.categories[categoryIndex][field] = event.target.value;
    if (field === 'name') {
      const titleEl = event.target
        .closest('.category')
        .querySelector('.category-header h2');
      if (titleEl) {
        titleEl.textContent = event.target.value || 'Untitled category';
      }
    }
  }

  function handleProductInput(event, categoryIndex, productIndex, field) {
    const value = event.target.value;
    const product = state.categories[categoryIndex].products[productIndex];

    if (field === 'price') {
      product.price = value === '' ? null : Number(value);
      return;
    }

    if (field === 'usage') {
      product.usage = sanitizeUsage(value);
      return;
    }

    if (field === 'stock') {
      product.stock = event.target.value;
      return;
    }

    if (field === 'images') {
      product.images = value
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
      return;
    }

    if (field === 'datasheet') {
      product.datasheet = value;
      return;
    }

    product[field] = value;
    if (field === 'title') {
      const heading = event.target
        .closest('.product')
        .querySelector('.product-header h3');
      if (heading) {
        heading.textContent = value || 'New product';
      }
    }
  }

  function addProduct(categoryIndex) {
    const category = state.categories[categoryIndex];
    category.products.push({
      title: 'Untitled product',
      image: 'assets/products/placeholder.png',
      description: '',
      brand: '',
      usage: [],
      price: 0,
      stock: 'in',
      images: [],
      variants: [],
      datasheet: '',
    });
    render();
  }

  function deleteProduct(categoryIndex, productIndex) {
    const product = state.categories[categoryIndex].products[productIndex];
    const confirmed = window.confirm(
      `Delete "${product.title || 'this product'}"?`
    );
    if (!confirmed) return;
    state.categories[categoryIndex].products.splice(productIndex, 1);
    render();
  }

  function addCategory() {
    state.categories.push({
      name: 'New Category',
      slug: 'new-category',
      image: 'assets/categories/placeholder.png',
      description: '',
      products: [],
    });
    activeCategoryIndex = state.categories.length - 1;
    render();
  }

  function deleteCategory(index) {
    const category = state.categories[index];
    const confirmed = window.confirm(
      `Delete category "${category.name || 'untitled'}" and its products?`
    );
    if (!confirmed) return;
    state.categories.splice(index, 1);
    if (activeCategoryIndex >= state.categories.length) {
      activeCategoryIndex = state.categories.length - 1;
    }
    render();
  }

  function setActiveCategory(index) {
    activeCategoryIndex = Math.max(0, Math.min(index, state.categories.length - 1));
    render();
  }

  function ensureActiveIndex() {
    if (!state.categories.length) return -1;
    if (activeCategoryIndex < 0) activeCategoryIndex = 0;
    if (activeCategoryIndex >= state.categories.length) {
      activeCategoryIndex = state.categories.length - 1;
    }
    return activeCategoryIndex;
  }

  function renderNav(activeIndex) {
    if (!categoryNav) return;
    categoryNav.innerHTML = '';
    if (!state.categories.length) {
      categoryNav.innerHTML = '<p class="empty-nav">No categories yet</p>';
      return;
    }
    state.categories.forEach((category, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = category.name || `Category ${index + 1}`;
      button.className = `category-tab${index === activeIndex ? ' active' : ''}`;
      button.addEventListener('click', () => setActiveCategory(index));
      categoryNav.appendChild(button);
    });
  }

  function resizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  function mountVariantSection(
    product,
    container,
    categoryIndex,
    productIndex,
    addBtn
  ) {
    if (!container) return;
    const variants = () => state.categories[categoryIndex].products[productIndex]
      .variants;

    const renderList = () => {
      container.innerHTML = '';
      (variants() || []).forEach((variant, variantIndex) => {
        const row = document.createElement('div');
        row.className = 'variant-row';
        row.innerHTML = `
          <input type="text" class="variant-label" placeholder="Label" value="${variant.label || ''}" />
          <input type="number" class="variant-price" min="0" step="0.01" placeholder="Price" value="${variant.price ?? ''}" />
          <button type="button" class="remove-variant">Remove</button>
        `;
        const labelInput = row.querySelector('.variant-label');
        const priceInput = row.querySelector('.variant-price');
        const removeBtn = row.querySelector('.remove-variant');
        labelInput.addEventListener('input', event => {
          state.categories[categoryIndex].products[productIndex].variants[
            variantIndex
          ].label = event.target.value;
        });
        priceInput.addEventListener('input', event => {
          const raw = Number(event.target.value);
          state.categories[categoryIndex].products[productIndex].variants[
            variantIndex
          ].price = Number.isFinite(raw) ? raw : null;
        });
        removeBtn.addEventListener('click', () => {
          state.categories[categoryIndex].products[productIndex].variants.splice(
            variantIndex,
            1
          );
          renderList();
        });
        container.appendChild(row);
      });
    };

    renderList();
    addBtn?.addEventListener('click', () => {
      state.categories[categoryIndex].products[productIndex].variants =
        state.categories[categoryIndex].products[productIndex].variants || [];
      state.categories[categoryIndex].products[productIndex].variants.push({
        label: '',
        price: null,
      });
      renderList();
    });
  }

  function clampActiveIndex() {
    if (!state.categories.length) {
      activeCategoryIndex = 0;
      return -1;
    }
    if (activeCategoryIndex < 0) activeCategoryIndex = 0;
    if (activeCategoryIndex >= state.categories.length) {
      activeCategoryIndex = state.categories.length - 1;
    }
    return activeCategoryIndex;
  }

  function renderNav(activeIndex) {
    if (!categoryNav) return;
    categoryNav.innerHTML = '';
    if (!state.categories.length) {
      categoryNav.innerHTML = '<p class="empty-nav">Create a category to start</p>';
      return;
    }
    state.categories.forEach((category, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `category-tab${index === activeIndex ? ' active' : ''}`;
      button.textContent = category.name || `Category ${index + 1}`;
      button.addEventListener('click', () => {
        activeCategoryIndex = index;
        render();
      });
      categoryNav.appendChild(button);
    });
  }

  function highlightActiveCategory(activeIndex) {
    const nodes = categoriesContainer.querySelectorAll('.category');
    nodes.forEach((node, idx) => {
      node.classList.toggle('hidden', idx !== activeIndex);
    });
  }

  function render() {
    categoriesContainer.innerHTML = '';
    const activeIndex = clampActiveIndex();
    renderNav(activeIndex);
    state.categories.forEach((category, categoryIndex) => {
      const fragment = categoryTemplate.content.cloneNode(true);
      const categoryEl = fragment.querySelector('.category');
      const headerTitle = fragment.querySelector('.category-header h2');
      const nameInput = fragment.querySelector('.category-name');
      const slugInput = fragment.querySelector('.category-slug');
      const imageInput = fragment.querySelector('.category-image');
      const descriptionInput = fragment.querySelector('.category-description');
      const deleteCategoryBtn = fragment.querySelector('.delete-category');
      const addProductBtn = fragment.querySelector('.add-product');
      const productsContainer = fragment.querySelector('.products');
      const dropzoneEl = fragment.querySelector('.category-dropzone');

      categoryEl.dataset.index = categoryIndex;
      headerTitle.textContent = category.name || 'Untitled category';
      nameInput.value = category.name || '';
      slugInput.value = category.slug || '';
      imageInput.value = category.image || '';
      descriptionInput.value = category.description || '';
      resizeTextarea(descriptionInput);

      const categoryDropzone = setupImageDropzone(dropzoneEl, {
        currentPath: category.image || '',
        bucket: 'categories',
        onChange: newPath => {
          state.categories[categoryIndex].image = newPath;
          imageInput.value = newPath;
        },
      });

      nameInput.addEventListener('input', event =>
        handleCategoryInput(event, categoryIndex, 'name')
      );
      slugInput.addEventListener('input', event =>
        handleCategoryInput(event, categoryIndex, 'slug')
      );
      imageInput.addEventListener('input', event =>
        handleCategoryInput(event, categoryIndex, 'image')
      );
      imageInput.addEventListener('input', event => {
        categoryDropzone.update(event.target.value);
      });
      descriptionInput.addEventListener('input', event => {
        resizeTextarea(event.target);
        handleCategoryInput(event, categoryIndex, 'description');
      });

      deleteCategoryBtn.addEventListener('click', () =>
        deleteCategory(categoryIndex)
      );
      addProductBtn.addEventListener('click', () => addProduct(categoryIndex));

      category.products.forEach((product, productIndex) => {
        const productFragment = productTemplate.content.cloneNode(true);
        const productEl = productFragment.querySelector('.product');
        const titleHeading = productFragment.querySelector(
          '.product-header h3'
        );
        const deleteProductBtn = productFragment.querySelector(
          '.delete-product'
        );

        const titleInput = productFragment.querySelector('.product-title');
        const brandInput = productFragment.querySelector('.product-brand');
        const imageInput = productFragment.querySelector('.product-image');
        const usageInput = productFragment.querySelector('.product-usage');
        const priceInput = productFragment.querySelector('.product-price');
        const descriptionInput = productFragment.querySelector(
          '.product-description'
        );
        const stockSelect = productFragment.querySelector('.product-stock');
        const productDropzoneEl = productFragment.querySelector(
          '.product-dropzone'
        );
        const imagesInput = productFragment.querySelector('.product-images');
        const datasheetInput = productFragment.querySelector(
          '.product-datasheet'
        );
        const imagesDropzoneEl = productFragment.querySelector(
          '.asset-dropzone[data-asset="images"]'
        );
        const datasheetDropzoneEl = productFragment.querySelector(
          '.asset-dropzone[data-asset="datasheet"]'
        );
        const variantList = productFragment.querySelector('.variant-list');
        const addVariantBtn = productFragment.querySelector('.add-variant');

        productEl.dataset.categoryIndex = categoryIndex;
        productEl.dataset.productIndex = productIndex;
        titleHeading.textContent = product.title || 'New product';

        titleInput.value = product.title || '';
        brandInput.value = product.brand || '';
        imageInput.value = product.image || '';
        usageInput.value = sanitizeUsage(product.usage).join(', ');
        priceInput.value =
          product.price === null || product.price === undefined
            ? ''
            : product.price;
       descriptionInput.value = product.description || '';
        stockSelect.value = ['in', 'out', 'on-order'].includes(product.stock)
          ? product.stock
          : 'in';
        resizeTextarea(descriptionInput);
        imagesInput.value = (product.images || []).join('\n');
        datasheetInput.value = product.datasheet || '';

        const productDropzone = setupImageDropzone(productDropzoneEl, {
          currentPath: product.image || '',
          bucket: 'products',
          onChange: newPath => {
            state.categories[categoryIndex].products[productIndex].image =
              newPath;
            imageInput.value = newPath;
          },
        });

        titleInput.addEventListener('input', event =>
          handleProductInput(event, categoryIndex, productIndex, 'title')
        );
        brandInput.addEventListener('input', event =>
          handleProductInput(event, categoryIndex, productIndex, 'brand')
        );
        imageInput.addEventListener('input', event =>
          handleProductInput(event, categoryIndex, productIndex, 'image')
        );
        imageInput.addEventListener('input', event => {
          productDropzone.update(event.target.value);
        });
        usageInput.addEventListener('input', event => {
          handleProductInput(event, categoryIndex, productIndex, 'usage');
        });
        priceInput.addEventListener('input', event =>
          handleProductInput(event, categoryIndex, productIndex, 'price')
        );
        stockSelect.addEventListener('change', event =>
          handleProductInput(event, categoryIndex, productIndex, 'stock')
        );
        descriptionInput.addEventListener('input', event => {
          resizeTextarea(event.target);
          handleProductInput(
            event,
            categoryIndex,
            productIndex,
            'description'
          );
        });

        deleteProductBtn.addEventListener('click', () =>
          deleteProduct(categoryIndex, productIndex)
        );
        const toggleBtn = productFragment.querySelector('.toggle-product');
        toggleBtn?.addEventListener('click', () => {
          const collapsed = productEl.classList.toggle('collapsed');
          toggleBtn.textContent = collapsed ? 'Show details' : 'Hide details';
        });

        mountVariantSection(
          product,
          variantList,
          categoryIndex,
          productIndex,
          addVariantBtn
        );

        const appendImagePath = path => {
          const current = (imagesInput.value || '')
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);
          current.push(path);
          imagesInput.value = current.join('\n');
          handleProductInput(
            { target: { value: imagesInput.value } },
            categoryIndex,
            productIndex,
            'images'
          );
        };

        const imagesDropzone = setupAssetDropzone(imagesDropzoneEl, {
          bucket: 'products',
          accept: 'image/*',
          onChange: appendImagePath,
        });
        const syncImagesDropzone = () => {
          const last = (imagesInput.value || '')
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean)
            .pop();
          imagesDropzone?.applyPath(last || '');
        };
        syncImagesDropzone();

        const fileToInput = path => {
          datasheetInput.value = path;
          handleProductInput(
            { target: { value: path } },
            categoryIndex,
            productIndex,
            'datasheet'
          );
        };
        const datasheetDropzone = setupAssetDropzone(datasheetDropzoneEl, {
          bucket: 'datasheets',
          accept: '.pdf',
          onChange: fileToInput,
        });
        datasheetDropzone?.applyPath(datasheetInput.value || '');

        imagesInput.addEventListener('input', event => {
          handleProductInput(event, categoryIndex, productIndex, 'images');
          syncImagesDropzone();
        });
        datasheetInput.addEventListener('input', event => {
          handleProductInput(event, categoryIndex, productIndex, 'datasheet');
          datasheetDropzone?.applyPath(datasheetInput.value || '');
        });

        productsContainer.appendChild(productFragment);
      });

      categoriesContainer.appendChild(fragment);
    });
    highlightActiveCategory(activeIndex);
  }

  async function loadData() {
    setStatus('Loading products…');
    try {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const payload = await response.json();
      state = ensureStateShape(payload);
      render();
      setStatus('Products loaded', 'success');
    } catch (error) {
      console.error(error);
      setStatus(error.message || 'Unable to load products', 'error');
    }
  }

  async function saveData() {
    if (isSaving) return;
    if (!state) return;

    isSaving = true;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    setStatus('Saving changes and pushing to origin…');

    const payload = JSON.parse(JSON.stringify(state));

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Save failed');
      }

      const gitMessage =
        (result.git && result.git.message) || 'Changes saved successfully';
      setStatus(gitMessage, 'success');
    } catch (error) {
      console.error(error);
      setStatus(error.message || 'Unable to save changes', 'error');
    } finally {
      isSaving = false;
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save & Deploy';
    }
  }

  saveBtn.addEventListener('click', saveData);
  refreshBtn.addEventListener('click', loadData);
  addCategoryBtn.addEventListener('click', addCategory);

  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveData();
    }
  });

  loadData();
})();
