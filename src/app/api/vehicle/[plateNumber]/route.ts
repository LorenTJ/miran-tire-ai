import { NextResponse } from 'next/server';
import { createVehicleDataLayer, normalizePlateNumber } from '@/lib/vehicle-data';
import { legacyVehicleDataProvider } from '@/lib/vehicles';

const vehicleDataLayer = createVehicleDataLayer([legacyVehicleDataProvider]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ plateNumber: string }> }
) {
  const { plateNumber } = await params;
  
  if (!normalizePlateNumber(plateNumber)) {
    return NextResponse.json({ message: 'Plate number missing' }, { status: 400 });
  }

  const { record } = await vehicleDataLayer.lookup({ plateNumber });

  if (!record) {
    return NextResponse.json({ message: 'Vehicle not found' }, { status: 404 });
  }

  return NextResponse.json({
    plateNumber: record.plateNumber,
    model: record.model,
    year: record.year,
    tireSize: record.frontTireSize,
  });
}
