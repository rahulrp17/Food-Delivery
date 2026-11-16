import "./RouteFallback.css";

const RouteFallback = () => (
  <div className="route-fallback" role="status" aria-label="Loading page">
    <span className="route-fallback-spinner" aria-hidden="true" />
  </div>
);

export default RouteFallback;
