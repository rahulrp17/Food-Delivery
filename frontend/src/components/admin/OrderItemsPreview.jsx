import FoodThumb from './FoodThumb';
import './OrderItemsPreview.css';

export default function OrderItemsPreview({ items = [], max = 3, showNames = false }) {
  if (!items.length) {
    return <span className="order-items-empty">No items</span>;
  }

  const visible = items.slice(0, max);
  const remaining = items.length - visible.length;

  return (
    <div className={`order-items-preview${showNames ? ' with-names' : ''}`}>
      <div className="order-items-thumbs">
        {visible.map((item, index) => (
          <FoodThumb
            key={`${item.productId || item.name}-${index}`}
            src={item.imageUrl}
            alt={item.name ? `Food: ${item.name}` : ''}
            size="sm"
            className="order-items-thumb"
          />
        ))}
        {remaining > 0 && (
          <span className="order-items-more" aria-label={`${remaining} more items`}>
            +{remaining}
          </span>
        )}
      </div>
      {showNames && (
        <span className="order-items-text">
          <strong>{visible[0]?.name || 'Item'}</strong>
          <span>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </span>
      )}
    </div>
  );
}
