export const slugify = (input) =>
  String(input)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";

export const uniqueSlug = async (Model, base, excludeId) => {
  const root = slugify(base);
  let candidate = root;
  let counter = 2;

  const filter = (slug) => {
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    return query;
  };

  while (await Model.exists(filter(candidate))) {
    candidate = `${root}-${counter}`;
    counter += 1;
  }

  return candidate;
};
