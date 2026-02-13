import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserDocument extends Document {
  clerkId: string;
  email: string;
  name: string;
  phone?: string;
  role: "user" | "admin" | "superadmin";
  vehicleInfo?: {
    make: string;
    model: string;
    batteryCapacity: number;
    connectorType: string;
  };
  favoriteStations: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String },
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
    vehicleInfo: {
      make: String,
      model: String,
      batteryCapacity: Number,
      connectorType: String,
    },
    favoriteStations: [{ type: Schema.Types.ObjectId, ref: "Station" }],
  },
  { timestamps: true }
);

const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>("User", UserSchema);

export default User;
