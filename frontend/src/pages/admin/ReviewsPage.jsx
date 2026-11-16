import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { motion as Motion, useReducedMotion } from 'motion/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminApi } from '../../api/admin.api';
import { queryKeys } from '../../api/queryKeys';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Rating from '../../components/ui/Rating';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { RefreshIndicator } from '../../components/ui/RefreshIndicator';
import { Tabs, TabList, Tab } from '../../components/ui/Tabs';
import { ReviewTableSkeleton } from '../../components/loading';
import CustomerAvatar from '../../components/admin/CustomerAvatar';
import Pagination from '../../components/admin/Pagination';
import { formatDate } from '../../lib/format';
import { getErrorMessage } from '../../lib/validation/forms';
import { useUiStore } from '../../stores/ui.store';
import { ReviewStatusBadge } from '../../components/admin/StatusBadge';
import { FormModal } from '../../components/admin/Modal';
import './ReviewsPage.css';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'reported', label: 'Reported' },
];

/* The admin reviews endpoint only accepts pending / approved / rejected as a
   server-side filter. "Reported" is therefore resolved on the client from the
   most recent page of reviews. */
const SERVER_STATUSES = new Set(['pending', 'approved', 'rejected']);
const REPORTED_SCAN_LIMIT = 100;

const REASON_LABELS = {
  pending: 'Awaiting moderation',
  approved: 'Published to the storefront',
  rejected: 'Hidden from the storefront',
  reported: 'Flagged for review',
};

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const showSuccess = useUiStore((state) => state.success);
  const showError = useUiStore((state) => state.error);
  const reduceMotion = useReducedMotion();
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyingReviewId, setReplyingReviewId] = useState(null);
  const [replyText, setReplyText] = useState('');

  useDocumentTitle('Reviews');

  const isReportedTab = status === 'reported';

  const params = isReportedTab
    ? { limit: REPORTED_SCAN_LIMIT }
    : { status: SERVER_STATUSES.has(status) ? status : undefined, page };

  const {
    data,
    isPending,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.reviews(params),
    queryFn: () => adminApi.reviews(params),
    placeholderData: keepPreviousData,
  });

  const allItems = useMemo(() => data?.items || [], [data]);
  const reviews = useMemo(
    () => (isReportedTab ? allItems.filter((r) => r.status === 'reported') : allItems),
    [allItems, isReportedTab]
  );
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    allItems.forEach((review) => {
      const stars = Math.round(Number(review.rating) || 0);
      if (stars >= 1 && stars <= 5) counts[stars - 1] += 1;
    });
    const total = counts.reduce((sum, count) => sum + count, 0);
    return counts
      .map((count, index) => ({
        stars: index + 1,
        count,
        percent: total > 0 ? (count / total) * 100 : 0,
      }))
      .reverse();
  }, [allItems]);

  const averageRating = useMemo(() => {
    if (!allItems.length) return null;
    const total = allItems.reduce((sum, review) => sum + (Number(review.rating) || 0), 0);
    return Math.round((total / allItems.length) * 10) / 10;
  }, [allItems]);

  const moderationCounts = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0, reported: 0 };
    allItems.forEach((review) => {
      if (review.status in counts) counts[review.status] += 1;
    });
    return counts;
  }, [allItems]);

  const invalidateReviews = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    queryClient.invalidateQueries({ queryKey: ['reviews'] });
  };

  const moderateMutation = useMutation({
    mutationFn: ({ id, status: nextStatus }) => adminApi.moderateReview(id, nextStatus),
    onSuccess: (_data, variables) => {
      invalidateReviews();
      showSuccess(`Review ${variables.status}`);
    },
    onError: (mutationError) => {
      showError(getErrorMessage(mutationError, 'Failed to moderate review'));
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, reply }) => adminApi.replyReview(id, reply),
    onSuccess: () => {
      invalidateReviews();
      setReplyDialogOpen(false);
      setReplyText('');
      setReplyingReviewId(null);
      showSuccess('Reply posted');
    },
    onError: (mutationError) => {
      showError(getErrorMessage(mutationError, 'Failed to post reply'));
    },
  });

  const reportMutation = useMutation({
    mutationFn: (id) => adminApi.reportReview(id),
    onSuccess: () => {
      invalidateReviews();
      showSuccess('Review marked as reported');
    },
    onError: (mutationError) => {
      showError(getErrorMessage(mutationError, 'Failed to report review'));
    },
  });

  const handleModerate = (id, newStatus) => {
    moderateMutation.mutate({ id, status: newStatus });
  };

  const handleReply = (id) => {
    const review = reviews.find((r) => r.id === id);
    setReplyingReviewId(id);
    setReplyText(review?.adminReply?.text || '');
    setReplyDialogOpen(true);
  };

  const handleStatusChange = (nextStatus) => {
    if (nextStatus === status) return;
    setStatus(nextStatus);
    setPage(1);
  };

  const isBusy = (id) =>
    moderateMutation.isPending && moderateMutation.variables?.id === id;

  const renderSkeleton = () => (
    <div className="reviews-loading" aria-busy="true">
      <ReviewTableSkeleton rows={5} />
    </div>
  );

  const renderReviews = () => {
    if (isPending) return renderSkeleton();

    if (error) {
      return (
        <ErrorState
          title="We could not load reviews"
          description={getErrorMessage(error, 'The reviews request failed. Please try again.')}
          onRetry={() => refetch()}
        />
      );
    }

    if (!reviews.length) {
      return (
        <EmptyState
          icon="star"
          title={isReportedTab ? 'Nothing flagged yet' : 'Nothing to moderate yet'}
          description={
            isReportedTab
              ? 'Nothing in the most recent reviews has been flagged for moderation.'
              : 'Customer reviews will appear here as soon as they are submitted.'
          }
        />
      );
    }

    return (
      <ul className="review-list">
        {reviews.map((review, index) => (
          <Motion.li
            key={review.id}
            className="review-card"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.22,
              delay: reduceMotion ? 0 : Math.min(index, 6) * 0.03,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <header className="review-card-head">
              <div className="review-card-product">
                <strong>{review.product?.name || 'Unknown product'}</strong>
                <span className="review-card-date">{formatDate(review.createdAt)}</span>
              </div>
              <div className="review-card-flags">
                <Rating value={review.rating} />
                <ReviewStatusBadge status={review.status} />
              </div>
            </header>

            <div className="review-card-author">
              <CustomerAvatar name={review.author?.name} email={review.author?.email} size="sm" />
              <span className="review-card-author-name">
                {review.author?.name || 'Anonymous'}
              </span>
              <span className="review-verified" title="Only customers who received this item can review it.">
                <Icon name="shield-check" size={13} label="" />
                Verified purchase
              </span>
            </div>

            {review.title ? <h3 className="review-card-title">{review.title}</h3> : null}
            <p className="review-card-body">
              {review.body || 'This customer left a rating without a written comment.'}
            </p>

            {review.adminReply?.text ? (
              <div className="review-reply">
                <span className="review-reply-label">You:</span> {review.adminReply.text}
              </div>
            ) : null}

            <footer className="review-card-actions">
              <span className="review-card-hint">{REASON_LABELS[review.status] || ''}</span>
              <div className="review-card-buttons">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleReply(review.id)}
                  aria-label={`Reply to review by ${review.author?.name || 'anonymous customer'}`}
                  iconLeft={<Icon name="arrow-right" size={15} />}
                >
                  Reply
                </Button>
                {review.status !== 'reported' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => reportMutation.mutate(review.id)}
                    aria-label={`Mark review by ${review.author?.name || 'anonymous customer'} as reported`}
                    iconLeft={<Icon name="bell" size={15} />}
                  >
                    Report
                  </Button>
                ) : null}
                {review.status !== 'approved' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    loading={isBusy(review.id)}
                    onClick={() => handleModerate(review.id, 'approved')}
                    aria-label={`Approve review by ${review.author?.name || 'anonymous customer'}`}
                    iconLeft={<Icon name="check" size={15} />}
                  >
                    Approve
                  </Button>
                ) : null}
                {review.status !== 'rejected' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    loading={isBusy(review.id)}
                    onClick={() => handleModerate(review.id, 'rejected')}
                    aria-label={`Reject review by ${review.author?.name || 'anonymous customer'}`}
                    iconLeft={<Icon name="x" size={15} />}
                  >
                    Reject
                  </Button>
                ) : null}
              </div>
            </footer>
          </Motion.li>
        ))}
      </ul>
    );
  };

  return (
    <div className="reviews-page">
      <PageHeader
        eyebrow="Moderation"
        title="Reviews"
        description="Read, respond to and approve what customers say about your dishes."
        actions={
          <>
            <Badge tone="neutral">{meta.total} total</Badge>
            <RefreshIndicator isFetching={isFetching && !isPending} label="Refreshing reviews" />
          </>
        }
      />

      <section className="reviews-summary" aria-label="Review summary">
        <article className="reviews-summary-card">
          <span>Average rating</span>
          <strong>{averageRating !== null ? averageRating.toFixed(1) : '—'}</strong>
          <small>Across the reviews loaded here</small>
        </article>
        <article className="reviews-summary-card">
          <span>Awaiting moderation</span>
          <strong>{moderationCounts.pending}</strong>
          <small>Pending reviews in this result set</small>
        </article>
        <article className="reviews-summary-card">
          <span>Published</span>
          <strong>{moderationCounts.approved}</strong>
          <small>Visible on the storefront</small>
        </article>
        <article className="reviews-summary-card">
          <span>Flagged</span>
          <strong>{moderationCounts.reported}</strong>
          <small>Reported for a second look</small>
        </article>
      </section>

      <section className="reviews-distribution" aria-label="Rating distribution">
        <header className="reviews-distribution-head">
          <h2>Rating distribution</h2>
          <p>How the loaded reviews are spread across the five stars.</p>
        </header>
        {allItems.length ? (
          <ul className="rating-histogram">
            {distribution.map((bucket) => (
              <li key={bucket.stars} className="rating-histogram-row">
                <span className="rating-histogram-label">
                  <Icon name="star-filled" size={13} label="" />
                  {bucket.stars}
                  <span className="visually-hidden">
                    {bucket.stars === 1 ? ' star' : ' stars'}
                  </span>
                </span>
                <span className="rating-histogram-track" aria-hidden="true">
                  <span
                    className="rating-histogram-bar"
                    style={{ width: `${Math.max(bucket.percent, bucket.count ? 4 : 0)}%` }}
                  />
                </span>
                <span className="rating-histogram-count">
                  {bucket.count}
                  <span className="visually-hidden"> reviews</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="reviews-distribution-empty">No ratings to summarise yet.</p>
        )}
      </section>

      <div className="reviews-toolbar">
        <Tabs activeTab={status} onChange={handleStatusChange}>
          <TabList>
            {STATUS_TABS.map((tab) => (
              <Tab key={tab.key} value={tab.key}>
                {tab.label}
              </Tab>
            ))}
          </TabList>
        </Tabs>
      </div>

      <div
        className="reviews-panel"
        id={`panel-${status}`}
        role="tabpanel"
        aria-labelledby={`tab-${status}`}
        aria-busy={isPending || undefined}
      >
        {renderReviews()}
      </div>

      {!isPending && !error && !isReportedTab && meta.totalPages > 1 ? (
        <Pagination
          page={page}
          pageCount={meta.totalPages}
          total={meta.total}
          onPageChange={setPage}
        />
      ) : null}

      {isReportedTab ? (
        <p className="reviews-note">
          Reported reviews are resolved on this device from the {REPORTED_SCAN_LIMIT} most recent
          reviews, because the moderation API cannot filter on that status.
        </p>
      ) : null}

      <FormModal
        isOpen={replyDialogOpen}
        onClose={() => { setReplyDialogOpen(false); setReplyText(''); }}
        onSubmit={(e) => { e.preventDefault(); replyMutation.mutate({ id: replyingReviewId, reply: replyText }); }}
        title="Reply to review"
        submitText="Send reply"
        loading={replyMutation.isPending}
        size="md"
      >
        <div className="form-field">
          <label htmlFor="reply-text">Your reply</label>
          <textarea
            id="reply-text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            className="modal-field-textarea"
            placeholder="Write your reply to the customer…"
          />
          <p className="field-hint">
            Your reply is published under the review for every customer to read.
          </p>
        </div>
      </FormModal>
    </div>
  );
}
