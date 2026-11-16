import { useEffect, useRef, useState } from "react";

const reducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

export function useCountUp(target, { duration = 600 } = {}) {
  const numericTarget = Number.isFinite(target) ? target : 0;
  const [value, setValue] = useState(() =>
    reducedMotion() ? numericTarget : 0
  );
  const fromRef = useRef(reducedMotion() ? numericTarget : 0);

  useEffect(() => {
    const from = fromRef.current;
    if (reducedMotion() || from === numericTarget) {
      fromRef.current = numericTarget;
      setValue(numericTarget);
      return undefined;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(from + (numericTarget - from) * easeOutCubic(progress)));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = numericTarget;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [numericTarget, duration]);

  return value;
}

export default useCountUp;
