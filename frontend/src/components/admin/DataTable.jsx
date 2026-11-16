import { memo, useState, useCallback } from 'react';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import { TableSkeleton } from '../loading';
import Pagination from './Pagination';
import './DataTable.css';

const DataTable = memo(function DataTable({
  columns = [],
  rows = [],
  rowKey,
  loading = false,
  error = null,
  onRetry,
  empty = null,
  sort,
  onSort,
  caption,
  className = '',
  page: controlledPage,
  pageCount: controlledPageCount,
  total,
  onPageChange,
  pageSize = 20,
}) {
  const [sortState, setSortState] = useState(sort);
  const [internalPage, setInternalPage] = useState(1);

  const isControlled =
    typeof controlledPage === 'number' && typeof onPageChange === 'function';

  const currentPage = isControlled ? controlledPage : internalPage;
  const pageCount = isControlled
    ? Math.max(controlledPageCount || 1, 1)
    : Math.ceil(rows.length / pageSize);
  const totalCount = isControlled ? total ?? rows.length : rows.length;
  const visibleRows = isControlled
    ? rows
    : rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const handlePageChange = isControlled ? onPageChange : setInternalPage;

  const handleSort = useCallback(
    (key) => {
      if (!onSort) return;
      const dir = sortState?.key === key && sortState?.dir === 'asc' ? 'desc' : 'asc';
      const next = { key, dir };
      setSortState(next);
      onSort(next);
    },
    [onSort, sortState]
  );

  const handleRetry = () => {
    onRetry?.();
  };

  if (loading) {
    const skeletonColumns = Math.min(Math.max(columns.length || 4, 3), 5);
    return (
      <div
        className={`datatable datatable-loading ${className}`.trim()}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="visually-hidden">Loading records…</span>
        <TableSkeleton
          rows={6}
          columns={skeletonColumns}
          thumb={skeletonColumns >= 5}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`datatable ${className}`.trim()}>
        <div className="datatable-state">
          <ErrorState
            title="We could not load this list"
            description="The request failed. Check your connection and try again."
            onRetry={onRetry ? handleRetry : undefined}
          />
        </div>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className={`datatable ${className}`.trim()}>
        <div className="datatable-state">
          {empty || (
            <EmptyState
              icon="search"
              title="Nothing to show yet"
              description="There are no records matching the current filters."
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`datatable ${className}`.trim()}>
      <div className="datatable-scroll">
        <table className="datatable-table" role="grid" aria-label={caption || 'Records'}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={{ width: col.width, textAlign: col.align }}
                  aria-sort={sortState?.key === col.key ? sortState.dir : 'none'}
                >
                  <div className="th-content">
                    <span>{col.header}</span>
                    {col.sortable && onSort && (
                      <button
                        type="button"
                        className="sort-btn"
                        onClick={() => handleSort(col.key)}
                        aria-label={`Sort by ${col.header} ${sortState?.key === col.key && sortState.dir === 'asc' ? 'descending' : 'ascending'}`}
                      >
                        <Icon
                          name={sortState?.key === col.key && sortState.dir === 'asc' ? 'chevron-down' : 'chevron-up'}
                          size={12}
                          label=""
                        />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={rowKey(row)} className="datatable-row">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="datatable-cell"
                    style={{ textAlign: col.align }}
                    data-label={col.header}
                  >
                    {col.render ? col.render(row, rowKey(row)) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          total={totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
});

DataTable.displayName = 'DataTable';

export default DataTable;
