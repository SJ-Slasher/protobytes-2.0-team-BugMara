import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChargingPort {
  _id?: mongoose.Types.ObjectId;
  portNumber: string;
  connectorType: string;
  powerOutput: string;
  chargerType: string;
  status: "available" | "occupied" | "maintenance" | "reserved";
  currentBookingId?: mongoose.Types.ObjectId;
}

export interface IStationDocument extends Document {
  name: string;
  adminId?: string;
  location: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    city: string;
    province: string;
  };
  telephone: string;
  vehicleTypes: string[];
  operatingHours: {
    open: string;
    close: string;
  };
  chargingPorts: IChargingPort[];
  pricing: {
    perHour: number;
  };
  amenities: string[];
  photos: string[];
  rating: number;
  totalReviews: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChargingPortSchema = new Schema<IChargingPort>({
  portNumber: { type: String, required: true },
  connectorType: { type: String, required: true },
  powerOutput: { type: String, default: "" },
  chargerType: { type: String, default: "" },
  status: {
    type: String,
    enum: ["available", "occupied", "maintenance", "reserved"],
    default: "available",
  },
  currentBookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
});

const StationSchema = new Schema<IStationDocument>(
  {
    name: { type: String, required: true },
    adminId: { type: String, index: true },
    location: {
      address: { type: String, required: true },
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
      city: { type: String, required: true },
      province: { type: String, default: "" },
    },
    telephone: { type: String, default: "" },
    vehicleTypes: [{ type: String }],
    operatingHours: {
      open: { type: String, default: "00:00" },
      close: { type: String, default: "23:59" },
    },
    chargingPorts: [ChargingPortSchema],
    pricing: {
      perHour: { type: Number, default: 0 },
    },
    amenities: [{ type: String }],
    photos: [{ type: String }],
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

StationSchema.index({ "location.city": 1 });
StationSchema.index({ "location.coordinates.lat": 1, "location.coordinates.lng": 1 });

const Station: Model<IStationDocument> =
  mongoose.models.Station ||
  mongoose.model<IStationDocument>("Station", StationSchema);

export default Station;
