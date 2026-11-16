import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminApi } from '../../api/admin.api';
import { queryKeys } from '../../api/queryKeys';
import {
  focusFirstInvalidField,
  getErrorMessage,
  mapServerErrors,
  parseForm,
  productFormSchema,
} from '../../lib/validation/forms';
import { useUiStore } from '../../stores/ui.store';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/ui/Icon';
import { ConfirmDialog } from '../../components/admin/Modal';
import ErrorState from '../../components/ui/ErrorState';
import { FormSkeleton } from '../../components/loading';
import './ProductFormPage.css';

const initialForm = {
  name: '',
  slug: '',
  description: '',
  shortDescription: '',
  categoryId: '',
  price: '',
  compareAtPrice: '',
  stock: 0,
  isAvailable: true,
  isVeg: false,
  isFeatured: false,
  isBestseller: false,
  isNew: false,
  prepTimeMinutes: 25,
  image: '',
  tags: '',
};

const sameForm = (a, b) =>
  Object.keys(initialForm).every((key) => String(a[key] ?? '') === String(b[key] ?? ''));

export default function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const showSuccess = useUiStore((state) => state.success);
  const showError = useUiStore((state) => state.error);
  const reduceMotion = useReducedMotion();
  const isEditing = Boolean(id);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [galleryUrls, setGalleryUrls] = useState([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [pendingNavigate, setPendingNavigate] = useState(null);
  const baselineRef = useRef(initialForm);
  const galleryBaselineRef = useRef(0);
  const savedRef = useRef(false);

  useDocumentTitle(isEditing ? 'Edit Product' : 'New Product');

  const {
    data: product,
    isPending,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.product(id),
    queryFn: () => adminApi.product(id),
    enabled: isEditing,
  });

  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.admin.categories(),
    queryFn: () => adminApi.categories(),
  });
  const categories =
    categoriesData?.categories || categoriesData?.data?.categories || [];

  useEffect(() => {
    if (product?.product) {
      const p = product.product;
      const nextForm = {
        name: p.name || '',
        slug: p.slug || '',
        description: p.description || '',
        shortDescription: p.shortDescription || '',
        categoryId: p.category?.id || p.category?.slug || '',
        price: p.pricePaise ? (p.pricePaise / 100).toFixed(2) : '',
        compareAtPrice: p.compareAtPricePaise ? (p.compareAtPricePaise / 100).toFixed(2) : '',
        stock: p.stock || 0,
        isAvailable: p.isAvailable !== false,
        isVeg: p.isVeg === true,
        isFeatured: p.isFeatured === true,
        isBestseller: p.isBestseller === true,
        isNew: p.isNew === true,
        prepTimeMinutes: p.prepTimeMinutes || 25,
        image: p.image?.url || '',
        tags: (p.tags || []).join(', '),
      };
      setForm(nextForm);
      baselineRef.current = nextForm;
      setImagePreview(p.image?.url || '');
      const nextGallery = (p.gallery || []).map((g) => g.url).filter(Boolean);
      setGalleryUrls(nextGallery);
      galleryBaselineRef.current = nextGallery.length;
    }
  }, [product]);

  const isDirty =
    !sameForm(form, baselineRef.current) || galleryUrls.length !== galleryBaselineRef.current;

  // Warn before a browser reload or tab close while the form has unsaved edits.
  useEffect(() => {
    if (!isDirty) return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // The app uses a declarative router (no data router), so in-app navigation
  // is intercepted manually: any internal link click while the form is dirty
  // opens the discard confirmation instead of leaving the page.
  useEffect(() => {
    if (!isDirty || savedRef.current) return undefined;

    const handleLinkClick = (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!target || typeof target.closest !== 'function') return;
      const anchor = target.closest('a[href]');
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      let targetUrl;
      try {
        targetUrl = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (targetUrl.origin !== window.location.origin) return;
      if (targetUrl.pathname === window.location.pathname) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingNavigate(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`);
      setDiscardOpen(true);
    };

    document.addEventListener('click', handleLinkClick, true);
    return () => document.removeEventListener('click', handleLinkClick, true);
  }, [isDirty]);

  const requestNavigate = useCallback(
    (target) => {
      if (isDirty && !savedRef.current) {
        setPendingNavigate(target);
        setDiscardOpen(true);
        return;
      }
      navigate(target);
    },
    [isDirty, navigate]
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setForm((prev) => ({ ...prev, [name]: val }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const res = await adminApi.uploadImage(file);
      const url = res?.file?.url || '';
      setForm((prev) => ({ ...prev, image: url }));
      setImagePreview(url);
      showSuccess('Image uploaded');
    } catch (uploadError) {
      showError(getErrorMessage(uploadError, 'Image upload failed'));
    } finally {
      setImageUploading(false);
    }
  };

  const removeGalleryImage = (index) => {
    setGalleryUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    if (galleryUrls.length + files.length > 8) {
      showError('Maximum 8 gallery images allowed');
      return;
    }
    setGalleryUploading(true);
    try {
      for (const file of files) {
        if (galleryUrls.length >= 8) break;
        const res = await adminApi.uploadImage(file);
        const url = res?.file?.url || '';
        if (url) setGalleryUrls((prev) => [...prev, url]);
      }
      showSuccess('Gallery images uploaded');
    } catch (galleryError) {
      showError(getErrorMessage(galleryError, 'Gallery upload failed'));
    } finally {
      setGalleryUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseForm(productFormSchema, form);
    if (!parsed.success) {
      setErrors(parsed.errors);
      focusFirstInvalidField();
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const data = parsed.data;
      const payload = {
        name: data.name,
        slug: data.slug || undefined,
        description: data.description,
        shortDescription: data.shortDescription || undefined,
        categoryId: data.categoryId,
        pricePaise: Math.round(data.price * 100),
        compareAtPricePaise: data.compareAtPrice ? Math.round(data.compareAtPrice * 100) : null,
        stock: data.stock,
        isAvailable: data.isAvailable,
        isVeg: data.isVeg,
        isFeatured: data.isFeatured,
        isBestseller: data.isBestseller,
        isNew: data.isNew,
        prepTimeMinutes: data.prepTimeMinutes,
        image: data.image || undefined,
        gallery: galleryUrls.length ? galleryUrls : undefined,
        tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };
      if (isEditing) {
        await adminApi.updateProduct(id, payload);
      } else {
        await adminApi.createProduct(payload);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.products({}) });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showSuccess(isEditing ? 'Product updated' : 'Product created');
      savedRef.current = true;
      setForm(baselineRef.current);
      navigate('/admin/products');
    } catch (saveError) {
      setErrors(mapServerErrors(saveError?.details));
      showError(getErrorMessage(saveError, 'Failed to save product'));
    } finally {
      setSaving(false);
    }
  };

  const formMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.24, ease: 'easeOut' },
      };

  if (isEditing && isPending) {
    return (
      <div className="form-page">
        <div className="form-skeleton" aria-busy="true">
          <div className="skeleton" style={{ width: '30%', height: '2rem' }} />
          <FormSkeleton fields={8} rows={2} />
        </div>
      </div>
    );
  }

  if (isEditing && error) {
    return (
      <div className="form-page">
        <ErrorState
          title="We could not load this product"
          description="The product service did not respond. Check your connection and try again."
          onRetry={refetch}
        />
        <div className="form-header-actions form-header-actions-center">
          <Button variant="secondary" onClick={() => navigate('/admin/products')}>
            Back to products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div className="form-page product-form-page" {...formMotion}>
      <header className="form-header">
        <div>
          <h1>{isEditing ? 'Edit Product' : 'New Product'}</h1>
          <p className="form-subtitle">
            {isEditing
              ? `Editing ${product?.product?.name || 'product'}`
              : 'Create a new product for the catalog'}
          </p>
        </div>
        <div className="form-header-actions">
          {isDirty ? (
            <span className="form-dirty-badge" role="status">
              Unsaved changes
            </span>
          ) : null}
          <Button variant="secondary" onClick={() => requestNavigate('/admin/products')}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" loading={saving} size="lg">
            Save Product
          </Button>
        </div>
      </header>

      {isEditing && isFetching ? (
        <p className="form-fetching" role="status">
          Refreshing the latest product details…
        </p>
      ) : null}

      <form id="product-form" onSubmit={handleSubmit} className="product-form" noValidate>
        <div className="form-grid">
          <div className="form-column form-main">
            <section className="form-section">
              <h2>Basic Information</h2>
              <div className="form-field">
                <label htmlFor="name">Product Name *</label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g., Paneer Butter Masala"
                  error={errors.name}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="slug">Slug (URL)</label>
                <Input
                  id="slug"
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  placeholder="auto-generated from name"
                  hint="Leave blank to auto-generate from name"
                  error={errors.slug}
                />
              </div>
              <div className="form-field">
                <label htmlFor="categoryId">Category *</label>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={form.categoryId}
                  onChange={handleChange}
                  className={`select-input ${errors.categoryId ? 'has-error' : ''}`.trim()}
                  aria-invalid={errors.categoryId ? 'true' : undefined}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && <span className="field-error">{errors.categoryId}</span>}
              </div>
              <div className="form-field">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  className={`textarea-input ${errors.description ? 'has-error' : ''}`.trim()}
                  placeholder="Full product description"
                  aria-invalid={errors.description ? 'true' : undefined}
                />
                {errors.description && <span className="field-error">{errors.description}</span>}
              </div>
              <div className="form-field">
                <label htmlFor="shortDescription">Short Description</label>
                <textarea
                  id="shortDescription"
                  name="shortDescription"
                  value={form.shortDescription}
                  onChange={handleChange}
                  rows={2}
                  className={`textarea-input ${errors.shortDescription ? 'has-error' : ''}`.trim()}
                  placeholder="Brief summary for cards (max 160 chars)"
                  aria-invalid={errors.shortDescription ? 'true' : undefined}
                />
                {errors.shortDescription && (
                  <span className="field-error">{errors.shortDescription}</span>
                )}
              </div>
              <div className="form-field">
                <label htmlFor="tags">Tags</label>
                <Input
                  id="tags"
                  name="tags"
                  value={form.tags}
                  onChange={handleChange}
                  placeholder="spicy, vegetarian, lunch"
                  hint="Comma-separated tags"
                  error={errors.tags}
                />
              </div>
            </section>

            <section className="form-section">
              <h2>Pricing &amp; Inventory</h2>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="price">Price (₹) *</label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="249.00"
                    error={errors.price}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="compareAtPrice">Compare At Price (₹)</label>
                  <Input
                    id="compareAtPrice"
                    name="compareAtPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.compareAtPrice}
                    onChange={handleChange}
                    placeholder="299.00"
                    hint="Original price for discount display"
                    error={errors.compareAtPrice}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="stock">Stock Quantity *</label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={handleChange}
                    error={errors.stock}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="prepTimeMinutes">Prep Time (min)</label>
                  <Input
                    id="prepTimeMinutes"
                    name="prepTimeMinutes"
                    type="number"
                    min="1"
                    max="240"
                    value={form.prepTimeMinutes}
                    onChange={handleChange}
                    error={errors.prepTimeMinutes}
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="form-column form-sidebar">
            <section className="form-section sticky-save">
              <h2>Product Image</h2>
              <div className="image-upload">
                {imagePreview ? (
                  <div className="image-preview">
                    <img src={imagePreview} alt={`Preview of ${form.name || 'product'}`} />
                    <button
                      type="button"
                      className="remove-image"
                      aria-label="Remove product image"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, image: '' }));
                        setImagePreview('');
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="image-placeholder"
                      onClick={() => document.getElementById('image-upload').click()}
                    >
                      <Icon name="image" size={48} />
                      <span>Click to upload image</span>
                    </button>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                  </>
                )}
                {imageUploading && <div className="upload-progress">Uploading…</div>}
              </div>
            </section>

            <section className="form-section">
              <h2>Gallery Images</h2>
              <div className="gallery-list">
                {galleryUrls.map((url, index) => (
                  <div key={url} className="gallery-item">
                    <img src={url} alt={`Gallery image ${index + 1} of ${form.name || 'product'}`} />
                    <button
                      type="button"
                      className="remove-image"
                      aria-label={`Remove gallery image ${index + 1}`}
                      onClick={() => removeGalleryImage(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {galleryUrls.length < 8 && (
                  <>
                    <button
                      type="button"
                      className="gallery-placeholder"
                      onClick={() => document.getElementById('gallery-upload').click()}
                    >
                      <Icon name="image" size={32} />
                      <span>Add gallery images</span>
                    </button>
                    <input
                      id="gallery-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleGalleryUpload}
                      style={{ display: 'none' }}
                    />
                  </>
                )}
                {galleryUploading && <div className="upload-progress">Uploading…</div>}
              </div>
            </section>

            <section className="form-section sticky-save">
              <h2>Attributes</h2>
              <div className="toggle-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    name="isAvailable"
                    checked={form.isAvailable}
                    onChange={handleChange}
                  />
                  <span>Available for Order</span>
                </label>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    name="isVeg"
                    checked={form.isVeg}
                    onChange={handleChange}
                  />
                  <span>Vegetarian</span>
                </label>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    name="isFeatured"
                    checked={form.isFeatured}
                    onChange={handleChange}
                  />
                  <span>Featured</span>
                </label>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    name="isBestseller"
                    checked={form.isBestseller}
                    onChange={handleChange}
                  />
                  <span>Bestseller</span>
                </label>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    name="isNew"
                    checked={form.isNew}
                    onChange={handleChange}
                  />
                  <span>New Arrival</span>
                </label>
              </div>
            </section>

            <div className="sticky-save-bar">
              <Button type="submit" form="product-form" fullWidth loading={saving}>
                Save Product
              </Button>
            </div>
          </aside>
        </div>
      </form>

      <ConfirmDialog
        isOpen={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          savedRef.current = true;
          navigate(pendingNavigate || '/admin/products');
        }}
        title="Discard unsaved changes?"
        message="Your edits to this product have not been saved yet. Leaving this page will lose them."
        cancelText="Keep editing"
        confirmText="Discard changes"
        variant="danger"
      />
    </motion.div>
  );
}
