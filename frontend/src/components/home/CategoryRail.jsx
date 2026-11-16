import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../ui/Icon";
import Skeleton from "../ui/Skeleton";
import SmartImage from "../ui/SmartImage";
import styles from "./CategoryRail.module.css";

const categoryMeta = {
  cake: { icon: "sparkles", caption: "Celebration slices", tone: "tone1" },
  chicken: {
    icon: "chef-hat",
    caption: "Tender and juicy",
    tone: "tone1",
    badge: "Chef's pick",
    featured: true,
  },
  deserts: { icon: "star-filled", caption: "Something sweet", tone: "tone2" },
  noodles: { icon: "chef-hat", caption: "Slurp-worthy bowls", tone: "tone3" },
  pasta: { icon: "leaf", caption: "Comfort, twirled", tone: "tone4" },
  "pure-veg": { icon: "leaf", caption: "Plant-forward plates", tone: "tone3" },
  rolls: { icon: "rotate-ccw", caption: "Handheld favourites", tone: "tone1" },
  salad: { icon: "leaf", caption: "Crisp and fresh", tone: "tone3" },
  sandwich: { icon: "chef-hat", caption: "Properly stacked", tone: "tone2" },
};

const fallbackMeta = { icon: "chef-hat", caption: "Fresh from the kitchen", tone: "tone4" };
const tones = ["tone1", "tone2", "tone3", "tone4"];

const CategoryRail = ({ categories = [], loading = false }) => {
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const updateEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    setEdges({
      start: track.scrollLeft <= 4,
      end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    updateEdges();
    const track = trackRef.current;
    if (!track) return undefined;

    track.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);

    return () => {
      track.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges, categories.length]);

  const scroll = (direction) => {
    const track = trackRef.current;
    if (!track) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({
      left: direction * Math.max(280, track.clientWidth * 0.72),
      behavior: reduced ? "auto" : "smooth",
    });
  };

  const totalDishes = categories.reduce(
    (total, item) => total + (item.productCount || 0),
    0
  );

  return (
    <section className={styles.section} aria-labelledby="categories-title">
      <div className="container">
        <div className={styles.header}>
          <div>
            <span className="eyebrow">Browse the kitchen</span>
            <h2 id="categories-title" className={styles.title}>
              What are you in the mood for?
            </h2>
            <p className={styles.description}>
              Every craving has a corner. Pick a lane and we will take it from there.
            </p>
          </div>

          <div className={styles.controls}>
            <button
              type="button"
              className={styles.control}
              onClick={() => scroll(-1)}
              disabled={edges.start}
              aria-label="Scroll categories left"
            >
              <Icon name="chevron-left" size={20} />
            </button>
            <button
              type="button"
              className={styles.control}
              onClick={() => scroll(1)}
              disabled={edges.end}
              aria-label="Scroll categories right"
            >
              <Icon name="chevron-right" size={20} />
            </button>
          </div>
        </div>

        <div className={styles.track} ref={trackRef} aria-busy={loading || undefined}>
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className={styles.skeleton} height="248px" />
              ))
            : categories.length === 0
              ? (
                <p className={styles.empty}>
                  No categories are published yet. The kitchen is still writing the
                  menu.
                </p>
              )
              : categories.map((category, index) => {
                const meta = categoryMeta[category.slug] || fallbackMeta;
                const tone = meta.tone || tones[index % tones.length];
                const hasImage = Boolean(category.image);
                const countLabel =
                  category.productCount > 0
                    ? `${category.productCount} ${category.productCount === 1 ? "dish" : "dishes"}`
                    : "";
                const isLead = index === 0;

                return (
                  <Link
                    key={category.id || category._id || category.slug}
                    to={`/menu?category=${encodeURIComponent(category.slug)}`}
                    className={`${styles.card} ${hasImage ? styles.hasImage : styles[tone]} ${
                      isLead ? styles.cardLead : ""
                    }`.trim()}
                  >
                    {hasImage ? (
                      <SmartImage
                        src={category.image}
                        alt=""
                        ratio="auto"
                        className={styles.media}
                        imageClassName={styles.mediaImage}
                      />
                    ) : (
                      <span className={styles.art} aria-hidden="true">
                        <Icon name={meta.icon} size={96} />
                      </span>
                    )}
                    {hasImage && <span className={styles.scrim} aria-hidden="true" />}
                    {hasImage && <span className={styles.shine} aria-hidden="true" />}

                    <span className={styles.top}>
                      {meta.featured ? (
                        <span className={`${styles.pill} ${styles.pillFeatured}`}>
                          <Icon name="star-filled" size={11} />
                          {meta.badge}
                        </span>
                      ) : countLabel ? (
                        <span className={styles.pill}>{countLabel}</span>
                      ) : (
                        <span />
                      )}
                      <span className={styles.arrow}>
                        <Icon name="arrow-up-right" size={16} />
                      </span>
                    </span>

                    <span className={styles.body}>
                      <span className={styles.index} aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className={styles.name}>{category.name}</span>
                      <span className={styles.caption}>{meta.caption}</span>
                      <span className={styles.ctaRow}>
                        <span className={styles.rule} aria-hidden="true" />
                        <span className={styles.cta}>Browse</span>
                      </span>
                    </span>
                  </Link>
                );
              })}

          {!loading && categories.length > 0 ? (
            <Link to="/menu" className={`${styles.card} ${styles.cardAll}`}>
              <span className={styles.body}>
                <span className={styles.index} aria-hidden="true">
                  {String(categories.length + 1).padStart(2, "0")}
                </span>
                <span className={styles.name}>Everything else</span>
                <span className={styles.caption}>
                  {totalDishes} {totalDishes === 1 ? "dish" : "dishes"} on the menu
                </span>
                <span className={styles.ctaRow}>
                  <span className={styles.rule} aria-hidden="true" />
                  <span className={styles.cta}>See the full menu</span>
                </span>
              </span>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default CategoryRail;
