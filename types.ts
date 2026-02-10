
export type UserRole = 'ops' | 'tour_manager' | 'owner' | 'driver';

export interface User {
  uid: string;
  username: string;
  name: string;
  role: UserRole;
  organisationId: string;
  pin: string;
  token: string;
  phoneNumber?: string;
  email?: string;
}

export interface Driver {
  uid: string;
  name: string;
  organisationId?: string;
  passportNumber?: string;
  pdpNumber?: string;
  passportExpiry?: string;
  phoneNumber?: string;
}

export enum TourStatus {
  PLANNED = 'planned',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled'
}

export enum VehicleStatus {
  READY = 'ready',
  MAINTENANCE_REQUIRED = 'maintenance_required',
  ON_TOUR = 'on_tour',
  OUT_OF_SERVICE = 'out_of_service',
  ISSUE = 'issue'
}

export enum FleetHealth {
  GREEN = 'green',
  AMBER = 'amber',
  RED = 'red'
}

export enum ExpenseStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface Float {
  id: string;
  amount: number;
  originalAmount: number;
  remainingAmount: number;
  active: boolean;
  driverId: string;
  driverName: string;
  tourId?: string;
  status: 'open' | 'closed' | string;
  issuedAt: string;
  createdAt?: string;
  message?: string;
}

export interface Vehicle {
  id: string;
  model: string;
  licenceNumber: string;
  modelYear: number;
  trailerId?: string;
  trailerModel?: string;
  trailerLicence?: string;
  odometer: number;
  lastServiced: string;
  nextService: string;
  vehicleMaintenanceIntervalsKm?: {
    tyres: number;
    alignmentBalancing: number;
    service: number;
    turboExchange: number;
    handbrakeShoes: number;
    clutchReplacement: number;
  };
  status: VehicleStatus | string;
  organisationId?: string;
  currentOdometer: number;
  lastServiceOdo: number;
  nextServiceOdo: number;
  lastAlignmentOdo: number;
  servicePartner?: string;
  currentDriverId?: string;
  currentDriverName?: string;
  assignedByName?: string;
  assignedById?: string;
  latest_odometer?: number;
  sortOrder?: number;
  createdAt?: string;
}

export interface Trailer {
  id: string;
  model: string;
  licenceNumber: string;
  modelYear: number;
  status: VehicleStatus | string;
  organisationId?: string;
  createdAt?: string;
}

export interface Tour {
  id: string;
  tour_reference: string;
  tour_name: string;
  supplier: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleName: string;
  startDate: string;
  endDate: string;
  status: TourStatus;
  estimated_km: number;
  trailer_required: boolean;
  pax?: number;
  itinerary?: string;
  instructions?: string;
  notes?: string;
  createdAt?: string;
  createdBy?: string;
  maintenanceIndicators?: {
    tyres: {
      color: 'green' | 'amber' | 'red';
      remainingKm: number;
      cumulativeKm: number;
    };
    wheels: {
      color: 'green' | 'amber' | 'red';
      remainingKm: number;
      cumulativeKm: number;
    };
    service: {
      color: 'green' | 'amber' | 'red';
      remainingKm: number;
      cumulativeKm: number;
    };
    brakes: {
      color: 'green' | 'amber' | 'red';
      remainingKm: number;
      cumulativeKm: number;
    };
  };
  // Backward compatibility
  serviceIndicator?: {
    color: 'green' | 'amber' | 'red';
    remainingKm: number;
    cumulativeKm: number;
  };
  brakeIndicator?: {
    color: 'green' | 'amber' | 'red';
    remainingKm: number;
    cumulativeKm: number;
  };
}

export enum IssueStatus {
  REPORTED = 'reported',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  DONE = 'done'
}

export enum IssueSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface Issue {
  id: string;
  vehicleId: string;
  vehicleName: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  imageUrl?: string;
  reportedAt: string;
}

export interface Expense {
  id: string;
  amount: number;
  amountCents?: number;
  category: string;
  description: string;
  status: ExpenseStatus | string;
  receiptUrl?: string;
  floatId?: string;
  tourId?: string;
  vehicleLicence?: string;
  trailerLicence?: string;
  driverName?: string;
  createdAt: string;
}

export interface Inspection {
  id: string;
  type: 'DAILY' | 'PRE_TOUR' | 'POST_TOUR';
  vehicleId: string;
  driverId: string;
  tourId?: string;
  timestamp: string;
  odometer: number;
  tyreTreads: {
    lf: number;
    rf: number;
    lri: number;
    lro: number;
    rri: number;
    rro: number;
  };
  results: Record<string, any>;
  imageUrls: string[];
}