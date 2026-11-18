import { ProductCardSkeleton } from "../loading";
import "./HomePageSkeleton.css";

const HomePageSkeleton = () => (
  <div className="home-skeleton" aria-busy="true" aria-label="Loading the home page">
    <section className="home-skeleton-hero">
      <div className="home-skeleton-copy">
        <span className="skeleton hsk-eyebrow" />
        <span className="skeleton hsk-title" />
        <span className="skeleton hsk-title hsk-title-short" />
        <span className="skeleton hsk-line" />
        <span className="skeleton hsk-line hsk-line-short" />
        <div className="hsk-actions">
          <span className="skeleton hsk-cta" />
          <span className="skeleton hsk-cta hsk-cta-ghost" />
        </div>
      </div>
      <span className="skeleton home-skeleton-media" />
    </section>

    {[0, 1].map((rail) => (
      <section className="home-skeleton-rail" key={rail}>
        <div className="hsk-heading">
          <span className="skeleton hsk-heading-line" />
          <span className="skeleton hsk-heading-chip" />
        </div>
        <div className="home-skeleton-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </section>
    ))}
  </div>
);

export default HomePageSkeleton;
