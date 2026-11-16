import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminApi } from '../../api/admin.api';
import { queryKeys } from '../../api/queryKeys';
import {
  categoryFormSchema,
  focusFirstInvalidField,
  getErrorMessage,
  mapServerErrors,
  parseForm,
} from '../../lib/validation/forms';
import { useUiStore } from '../../stores/ui.store';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import { ConfirmDialog, FormModal } from '../../components/admin/Modal';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { RefreshIndicator } from '../../components/ui/RefreshIndicator';
import { CategoryGridSkeleton, KpiSkeleton } from '../../components/loading';
import './CategoriesPage.css';

const initialCategoryForm = {
  name: '',
  slug: '',
  description: '',
  image: '',
  sortOrder: 0,
  isActive: true,
};

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const showSuccess = useUiStore((state) => state.success);
  const showError = useUiStore((state) => state.error);
  const reduceMotion = useReducedMotion();
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [form, setForm] = useState(initialCategoryForm);
  const [errors, setErrors] = useState({});

  useDocumentTitle('Categories');

  const {
    data,
    isPending,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.categories(),
    queryFn: () => adminApi.categories(),
  });

  const categories = data?.data?.categories || data?.categories || [];
  const activeCount = categories.filter((category) => category.isActive !== false).length;
  const productTotal = categories.reduce(
    (sum, category) => sum + (category.productCount || 0),
    0
  );

  const createMutation = useMutation({
    mutationFn: adminApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories() });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      setFormDialogOpen(false);
      resetForm();
      showSuccess('Category created');
    },
    onError: (createError) => {
      setErrors(mapServerErrors(createError?.details));
      showError(getErrorMessage(createError, 'Failed to create category'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: payload }) => adminApi.updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories() });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      setFormDialogOpen(false);
      setEditingCategory(null);
      resetForm();
      showSuccess('Category updated');
    },
    onError: (updateError) => {
      setErrors(mapServerErrors(updateError?.details));
      showError(getErrorMessage(updateError, 'Failed to update category'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories() });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      showSuccess('Category deleted');
    },
    onError: (deleteError) => {
      showError(getErrorMessage(deleteError, 'Failed to delete category'));
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ id, direction }) => adminApi.reorderCategory(id, direction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories() });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      showSuccess('Category reordered');
    },
    onError: (reorderError) => {
      showError(getErrorMessage(reorderError, 'Failed to reorder category'));
    },
  });

  const handleReorder = useCallback(
    (id, direction) => {
      reorderMutation.mutateAsync({ id, direction });
    },
    [reorderMutation]
  );

  const resetForm = () => {
    setForm(initialCategoryForm);
    setEditingCategory(null);
    setErrors({});
  };

  const handleOpenCreate = () => {
    resetForm();
    setFormDialogOpen(true);
  };

  const handleOpenEdit = (category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      slug: category.slug || '',
      description: category.description || '',
      image: category.image || '',
      sortOrder: category.sortOrder || 0,
      isActive: category.isActive !== false,
    });
    setErrors({});
    setFormDialogOpen(true);
  };

  const handleDelete = (category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseForm(categoryFormSchema, form);
    if (!parsed.success) {
      setErrors(parsed.errors);
      focusFirstInvalidField();
      return false;
    }

    setErrors({});
    if (editingCategory) {
      await updateMutation.mutateAsync({ id: editingCategory.id, data: parsed.data });
    } else {
      await createMutation.mutateAsync(parsed.data);
    }
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    await deleteMutation.mutateAsync(categoryToDelete.id);
  };

  const cardMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.24, ease: 'easeOut' },
      };

  return (
    <div className="categories-page">
      <header className="categories-header">
        <div className="categories-header-copy">
          <span className="categories-eyebrow">Menu structure</span>
          <h1>Categories</h1>
          <p className="page-subtitle">
            Group the menu into collections customers browse, and set the order they appear in.
          </p>
        </div>
        <div className="categories-header-actions">
          <RefreshIndicator isFetching={isFetching && !isPending} label="Refreshing" />
          <Button onClick={handleOpenCreate} iconLeft={<Icon name="plus" size={18} />}>
            New Category
          </Button>
        </div>
      </header>

      <section className="categories-summary" aria-label="Menu structure summary" aria-busy={isPending}>
        {isPending ? (
          Array.from({ length: 3 }).map((_, index) => <KpiSkeleton key={index} />)
        ) : (
          <>
            <article className="categories-summary-card">
              <span>Categories</span>
              <strong>{categories.length.toLocaleString('en-IN')}</strong>
              <small>Groups in the live menu</small>
            </article>
            <article className="categories-summary-card">
              <span>Active</span>
              <strong>{activeCount.toLocaleString('en-IN')}</strong>
              <small>Visible to customers</small>
            </article>
            <article className="categories-summary-card categories-summary-card-accent">
              <span>Products grouped</span>
              <strong>{productTotal.toLocaleString('en-IN')}</strong>
              <small>Across every category</small>
            </article>
          </>
        )}
      </section>

      {isPending ? (
        <div aria-busy="true">
          <CategoryGridSkeleton count={6} />
        </div>
      ) : error ? (
        <ErrorState
          title="We could not load the categories"
          description="The catalog service did not respond. Check your connection and try again."
          onRetry={refetch}
        />
      ) : categories.length === 0 ? (
        <EmptyState
          icon="tag"
          title="No menu groups yet"
          description="Create a category to group your menu. Customers browse the menu by category."
          actions={
            <Button onClick={handleOpenCreate} iconLeft={<Icon name="plus" size={16} />}>
              Create your first category
            </Button>
          }
        />
      ) : (
        <ul className="category-grid">
          {categories.map((category, index) => {
            const isFirst = index === 0;
            const isLast = index === categories.length - 1;
            return (
              <motion.li key={category.id} className="category-card" {...cardMotion}>
                <div className="category-card-media">
                  {category.image ? (
                    <img src={category.image} alt={`${category.name} category`} loading="lazy" />
                  ) : (
                    <span className="category-card-placeholder" aria-hidden="true">
                      <Icon name="tag" size={30} />
                    </span>
                  )}
                  <span
                    className={`category-status ${category.isActive ? 'is-active' : 'is-inactive'}`}
                  >
                    {category.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="category-card-body">
                  <h2 className="category-card-title">{category.name}</h2>
                  <p className="category-card-slug">/{category.slug}</p>
                  {category.description ? (
                    <p className="category-card-description">{category.description}</p>
                  ) : null}
                </div>

                <div className="category-card-meta">
                  <span className="category-card-count">
                    <Icon name="package" size={14} label="" />
                    {category.productCount || 0} products
                  </span>
                  <span className="category-card-order">Order {category.sortOrder || 0}</span>
                </div>

                <div className="category-card-actions">
                  <div className="category-reorder">
                    <button
                      type="button"
                      className="icon-btn"
                      title="Move up"
                      aria-label={`Move ${category.name} up`}
                      onClick={() => handleReorder(category.id, 'up')}
                      disabled={isFirst || reorderMutation.isPending}
                    >
                      <Icon name="chevron-up" size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Move down"
                      aria-label={`Move ${category.name} down`}
                      onClick={() => handleReorder(category.id, 'down')}
                      disabled={isLast || reorderMutation.isPending}
                    >
                      <Icon name="chevron-down" size={14} />
                    </button>
                  </div>
                  <div className="category-card-buttons">
                    <button
                      type="button"
                      className="icon-btn"
                      title="Edit"
                      aria-label={`Edit ${category.name}`}
                      onClick={() => handleOpenEdit(category)}
                    >
                      <Icon name="pencil" size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Delete"
                      aria-label={`Delete ${category.name}`}
                      onClick={() => handleDelete(category)}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}

      <FormModal
        isOpen={formDialogOpen}
        onClose={() => {
          setFormDialogOpen(false);
          resetForm();
        }}
        onSubmit={handleSubmit}
        title={editingCategory ? 'Edit Category' : 'New Category'}
        submitText="Save"
        loading={createMutation.isPending || updateMutation.isPending}
        size="md"
      >
        <div className="modal-form-body">
          <div className="form-field">
            <label htmlFor="cat-name">Name *</label>
            <Input
              id="cat-name"
              name="name"
              value={form.name}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, name: e.target.value }));
                if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
              }}
              placeholder="e.g., Appetizers"
              error={errors.name}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="cat-slug">Slug</label>
            <Input
              id="cat-slug"
              name="slug"
              value={form.slug}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, slug: e.target.value }));
                if (errors.slug) setErrors((prev) => ({ ...prev, slug: null }));
              }}
              placeholder="auto-generated from name"
              hint="Leave blank to auto-generate"
              error={errors.slug}
            />
          </div>
          <div className="form-field">
            <label htmlFor="cat-desc">Description</label>
            <textarea
              id="cat-desc"
              name="description"
              value={form.description}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, description: e.target.value }));
                if (errors.description) setErrors((prev) => ({ ...prev, description: null }));
              }}
              rows={3}
              className={`textarea-input ${errors.description ? 'has-error' : ''}`.trim()}
              placeholder="Category description"
              aria-invalid={errors.description ? 'true' : undefined}
            />
            {errors.description && <span className="field-error">{errors.description}</span>}
          </div>
          <div className="form-field">
            <label htmlFor="cat-image">Image URL</label>
            <Input
              id="cat-image"
              name="image"
              value={form.image}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, image: e.target.value }));
                if (errors.image) setErrors((prev) => ({ ...prev, image: null }));
              }}
              placeholder="https://example.com/image.jpg or /images/dish.png"
              type="text"
              inputMode="url"
              error={errors.image}
            />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="cat-sort">Sort Order</label>
              <Input
                id="cat-sort"
                name="sortOrder"
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    sortOrder: parseInt(e.target.value, 10) || 0,
                  }));
                  if (errors.sortOrder) setErrors((prev) => ({ ...prev, sortOrder: null }));
                }}
                error={errors.sortOrder}
              />
            </div>
            <div className="form-field">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                <span>Active</span>
              </label>
            </div>
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setCategoryToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Category"
        message={
          categoryToDelete
            ? `Delete "${categoryToDelete.name}"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
