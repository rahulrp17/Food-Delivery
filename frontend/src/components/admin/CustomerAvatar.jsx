import './CustomerAvatar.css';

const initialsFor = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const toneFor = (value = '') => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash + value.charCodeAt(index)) % 5;
  }
  return hash;
};

export default function CustomerAvatar({ name = '', email = '', size = 'md' }) {
  return (
    <span
      className={`customer-avatar customer-avatar-${size} customer-avatar-tone-${toneFor(
        email || name
      )}`}
      aria-hidden="true"
    >
      {initialsFor(name)}
    </span>
  );
}
