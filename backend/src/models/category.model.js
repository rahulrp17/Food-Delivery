import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 60 },
    slug: { type: String, required: true, trim: true, unique: true, lowercase: true, index: true },
    description: { type: String, trim: true, default: "", maxlength: 240 },
    image: { type: String, trim: true, default: "" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
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

categorySchema.index({ isActive: 1, sortOrder: 1 });

const Category = mongoose.models.category || mongoose.model("category", categorySchema);

export default Category;
