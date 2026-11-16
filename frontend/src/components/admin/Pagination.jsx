import { memo } from 'react';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import './Pagination.css';

const Pagination = memo(function Pagination({
  page = 1,
  pageCount = 1,
  total = 0,
  onPageChange,
  showPageNumbers = true,
  siblingCount = 1,
  pageSize = 20,
}) {
  if (pageCount <= 1) return null;

  const pages = [];
  let lastPage = 0;

  const addPage = (p) => {
    if (p > 0 && p <= pageCount && p !== lastPage) {
      pages.push(p);
      lastPage = p;
    }
  };

  const addEllipsis = () => {
    if (pages.length && pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  };

  addPage(1);

  const start = Math.max(2, page - siblingCount);
  const end = Math.min(pageCount - 1, page + siblingCount);

  if (start > 2) addEllipsis();
  for (let p = start; p <= end; p++) addPage(p);
  if (end < pageCount - 1) addEllipsis();
  if (pageCount > 1) addPage(pageCount);

  return (
    <nav className="pagination" aria-label="Pagination">
      <div className="pagination-info">
        Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
      </div>
      <ul className="pagination-list">
        <li>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
            iconLeft={<Icon name="chevron-left" size={16} />}
          />
        </li>
        {showPageNumbers &&
          pages.map((p, i) =>
            p === '...' ? (
              <li key={`ellipsis-${i}`} className="pagination-ellipsis" aria-hidden="true">
                …
              </li>
            ) : (
              <li key={p}>
                <button
                  type="button"
                  className={`pagination-btn ${p === page ? 'is-active' : ''}`}
                  onClick={() => onPageChange(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </button>
              </li>
            )
          )}
        <li>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page === pageCount}
            aria-label="Next page"
            iconRight={<Icon name="chevron-right" size={16} />}
          />
        </li>
      </ul>
    </nav>
  );
});

Pagination.displayName = 'Pagination';

export default Pagination;