import { createElement, useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const Reveal = ({ as = "div", className = "", delay = 0, children, ...rest }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (visible || !ref.current) return undefined;

    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);

  return createElement(
    as,
    {
      ref,
      className: `reveal ${className}`.trim(),
      "data-visible": visible,
      style: delay ? { animationDelay: `${delay}ms` } : undefined,
      ...rest,
    },
    children
  );
};

export default Reveal;
