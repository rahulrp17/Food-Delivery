import { useState } from 'react';
import Icon from '../ui/Icon';
import './FoodThumb.css';

export default function FoodThumb({ src, alt = '', size = 'md', className = '' }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span className={`food-thumb food-thumb-${size} ${className}`.trim()}>
      {showImage ? (
        <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        <Icon name="chef-hat" size={size === 'sm' ? 14 : 18} label="" aria-hidden="true" />
      )}
    </span>
  );
}
