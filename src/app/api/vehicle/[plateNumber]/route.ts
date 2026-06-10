import { NextResponse } from 'next/server';
import { vehicles } from '../../../../lib/vehicles';

function normalizePlateNumber(value: string) {
  return value.replace(/[-\s]/g, '').toLowerCase();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ plateNumber: string }> }
) {
  const { plateNumber } = await params;
  const normalizedPlateNumber = normalizePlateNumber(plateNumber);
  
  if (!normalizedPlateNumber) {
    return NextResponse.json({ message: 'Plate number missing' }, { status: 400 });
  }

  const match = vehicles.find(
    (vehicle) => normalizePlateNumber(vehicle.plateNumber) === normalizedPlateNumber
  );

  if (!match) {
    return NextResponse.json({ message: 'Vehicle not found' }, { status: 404 });
  }

  return NextResponse.json(match);
}
