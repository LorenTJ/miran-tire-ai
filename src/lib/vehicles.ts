import { createLegacyVehicleProvider } from "@/lib/vehicle-data";

export type Vehicle = {
  plateNumber: string;
  model: string;
  year: number;
  tireSize: string;
};

export const vehicles: Vehicle[] = [
  {
    plateNumber: '854-49-802',
    model: 'Tesla Model 3',
    year: 2022,
    tireSize: '235/45R18',
  },
  {
    plateNumber: 'ABC123',
    model: 'Toyota Camry',
    year: 2018,
    tireSize: '215/55R17',
  },
  {
    plateNumber: 'XYZ789',
    model: 'Honda Civic',
    year: 2020,
    tireSize: '205/55R16',
  },
  {
    plateNumber: 'LMN456',
    model: 'Ford F-150',
    year: 2019,
    tireSize: '275/65R18',
  },
];

export const legacyVehicleDataProvider = createLegacyVehicleProvider(vehicles);
