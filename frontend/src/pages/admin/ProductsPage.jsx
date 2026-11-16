import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminApi } from '../../api/admin.api';
import { queryKeys } from '../../api/queryKeys';
import { getErrorMessage } from '../../lib/validation/forms';
import { useUiStore } from '../../stores/ui.store';
import DataTable from '../../components/admin/DataTable';
import FoodThumb from '../../components/admin/FoodThumb';
import Pagination from '../../components/admin/Pagination';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import { formatINR } from '../../lib/format';
import Badge from '../../components/ui/Badge';
import { ConfirmDialog, FormModal } from '../../components/admin/Modal';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { RefreshIndicator } from '../../components/ui/RefreshIndicator';
import { FilterToolbar, SearchInput, FilterSelect } from '../../components/ui/FilterToolbar';
import { KpiSkeleton, ProductTableSkeleton, ProductGridSkeleton } from '../../components/loading';
import './ProductsPage.css';

const CATEGORIES_FALLBACK = [];

const STOCK_OPTIONS = [
  { value: '', label: 'All stock levels' },
  { value: 'low', label: 'Low stock only' },
];

const AVAILABILITY_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'true', label: 'Available' },
  { value: 'false', label: 'Unavailable' },
];

const COMPACT_QUERY = '(max-width: 767px)';

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'stock-asc', label: 'Stock: low to high' },
  { value: 'stock-desc', label: 'Stock: high to low' },
];

const SORT_KEYS = {
  'name-asc': { key: 'name', dir: 'asc' },
  'name-desc': { key: 'name', dir: 'desc' },
  'price-asc': { key: 'price', dir: 'asc' },
  'price-desc': { key: 'price', dir: 'desc' },
  'stock-asc': { key: 'stock', dir: 'asc' },
  'stock-desc': { key: 'stock', dir: 'desc' },
};

const sortAccessors = {
  name: (row) => String(row.name || '').toLowerCase(),
  price: (row) => row.pricePaise || 0,
  stock: (row) => row.stock || 0,
};

export default function ProductsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showSuccess = useUiStore((state) => state.success);
  const showError = useUiStore((state) => state.error);
  const reduceMotion = useReducedMotion();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [isAvailable, setIsAvailable] = useState('');
  const [stockLow, setStockLow] = useState(false);
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState('stock');
  const [bulkStock, setBulkStock] = useState('');
  const [bulkAvailable, setBulkAvailable] = useState('true');
  const [bulkCategory, setBulkCategory] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false);
  const [deleteSelectedPending, setDeleteSelectedPending] = useState(false);
  const [isCompact, setIsCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(COMPACT_QUERY).matches
  );
  const [view, setView] = useState(
    () =>
      typeof window !== 'undefined' && window.matchMedia(COMPACT_QUERY).matches
        ? 'cards'
        : 'table'
  );

  useDocumentTitle('Products');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia(COMPACT_QUERY);
    const handleChange = (event) => setIsCompact(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const params = {
    q: search,
    category,
    isAvailable: isAvailable || undefined,
    stock: stockLow ? 'low' : undefined,
    page,
  };

  const {
    data,
    isPending,
    isFetching,
    isPlaceholderData,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.products(params),
    queryFn: () => adminApi.products(params),
    placeholderData: keepPreviousData,
  });

  const products = useMemo(() => data?.items || [], [data]);
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const {
    data: categoriesData,
    error: categoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: queryKeys.admin.categories(),
    queryFn: () => adminApi.categories(),
  });
  const categories = useMemo(
    () => categoriesData?.categories || categoriesData?.data?.categories || CATEGORIES_FALLBACK,
    [categoriesData]
  );

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.products({}) });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      showSuccess('Product deleted');
    },
    onError: (deleteError) => {
      showError(getErrorMessage(deleteError, 'Failed to delete product'));
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: adminApi.duplicateProduct,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.products({}) });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showSuccess('Draft copy created');
      if (result?.product?.id) navigate(`/admin/products/${result.product.id}`);
    },
    onError: (duplicateError) => {
      showError(getErrorMessage(duplicateError, 'Failed to duplicate product'));
    },
  });

  const handleDelete = useCallback((product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!productToDelete) return;
    await deleteMutation.mutateAsync(productToDelete.id);
  }, [productToDelete, deleteMutation]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(products.map((r) => r.id));
  }, [products]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const confirmBulkAction = useCallback(async () => {
    if (selectedIds.length === 0) return false;
    try {
      if (bulkAction === 'stock') {
        await adminApi.bulkUpdateProducts({
          ids: selectedIds,
          stock: Number(bulkStock || 0),
        });
      } else if (bulkAction === 'available') {
        await adminApi.bulkUpdateProducts({
          ids: selectedIds,
          isAvailable: bulkAvailable === 'true',
        });
      } else if (bulkAction === 'category') {
        await adminApi.bulkUpdateProducts({
          ids: selectedIds,
          categoryId: bulkCategory || undefined,
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.products({}) });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setBulkDialogOpen(false);
      clearSelection();
      showSuccess('Bulk update applied');
      return true;
    } catch (bulkError) {
      showError(getErrorMessage(bulkError, 'Bulk update failed'));
      return false;
    }
  }, [
    selectedIds,
    bulkAction,
    bulkStock,
    bulkAvailable,
    bulkCategory,
    clearSelection,
    queryClient,
    showError,
    showSuccess,
  ]);

  const confirmDeleteSelected = useCallback(async () => {
    setDeleteSelectedPending(true);
    try {
      await Promise.all(selectedIds.map((id) => deleteMutation.mutateAsync(id)));
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.products({}) });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteSelectedOpen(false);
      clearSelection();
      showSuccess('Selected products deleted');
    } catch (deleteError) {
      showError(getErrorMessage(deleteError, 'Failed to delete selected products'));
    } finally {
      setDeleteSelectedPending(false);
    }
  }, [selectedIds, deleteMutation, clearSelection, queryClient, showError, showSuccess]);

  const handleSort = useCallback((next) => {
    setSort(next);
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setCategory('');
    setIsAvailable('');
    setStockLow(false);
    setPage(1);
  }, []);

  const sortedProducts = useMemo(
    () =>
      [...products].sort((a, b) => {
        const accessor = sortAccessors[sort.key];
        if (!accessor) return 0;
        const left = accessor(a);
        const right = accessor(b);
        if (left < right) return sort.dir === 'asc' ? -1 : 1;
        if (left > right) return sort.dir === 'asc' ? 1 : -1;
        return 0;
      }),
    [products, sort]
  );

  const availableCount = products.filter((row) => row.isAvailable).length;
  const lowStockCount = products.filter((row) => row.stock <= 10).length;

  const columns = [
    {
      key: 'select',
      header: '',
      width: '44px',
      render: (r) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(r.id)}
          onChange={() => toggleSelect(r.id)}
          aria-label={`Select ${r.name}`}
        />
      ),
    },
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      render: (r) => (
        <span className="product-cell">
          <FoodThumb src={r.image?.url} alt={r.name} size="md" />
          <span className="product-cell-text">
            <strong>{r.name}</strong>
            <span>{r.category?.name || 'Uncategorised'}</span>
          </span>
        </span>
      ),
    },
    { key: 'category', header: 'Category', render: (r) => r.category?.name || '—' },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      width: '120px',
      sortable: true,
      render: (r) => formatINR(r.pricePaise),
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'center',
      width: '90px',
      sortable: true,
      render: (r) => (
        <span className={r.stock <= 10 ? 'stock-low' : ''}>{r.stock}</span>
      ),
    },
    {
      key: 'available',
      header: 'Status',
      width: '120px',
      render: (r) => (
        <Badge tone={r.isAvailable ? 'success' : 'neutral'} dot>
          {r.isAvailable ? 'Available' : 'Unavailable'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '140px',
      render: (r) => (
        <>
          <button
            className="icon-btn"
            title="Edit"
            aria-label={`Edit ${r.name}`}
            onClick={() => navigate(`/admin/products/${r.id}`)}
          >
            <Icon name="pencil" size={16} />
          </button>
          <button
            className="icon-btn"
            title="Duplicate"
            aria-label={`Duplicate ${r.name}`}
            aria-busy={duplicateMutation.isPending && duplicateMutation.variables === r.id}
            disabled={duplicateMutation.isPending}
            onClick={() => duplicateMutation.mutate(r.id)}
          >
            <Icon name="copy" size={16} />
          </button>
          <button
            className="icon-btn danger"
            title="Delete"
            aria-label={`Delete ${r.name}`}
            onClick={() => handleDelete(r)}
          >
            <Icon name="trash" size={16} />
          </button>
        </>
      ),
    },
  ];

  const hasSelection = selectedIds.length > 0;
  const hasFilters = Boolean(search || category || isAvailable || stockLow);
  const showCards = isCompact || view === 'cards';
  const sortValue = `${sort.key}-${sort.dir}`;

  const productMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.22, ease: 'easeOut' },
      };

  const cardMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.22, ease: 'easeOut' },
      };

  return (
    <div className="products-page">
      <header className="products-hero">
        <div className="products-hero-copy">
          <span className="products-eyebrow">Catalog</span>
          <h1>Products</h1>
          <p className="page-subtitle">
            Manage the menu, pricing, availability and stock levels your kitchen sells from.
          </p>
        </div>
        <div className="products-hero-actions">
          <RefreshIndicator isFetching={isFetching && !isPending} label="Refreshing" />
          <Button onClick={() => navigate('/admin/products/new')} iconLeft={<Icon name="plus" size={18} />}>
            New Product
          </Button>
        </div>
      </header>

      <section className="products-summary" aria-label="Catalog summary" aria-busy={isPending}>
        {isPending ? (
          Array.from({ length: 4 }).map((_, index) => <KpiSkeleton key={index} />)
        ) : (
          <>
            <article className="products-summary-card">
              <span>Total products</span>
              <strong>{meta.total.toLocaleString('en-IN')}</strong>
              <small>Matching the current filters</small>
            </article>
            <article className="products-summary-card">
              <span>Available now</span>
              <strong>{availableCount}</strong>
              <small>On this page</small>
            </article>
            <article className="products-summary-card">
              <span>Low stock</span>
              <strong>{lowStockCount}</strong>
              <small>Ten units or fewer</small>
            </article>
            <article className="products-summary-card products-summary-card-accent">
              <span>Categories</span>
              <strong>{categories.length}</strong>
              <small>Groups in the menu</small>
            </article>
          </>
        )}
      </section>

      <FilterToolbar
        actions={
          <>
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} iconLeft={<Icon name="x" size={16} />}>
                Clear
              </Button>
            )}
            {!isCompact && (
              <div className="products-view-switch" role="group" aria-label="Switch product view">
                <button
                  type="button"
                  className={`products-view-btn ${view === 'table' ? 'is-active' : ''}`}
                  aria-pressed={view === 'table'}
                  onClick={() => setView('table')}
                >
                  <Icon name="list" size={16} label="" />
                  Table
                </button>
                <button
                  type="button"
                  className={`products-view-btn ${view === 'cards' ? 'is-active' : ''}`}
                  aria-pressed={view === 'cards'}
                  onClick={() => setView('cards')}
                >
                  <Icon name="layout" size={16} label="" />
                  Cards
                </button>
              </div>
            )}
          </>
        }
      >
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search products..."
          label="Search products"
        />
        <FilterSelect
          label="Category"
          value={category}
          onChange={(value) => {
            setCategory(value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All categories' },
            ...categories.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <FilterSelect
          label="Availability"
          value={isAvailable}
          onChange={(value) => {
            setIsAvailable(value);
            setPage(1);
          }}
          options={AVAILABILITY_OPTIONS}
        />
        <FilterSelect
          label="Stock"
          value={stockLow ? 'low' : ''}
          onChange={(value) => {
            setStockLow(value === 'low');
            setPage(1);
          }}
          options={STOCK_OPTIONS}
        />
        {showCards ? (
          <FilterSelect
            label="Sort"
            value={sortValue}
            onChange={(value) => {
              if (SORT_KEYS[value]) setSort(SORT_KEYS[value]);
            }}
            options={SORT_OPTIONS}
          />
        ) : null}
      </FilterToolbar>

      {categoriesError ? (
        <p className="products-inline-error" role="alert">
          <Icon name="filter" size={16} label="" />
          <span>Category filters could not be loaded.</span>
          <button type="button" className="products-inline-retry" onClick={() => refetchCategories()}>
            Retry
          </button>
        </p>
      ) : null}

      {hasSelection && (
        <motion.div className="bulk-toolbar" {...productMotion}>
          <span className="bulk-count">{selectedIds.length} selected</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setBulkAction('stock');
              setBulkDialogOpen(true);
            }}
          >
            Bulk actions
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteSelectedOpen(true)}>
            Delete selected
          </Button>
          {!products.every((r) => selectedIds.includes(r.id)) && (
            <Button variant="secondary" size="sm" onClick={selectAll}>
              Select all
            </Button>
          )}
          {products.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          )}
        </motion.div>
      )}

      {isPending ? (
        <div aria-busy="true">
          {showCards ? (
            <ProductGridSkeleton count={6} />
          ) : (
            <ProductTableSkeleton rows={8} />
          )}
        </div>
      ) : error ? (
        <ErrorState
          title="We could not load the catalog"
          description="The product service did not respond. Check your connection and try again."
          onRetry={refetch}
        />
      ) : sortedProducts.length === 0 ? (
        <EmptyState
          icon="package"
          title="Nothing in the catalog yet"
          description={
            hasFilters
              ? 'Nothing matches the filters you picked. Try a different search term or clear them.'
              : 'Add your first product to start selling from the admin catalog.'
          }
          actions={
            hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button onClick={() => navigate('/admin/products/new')}>Add your first product</Button>
            )
          }
        />
      ) : showCards ? (
        <div className="products-card-region">
          <ul className="products-card-grid">
            {sortedProducts.map((product) => (
              <motion.li key={product.id} className="products-card" {...cardMotion}>
                <div className="products-card-media">
                  <FoodThumb src={product.image?.url} alt={product.name} size="lg" />
                  <label className="products-card-select">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      aria-label={`Select ${product.name}`}
                    />
                    <span className="visually-hidden">Select {product.name}</span>
                  </label>
                </div>

                <div className="products-card-body">
                  <h2 className="products-card-title">{product.name}</h2>
                  <p className="products-card-category">
                    {product.category?.name || 'Uncategorised'}
                  </p>
                  <div className="products-card-meta">
                    <span className="products-card-price">{formatINR(product.pricePaise)}</span>
                    <span className={product.stock <= 10 ? 'stock-low' : 'products-card-stock'}>
                      {product.stock} in stock
                    </span>
                  </div>
                  <div className="products-card-badge">
                    <Badge tone={product.isAvailable ? 'success' : 'neutral'} dot>
                      {product.isAvailable ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                </div>

                <div className="products-card-actions">
                  <button
                    className="icon-btn"
                    title="Edit"
                    aria-label={`Edit ${product.name}`}
                    onClick={() => navigate(`/admin/products/${product.id}`)}
                  >
                    <Icon name="pencil" size={16} />
                  </button>
                  <button
                    className="icon-btn"
                    title="Duplicate"
                    aria-label={`Duplicate ${product.name}`}
                    aria-busy={
                      duplicateMutation.isPending && duplicateMutation.variables === product.id
                    }
                    disabled={duplicateMutation.isPending}
                    onClick={() => duplicateMutation.mutate(product.id)}
                  >
                    <Icon name="copy" size={16} />
                  </button>
                  <button
                    className="icon-btn danger"
                    title="Delete"
                    aria-label={`Delete ${product.name}`}
                    onClick={() => handleDelete(product)}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </motion.li>
            ))}
          </ul>
          <Pagination
            page={page}
            pageCount={meta.totalPages}
            total={meta.total}
            onPageChange={setPage}
          />
        </div>
      ) : (
        <DataTable
          className={isPlaceholderData ? 'is-placeholder' : ''}
          columns={columns}
          rows={sortedProducts}
          rowKey={(r) => r.id}
          sort={sort}
          onSort={handleSort}
          page={page}
          pageCount={meta.totalPages}
          total={meta.total}
          onPageChange={setPage}
        />
      )}

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setProductToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Product"
        message={
          productToDelete
            ? `Are you sure you want to delete "${productToDelete.name}"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />

      <ConfirmDialog
        isOpen={deleteSelectedOpen}
        onClose={() => setDeleteSelectedOpen(false)}
        onConfirm={confirmDeleteSelected}
        title="Delete selected products"
        message={`Delete ${selectedIds.length} selected products? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteSelectedPending}
      />

      <FormModal
        isOpen={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        onSubmit={confirmBulkAction}
        title="Bulk actions"
        submitText="Apply"
        cancelText="Cancel"
        size="md"
      >
        <p className="bulk-dialog-intro">
          Apply one change to {selectedIds.length} selected product
          {selectedIds.length === 1 ? '' : 's'}.
        </p>

        <fieldset className="bulk-fieldset">
          <legend className="bulk-legend">Action</legend>
          <div className="bulk-actions">
            <label className="bulk-action">
              <input
                type="radio"
                name="bulkAction"
                value="stock"
                checked={bulkAction === 'stock'}
                onChange={() => setBulkAction('stock')}
              />
              Set stock
            </label>
            <label className="bulk-action">
              <input
                type="radio"
                name="bulkAction"
                value="available"
                checked={bulkAction === 'available'}
                onChange={() => setBulkAction('available')}
              />
              Availability
            </label>
            <label className="bulk-action">
              <input
                type="radio"
                name="bulkAction"
                value="category"
                checked={bulkAction === 'category'}
                onChange={() => setBulkAction('category')}
              />
              Category
            </label>
          </div>
        </fieldset>

        {bulkAction === 'stock' && (
          <div className="bulk-field">
            <label htmlFor="bulk-stock">Stock quantity</label>
            <input
              id="bulk-stock"
              type="number"
              min="0"
              value={bulkStock}
              onChange={(e) => setBulkStock(e.target.value)}
              placeholder="0"
            />
          </div>
        )}

        {bulkAction === 'available' && (
          <div className="bulk-field">
            <label htmlFor="bulk-available">Availability</label>
            <select
              id="bulk-available"
              value={bulkAvailable}
              onChange={(e) => setBulkAvailable(e.target.value)}
            >
              <option value="true">Available</option>
              <option value="false">Unavailable</option>
            </select>
          </div>
        )}

        {bulkAction === 'category' && (
          <div className="bulk-field">
            <label htmlFor="bulk-category">Category</label>
            <select
              id="bulk-category"
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
            >
              <option value="">Clear category</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </FormModal>
    </div>
  );
}
