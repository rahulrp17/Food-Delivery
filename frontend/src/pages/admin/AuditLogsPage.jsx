import { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { motion as Motion, useReducedMotion } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminApi } from '../../api/admin.api';
import { queryKeys } from '../../api/queryKeys';
import { formatDate } from '../../lib/format';
import { getErrorMessage } from '../../lib/validation/forms';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { RefreshIndicator } from '../../components/ui/RefreshIndicator';
import { FilterToolbar, FilterInput } from '../../components/ui/FilterToolbar';
import Pagination from '../../components/admin/Pagination';
import CustomerAvatar from '../../components/admin/CustomerAvatar';
import { TableSkeleton } from '../../components/loading';
import './AuditLogsPage.css';

const DEBOUNCE_MS = 350;

/**
 * Keeps a filter value from changing on every keystroke. The audit log is
 * queried by four independent filters, so without this the API would be
 * hammered while the admin is still typing.
 */
function useDebouncedValue(value, delay = DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

const statusTone = (status) => {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 400 && status < 500) return 'warning';
  if (status >= 500) return 'danger';
  return 'neutral';
};

const statusLabel = (status) => {
  if (status >= 200 && status < 300) return 'Success';
  if (status >= 400 && status < 500) return 'Client error';
  if (status >= 500) return 'Server error';
  return 'Unknown';
};

export default function AuditLogsPage() {
  const reduceMotion = useReducedMotion();
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const [path, setPath] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  useDocumentTitle('Activity Log');

  const debouncedActor = useDebouncedValue(actor);
  const debouncedAction = useDebouncedValue(action);
  const debouncedPath = useDebouncedValue(path);
  const debouncedQ = useDebouncedValue(q);

  const params = {
    actor: debouncedActor || undefined,
    action: debouncedAction || undefined,
    path: debouncedPath || undefined,
    q: debouncedQ || undefined,
    page,
  };

  const {
    data,
    isPending,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.auditLogs ? queryKeys.admin.auditLogs(params) : ['admin', 'audit-logs', params],
    queryFn: () => adminApi.auditLogs(params),
    placeholderData: keepPreviousData,
  });

  const logs = useMemo(() => data?.items || [], [data]);
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const hasFilters = Boolean(actor || action || path || q);

  const updateFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const renderBody = () => {
    if (isPending) {
      return (
        <div className="audit-loading" aria-busy="true">
          <TableSkeleton rows={8} columns={4} />
        </div>
      );
    }

    if (error) {
      return (
        <ErrorState
          title="We could not load the activity log"
          description={getErrorMessage(error, 'The audit log request failed. Please try again.')}
          onRetry={() => refetch()}
        />
      );
    }

    if (!logs.length) {
      return (
        <EmptyState
          icon="clock"
          title={hasFilters ? 'No entries match these filters' : 'Nothing recorded yet'}
          description={
            hasFilters
              ? 'Try a broader actor, action or path — filters are applied as you type.'
              : 'Every admin action will be listed here with who did it and when.'
          }
          actions={
            hasFilters ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setActor('');
                  setAction('');
                  setPath('');
                  setQ('');
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            ) : null
          }
        />
      );
    }

    return (
      <ol className="audit-trail" aria-busy={isFetching || undefined}>
        {logs.map((log, index) => (
          <Motion.li
            key={log.id}
            className="audit-entry"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.2,
              delay: reduceMotion ? 0 : Math.min(index, 8) * 0.025,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <div className="audit-entry-time">
              <span className="audit-time">{formatDate(log.createdAt)}</span>
              {log.method ? <span className="audit-method">{log.method}</span> : null}
            </div>

            <span
              className={`audit-marker${log.statusCode >= 400 ? ' is-error' : ''}`}
              aria-hidden="true"
            />

            <div className="audit-entry-body">
              <div className="audit-entry-head">
                <span className="audit-action">{log.action || 'Unknown action'}</span>
                <Badge tone={statusTone(log.statusCode)}>
                  {log.statusCode || '—'} · {statusLabel(log.statusCode)}
                </Badge>
              </div>

              <code className="audit-path">{log.path || '—'}</code>

              <div className="audit-entry-meta">
                <span className="audit-actor">
                  <CustomerAvatar
                    name={log.actorEmail || 'system'}
                    email={log.actorEmail}
                    size="sm"
                  />
                  <span className="audit-actor-text">
                    <strong>{log.actorEmail || log.actorId || 'system'}</strong>
                    {log.actorRole ? <span className="audit-meta">{log.actorRole}</span> : null}
                  </span>
                </span>
                {log.entityType ? (
                  <span className="audit-entity">
                    {log.entityType}
                    {log.entityId ? ` · ${String(log.entityId).slice(-8)}` : ''}
                  </span>
                ) : null}
              </div>
            </div>
          </Motion.li>
        ))}
      </ol>
    );
  };

  return (
    <div className="audit-logs-page">
      <PageHeader
        eyebrow="Compliance"
        title="Activity Log"
        description="A chronological record of every admin action, who took it and when."
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => refetch()}
              iconLeft={<Icon name="refresh" size={16} />}
            >
              Refresh
            </Button>
            <RefreshIndicator isFetching={isFetching && !isPending} label="Refreshing log" />
          </>
        }
      />

      <FilterToolbar>
        <FilterInput
          id="audit-actor"
          label="Actor"
          value={actor}
          onChange={updateFilter(setActor)}
          placeholder="Actor email or ID"
        />
        <FilterInput
          id="audit-action"
          label="Action"
          value={action}
          onChange={updateFilter(setAction)}
          placeholder="Action (e.g. PATCH /admin/reviews/:id)"
        />
        <FilterInput
          id="audit-path"
          label="Path"
          value={path}
          onChange={updateFilter(setPath)}
          placeholder="Path contains"
        />
        <FilterInput
          id="audit-q"
          label="Search"
          value={q}
          onChange={updateFilter(setQ)}
          placeholder="Search action, path, actor"
        />
      </FilterToolbar>

      {renderBody()}

      {!isPending && !error && meta.totalPages > 1 ? (
        <Pagination
          page={page}
          pageCount={meta.totalPages}
          total={meta.total}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
