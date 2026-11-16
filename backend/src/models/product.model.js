import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    shortDescription: { type: String, trim: true, default: "", maxlength: 160 },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "category",
      required: true,
      index: true,
    },
    category: { type: String, trim: true, default: "" },
    pricePaise: { type: Number, required: true, min: 0 },
    compareAtPricePaise: { type: Number, default: null, min: 0 },
    image: { type: String, trim: true, default: "" },
    gallery: [{ type: String, trim: true }],
    isVeg: { type: Boolean, default: false },
    allergens: [{ type: String, trim: true }],
    ingredients: [{ type: String, trim: true }],
    nutrition: {
      calories: { type: Number, default: null },
      proteinG: { type: Number, default: null },
      carbsG: { type: Number, default: null },
      fatG: { type: Number, default: null },
    },
    prepTimeMinutes: { type: Number, default: 25, min: 1, max: 240 },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    isAvailable: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isBestseller: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    tags: [{ type: String, trim: true, lowercase: true }],
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = String(ret._id);
        delete ret.__v;
        delete ret.deletedAt;
        return ret;
      },
    },
  }
);

productSchema.index({ categoryId: 1, isAvailable: 1, deletedAt: 1 });
productSchema.index({ pricePaise: 1 });
productSchema.index({ isFeatured: 1, isBestseller: 1, isNewArrival: 1 });
productSchema.index({ name: "text", description: "text", tags: "text" });

const Product = mongoose.models.food || mongoose.model("food", productSchema);

export default Product;
