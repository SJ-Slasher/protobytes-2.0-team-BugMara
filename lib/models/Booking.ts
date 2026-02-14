import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBookingDocument extends Document {
  userId: string;
  userName: string;
  userEmail: string;
  stationId: mongoose.Types.ObjectId | string;
  portId: mongoose.Types.ObjectId | string;
  startTime: Date;
  estimatedDuration: number;
  endTime: Date;
  status: "pending" | "confirmed" | "active" | "completed" | "cancelled" | "no-show";
  source: "online" | "walk-in-qr" | "walk-in-manual";
  qrCode?: string;
  userLocation?: {
    lat: number;
    lng: number;
  };
  eta?: {
    durationMinutes: number;
    distanceKm: number;
    updatedAt: Date;
  };
  khaltiPidx?: string;
  amountPaid?: number;
  paymentMethod?: "khalti" | "cash" | "other";
  customerName?: string;
  customerPhone?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBookingDocument>(
  {
    userId: { type: String, required: true, index: true },
    userName: { type: String, default: "" },
    userEmail: { type: String, default: "" },
    stationId: {
      type: Schema.Types.Mixed,
      required: true,
      index: true,
    },
    portId: { type: Schema.Types.Mixed, required: true },
    startTime: { type: Date, required: true },
    estimatedDuration: { type: Number, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "active", "completed", "cancelled", "no-show"],
      default: "pending",
      index: true,
    },
    qrCode: { type: String },
    userLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
    eta: {
      durationMinutes: { type: Number },
      distanceKm: { type: Number },
      updatedAt: { type: Date },
    },
    khaltiPidx: { type: String, index: true },
    amountPaid: { type: Number, default: 0 },
    source: {
      type: String,
      enum: ["online", "walk-in-qr", "walk-in-manual"],
      default: "online",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["khalti", "cash", "other"],
      default: "khalti",
    },
    customerName: { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    vehicleNumber: { type: String, default: "" },
    vehicleType: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

BookingSchema.index({ startTime: 1, endTime: 1 });
BookingSchema.index({ stationId: 1, portId: 1, startTime: 1 });

const Booking: Model<IBookingDocument> =
  mongoose.models.Booking ||
  mongoose.model<IBookingDocument>("Booking", BookingSchema);

export default Booking;
