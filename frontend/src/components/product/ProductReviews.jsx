import { useQuery } from "@tanstack/react-query";
import { reviewsApi } from "../../api/reviews.api";
import { formatDate } from "../../lib/format";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import Icon from "../ui/Icon";
import Rating from "../ui/Rating";
import { Skeleton } from "../loading";
import WriteReview from "./WriteReview";
import "./ProductReviews.css";

const STARS = [5, 4, 3, 2, 1];

/**
 * Customer reviews for a dish.
 *
 * Food ordering platforms live or die on social proof, so this shows the
 * average rating, a distribution histogram and the most recent approved
 * reviews. Reviews are moderated server-side (only `approved` ones are
 * returned), so nothing here needs a pending state.
 */
export default function ProductReviews({ productId, product, limit = 6 }) {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["product-reviews", productId, limit],
    queryFn: () => reviewsApi.listProductReviews(productId, { page: 1, limit }),
    enabled: Boolean(productId),
    staleTime: 60_000,
  });

  const reviews = data?.items || [];
  const meta = data?.meta || {};
  const total = meta.total || 0;
  const average = meta.ratingAvg || 0;

  // The histogram is derived from the ratings on this page of reviews.
  const counts = STARS.map((star) => ({
    star,
    count: reviews.filter((review) => review.rating === star).length,
  }));
  const maxCount = Math.max(1, ...counts.map((entry) => entry.count));

  if (isPending) {
    return (
      <section className="product-reviews" aria-busy="true">
        <div className="product-reviews-head">
          <span className="skeleton" style={{ width: 180, height: 28 }} />
          <span className="skeleton" style={{ width: 120, height: 16 }} />
        </div>
        <div className="product-reviews-body">
          <div className="product-reviews-summary">
            <span className="skeleton" style={{ width: 96, height: 96, borderRadius: "50%" }} />
          </div>
          <div className="product-reviews-list">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="product-review-skeleton" key={index}>
                <span className="skeleton" style={{ width: "30%", height: 14 }} />
                <span className="skeleton" style={{ width: "92%", height: 12 }} />
                <span className="skeleton" style={{ width: "64%", height: 12 }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="product-reviews">
        <ErrorState
          title="We could not load the reviews"
          description={error?.message || "Please try again in a moment."}
          onRetry={() => refetch()}
        />
      </section>
    );
  }

  return (
    <section className="product-reviews" aria-labelledby="product-reviews-heading">
      <header className="product-reviews-head">
        <h2 id="product-reviews-heading">What diners are saying</h2>
        {total > 0 ? (
          <span className="product-reviews-total">
            {total} {total === 1 ? "review" : "reviews"}
          </span>
        ) : null}
      </header>

      {total === 0 ? (
        <EmptyState
          icon="star"
          title="No reviews yet"
          description="Be the first to tell other diners what you think of this dish."
        />
      ) : (
        <div className="product-reviews-body">
          <div className="product-reviews-summary">
            <span className="product-reviews-average">{average.toFixed(1)}</span>
            <Rating value={average} count={total} />
            <span className="product-reviews-based">Based on {total} ratings</span>

            <ul className="product-reviews-histogram">
              {counts.map(({ star, count }) => (
                <li key={star} className="product-reviews-histogram-row">
                  <span className="product-reviews-histogram-label">{star} ★</span>
                  <span className="product-reviews-histogram-track">
                    <span
                      className="product-reviews-histogram-fill"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </span>
                  <span className="product-reviews-histogram-count">{count}</span>
                </li>
              ))}
            </ul>
          </div>

          <ul className="product-reviews-list">
            {reviews.map((review) => (
              <li key={review.id} className="product-review">
                <div className="product-review-head">
                  <span className="product-review-avatar" aria-hidden="true">
                    {(review.author?.name || "D").trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="product-review-by">
                    <strong>{review.author?.name || "Foodie diner"}</strong>
                    <span>{formatDate(review.createdAt)}</span>
                  </span>
                  <span className="product-review-rating">
                    <Rating value={review.rating} />
                  </span>
                </div>

                {review.title ? <p className="product-review-title">{review.title}</p> : null}
                {review.body ? <p className="product-review-body">{review.body}</p> : null}

                {review.adminReply?.text ? (
                  <div className="product-review-reply">
                    <span className="product-review-reply-badge">
                      <Icon name="shield-check" size={13} />
                      Foodie
                    </span>
                    <p>{review.adminReply.text}</p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {product ? <WriteReview product={product} /> : null}
    </section>
  );
}
