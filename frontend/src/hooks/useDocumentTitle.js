import { useEffect } from "react";

export const useDocumentTitle = (title) => {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · Foodie` : "Foodie — Fresh food, delivered";

    return () => {
      document.title = previous;
    };
  }, [title]);
};
