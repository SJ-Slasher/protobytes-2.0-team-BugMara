import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReviewDocument extends Document {
  userId: string;
  userName: string;
  stationId: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  response?: {
    text: string;
    respondedAt: Date;
  };
  createdAt: Date;
}

const ReviewSchema = new Schema<IReviewDocument>(
  {
    userId: { type: String, required: true },
    userName: { type: String, default: "" },
    stationId: {
      type: Schema.Types.ObjectId,
      ref: "Station",
      required: true,
      index: true,
    },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
    response: {
      text: String,
      respondedAt: Date,
    },
  },
  { timestamps: true }
);

const Review: Model<IReviewDocument> =
  mongoose.models.Review ||
  mongoose.model<IReviewDocument>("Review", ReviewSchema);

export default Review;
