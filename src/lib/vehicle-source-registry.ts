import { createVehicleDataLayer, type VehicleDataProvider } from "@/lib/vehicle-data";
import { legacyVehicleDataProvider } from "@/lib/vehicles";

export const vehicleDataProviders: VehicleDataProvider[] = [
  legacyVehicleDataProvider,
];

export const vehicleDataLayer = createVehicleDataLayer(vehicleDataProviders);
