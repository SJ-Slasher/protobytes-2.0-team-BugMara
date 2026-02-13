import mongoose from "mongoose";
import fs from "fs";
import path from "path";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/urja-station";

interface RawStation {
  name: string;
  city: string;
  province: string;
  address: string;
  telephone: string;
  time?: string;
  type: string[];
  latitude: string;
  longitude: string;
  plugs?: Array<{
    plug: string;
    power: string;
    type: string;
  }>;
  amenities?: string[];
}

const ChargingPortSchema = new mongoose.Schema({
  portNumber: String,
  connectorType: String,
  powerOutput: String,
  chargerType: String,
  status: {
    type: String,
    enum: ["available", "occupied", "maintenance", "reserved"],
    default: "available",
  },
  currentBookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
});

const StationSchema = new mongoose.Schema(
  {
    name: String,
    adminId: String,
    location: {
      address: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
      city: String,
      province: String,
    },
    telephone: String,
    vehicleTypes: [String],
    operatingHours: {
      open: String,
      close: String,
    },
    chargingPorts: [ChargingPortSchema],
    pricing: {
      perHour: Number,
      depositAmount: Number,
    },
    amenities: [String],
    photos: [String],
    rating: Number,
    totalReviews: Number,
    isActive: Boolean,
  },
  { timestamps: true }
);

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const Station = mongoose.models.Station || mongoose.model("Station", StationSchema);

  // Read station data
  const dataPath = path.join(process.cwd(), "data", "stations.json");
  const rawData = fs.readFileSync(dataPath, "utf-8");
  const stations: RawStation[] = JSON.parse(rawData);

  console.log(`Found ${stations.length} stations in data file`);

  // Clear existing stations
  await Station.deleteMany({});
  console.log("Cleared existing stations");

  // Transform and insert stations
  const transformedStations = stations.map((s, index) => {
    const ports = (s.plugs || []).map((plug, pIndex) => ({
      portNumber: `P${index + 1}-${pIndex + 1}`,
      connectorType: plug.plug,
      powerOutput: plug.power || "N/A",
      chargerType: plug.type || "N/A",
      status: "available",
    }));

    // If no plugs defined, create a default port
    if (ports.length === 0) {
      ports.push({
        portNumber: `P${index + 1}-1`,
        connectorType: "type2",
        powerOutput: "7.2Kw",
        chargerType: "AC",
        status: "available",
      });
    }

    const isComingSoon = s.name.includes("Coming Soon");

    return {
      name: s.name.replace(" (Coming Soon)", ""),
      location: {
        address: s.address,
        coordinates: {
          lat: parseFloat(s.latitude),
          lng: parseFloat(s.longitude),
        },
        city: s.city,
        province: s.province || "",
      },
      telephone: s.telephone || "",
      vehicleTypes: s.type || ["car"],
      operatingHours: {
        open: "06:00",
        close: "22:00",
      },
      chargingPorts: ports,
      pricing: {
        perHour: 150,
        depositAmount: 500,
      },
      amenities: s.amenities || [],
      photos: [],
      rating: 0,
      totalReviews: 0,
      isActive: !isComingSoon,
    };
  });

  const result = await Station.insertMany(transformedStations);
  console.log(`Successfully seeded ${result.length} stations`);

  // Print summary
  const cities = [...new Set(transformedStations.map((s) => s.location.city))];
  console.log(`\nCities covered: ${cities.length}`);
  cities.forEach((city) => {
    const count = transformedStations.filter(
      (s) => s.location.city === city
    ).length;
    console.log(`  ${city}: ${count} stations`);
  });

  const activeCount = transformedStations.filter((s) => s.isActive).length;
  const comingSoonCount = transformedStations.filter((s) => !s.isActive).length;
  console.log(`\nActive: ${activeCount}, Coming Soon: ${comingSoonCount}`);

  await mongoose.disconnect();
  console.log("\nDone! Database disconnected.");
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
