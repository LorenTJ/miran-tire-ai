export type VehicleFuelType =
  | "gasoline"
  | "diesel"
  | "hybrid"
  | "plug-in-hybrid"
  | "electric"
  | "hydrogen"
  | "other";

export type VehicleDataSourceType =
  | "api"
  | "csv"
  | "database"
  | "scraper"
  | "manual-verified"
  | "legacy";

export type VehicleDataConfidenceStatus =
  | "verified"
  | "unverified"
  | "legacy"
  | "unknown";

export type RecommendedPressure = {
  frontPsi: number | null;
  rearPsi: number | null;
  frontBar: number | null;
  rearBar: number | null;
};

export type VehicleDataRecord = {
  plateNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  year: number | null;
  trim: string | null;
  engine: string | null;
  fuelType: VehicleFuelType | null;
  frontTireSize: string | null;
  rearTireSize: string | null;
  loadIndex: string | null;
  speedRating: string | null;
  runflat: boolean | null;
  oeHomologation: string | null;
  wheelSizes: string[] | null;
  recommendedPressure: RecommendedPressure | null;
  source: {
    type: VehicleDataSourceType;
    name: string;
    confidenceStatus: VehicleDataConfidenceStatus;
    verifiedAt: string | null;
  };
};

export type VehicleDataLookupInput = {
  plateNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  year?: number | null;
  trim?: string | null;
};

export type VehicleDataLookupResult = {
  record: VehicleDataRecord | null;
  sourceType: VehicleDataSourceType | null;
};

export type VehicleDataProvider = {
  sourceType: VehicleDataSourceType;
  lookup(input: VehicleDataLookupInput): Promise<VehicleDataRecord | null>;
};

export type LegacyVehicleRecord = {
  plateNumber: string;
  model: string;
  year: number;
  tireSize: string;
};

export function normalizePlateNumber(value: string) {
  return value.replace(/[-\s]/g, "").toLowerCase();
}

export function legacyVehicleToVehicleDataRecord(vehicle: LegacyVehicleRecord): VehicleDataRecord {
  return {
    plateNumber: vehicle.plateNumber,
    manufacturer: null,
    model: vehicle.model,
    year: vehicle.year,
    trim: null,
    engine: null,
    fuelType: null,
    frontTireSize: vehicle.tireSize || null,
    rearTireSize: null,
    loadIndex: null,
    speedRating: null,
    runflat: null,
    oeHomologation: null,
    wheelSizes: null,
    recommendedPressure: null,
    source: {
      type: "legacy",
      name: "src/lib/vehicles.ts",
      confidenceStatus: "legacy",
      verifiedAt: null,
    },
  };
}

export function createLegacyVehicleProvider(records: LegacyVehicleRecord[]): VehicleDataProvider {
  return {
    sourceType: "legacy",
    async lookup(input) {
      if (!input.plateNumber) return null;

      const normalizedInput = normalizePlateNumber(input.plateNumber);
      const match = records.find(
        (vehicle) => normalizePlateNumber(vehicle.plateNumber) === normalizedInput,
      );

      return match ? legacyVehicleToVehicleDataRecord(match) : null;
    },
  };
}

export function createVehicleDataLayer(providers: VehicleDataProvider[]) {
  return {
    async lookup(input: VehicleDataLookupInput): Promise<VehicleDataLookupResult> {
      for (const provider of providers) {
        const record = await provider.lookup(input);

        if (record) {
          return {
            record,
            sourceType: provider.sourceType,
          };
        }
      }

      return {
        record: null,
        sourceType: null,
      };
    },
  };
}
