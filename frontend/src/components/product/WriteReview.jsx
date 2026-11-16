import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "../../api/orders.api";
import { reviewsApi } from "../../api/reviews.api";
import { useAuth } from "../../hooks/useAuth";
import {
  focusFirstInvalidField,
  getErrorMessage,
  parseForm,
  reviewFormSchema,
} from "../../lib/validation/forms";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import "./WriteReview.css";

const RATING_LABELS = {
  1: "Poor",
  2: "Not great",
  3: "Decent",
  4: "Really good",
  5: "Loved it",
};

/**
 * "Write a review" for a dish.
 *
 * The backend only accepts a review from a customer who has actually
 * received the item, so eligibility is worked out on the client from the
 * customer's own delivered orders. When the customer is not eligible the
 * panel explains why instead of silently hiding the form.
 */
export default function WriteReview({ product }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // A delivered order containing this dish is what makes a review possible.
  const { data: ordersData, isPending: ordersPending } = useQuery({
    queryKey: ["orders", "eligibility", product?.id],
    queryFn: () => ordersApi.list({ limit: 50 }),
    enabled: Boolean(isAuthenticated && product?.id),
    staleTime: 60_000,
    retry: 0,
  });

  const eligibleOrder = useMemo(() => {
    const orders = ordersData?.items || ordersData?.orders || ordersData || [];
    if (!Array.isArray(orders)) return null;

    return (
      orders.find((order) => {
        const delivered = String(order.status || "").toLowerCase() === "delivered";
        if (!delivered) return false;
        return (order.items || []).some(
          (item) => String(item.productId) === String(product?.id)
        );
      }) || null
    );
  }, [ordersData, product?.id]);

  const mutation = useMutation({
    mutationFn: (payload) => reviewsApi.create({ productId: product.id, ...payload }),
    onSuccess: () => {
      setRating(0);
      setTitle("");
      setBody("");
      setErrors({});
      setSubmitError("");
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["product-reviews", product.id] });
    },
    onError: (error) => {
      setSubmitError(
        getErrorMessage(error, "We could not publish your review. Please try again.")
      );
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="write-review">
        <h3 className="write-review-heading">Tried this dish?</h3>
        <p className="write-review-note">
          Sign in to leave a review and help other diners decide.
        </p>
        <Button to="/login" variant="secondary" size="sm">
          Sign in to review
        </Button>
      </div>
    );
  }

  if (ordersPending) {
    return (
      <div className="write-review" aria-busy="true">
        <span className="skeleton" style={{ width: 180, height: 20 }} />
        <span className="skeleton" style={{ width: "70%", height: 14, marginTop: 8 }} />
      </div>
    );
  }

  if (!eligibleOrder) {
    return (
      <div className="write-review write-review--locked">
        <span className="write-review-locked-icon">
          <Icon name="star" size={20} />
        </span>
        <div>
          <h3 className="write-review-heading">Reviews open after delivery</h3>
          <p className="write-review-note">
            Once this dish arrives, you can rate it and share what you thought.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    const parsed = parseForm(reviewFormSchema, { rating, title, body });

    if (!parsed.success) {
      setErrors(parsed.errors);
      focusFirstInvalidField();
      return;
    }

    setErrors({});
    setSubmitError("");
    mutation.mutate({
      rating: parsed.data.rating,
      title: parsed.data.title || "",
      body: parsed.data.body || "",
    });
  };

  const shown = hovered || rating;

  return (
    <form className="write-review" onSubmit={handleSubmit} noValidate>
      <h3 className="write-review-heading">Rate this dish</h3>

      {submitted ? (
        <div className="write-review-success" role="status">
          <Icon name="check" size={17} aria-hidden="true" />
          <span>
            Thanks — your review is with the team. It will appear here once it is
            approved.
          </span>
        </div>
      ) : null}

      <div
        className="write-review-stars"
        role="radiogroup"
        aria-label="Your rating"
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} star${value === 1 ? "" : "s"} — ${RATING_LABELS[value]}`}
            className={`write-review-star ${value <= shown ? "is-active" : ""}`.trim()}
            onMouseEnter={() => setHovered(value)}
            onFocus={() => setHovered(value)}
            onBlur={() => setHovered(0)}
            onClick={() => {
              setRating(value);
              setErrors((prev) => ({ ...prev, rating: undefined }));
            }}
          >
            <Icon name="star-filled" size={26} />
          </button>
        ))}
        {shown > 0 ? (
          <span className="write-review-rating-label" aria-live="polite">
            {RATING_LABELS[shown]}
          </span>
        ) : null}
      </div>

      {errors.rating ? (
        <p className="write-review-error" role="alert">
          {errors.rating}
        </p>
      ) : null}

      <label className="write-review-label" htmlFor="review-title">
        Headline <span>(optional)</span>
      </label>
      <input
        id="review-title"
        name="title"
        type="text"
        className={`write-review-input ${errors.title ? "has-error" : ""}`.trim()}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Sum it up in a few words"
        maxLength={120}
        aria-invalid={errors.title ? "true" : undefined}
      />
      {errors.title ? (
        <p className="write-review-error" role="alert">
          {errors.title}
        </p>
      ) : null}

      <label className="write-review-label" htmlFor="review-body">
        Your review <span>(optional)</span>
      </label>
      <textarea
        id="review-body"
        name="body"
        className={`write-review-input write-review-textarea ${errors.body ? "has-error" : ""}`.trim()}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="How was the taste, the portion, the packaging?"
        rows={4}
        maxLength={2000}
        aria-invalid={errors.body ? "true" : undefined}
      />
      {errors.body ? (
        <p className="write-review-error" role="alert">
          {errors.body}
        </p>
      ) : null}

      {submitError ? (
        <div className="write-review-error write-review-error--block" role="alert">
          <Icon name="alert-circle" size={16} aria-hidden="true" />
          <span>{submitError}</span>
        </div>
      ) : null}

      <div className="write-review-actions">
        <Button type="submit" loading={mutation.isPending}>
          Publish review
        </Button>
        <span className="write-review-hint">
          Reviews are checked by the team before they appear.
        </span>
      </div>
    </form>
  );
}
