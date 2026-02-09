
import { Tour, Issue, Expense, Float, User, TourStatus, IssueStatus, IssueSeverity, ExpenseStatus, Vehicle, VehicleStatus, Driver } from '../types.ts';

export const mockUsers: User[] = [
  { 
    uid: 'ops1', 
    name: 'John Ops', 
    username: 'ops1', 
    role: 'ops', 
    organisationId: 'org1', 
    pin: '1111', 
    token: 'mock-token-ops' 
  },
  { 
    uid: 'tm1', 
    name: 'Sarah Manager', 
    username: 'tm1', 
    role: 'tour_manager', 
    organisationId: 'org1', 
    pin: '2222', 
    token: 'mock-token-tm' 
  },
  { 
    uid: 'owner1', 
    name: 'Mike Owner', 
    username: 'owner1', 
    role: 'owner', 
    organisationId: 'org1', 
    pin: '3333', 
    token: 'mock-token-owner' 
  },
  { 
    uid: 'maint1', 
    name: 'Dave Mechanic', 
    username: 'maint1', 
    // Fix: Changed 'maintenance' to 'ops' to match UserRole type
    role: 'ops', 
    organisationId: 'org1', 
    pin: '4444', 
    token: 'mock-token-maint' 
  },
];

export const mockDrivers: Driver[] = [
  { uid: 'd1', name: 'Carlos Ruiz', organisationId: 'org1' },
  { uid: 'd2', name: 'Elena Gilbert', organisationId: 'org1' },
  { uid: 'd3', name: 'Sam Winchester', organisationId: 'org1' },
  { uid: 'd4', name: 'Dean Smith', organisationId: 'org1' },
];

export const mockVehicles: Vehicle[] = [
  {
    id: 'U1I6JYq9ftS0B8lDJzqd',
    model: 'BMW 5 Series 2023',
    licenceNumber: 'JM 45 TY GP',
    modelYear: 2023,
    odometer: 15000,
    lastServiced: '2024-04-15',
    nextService: '2024-10-15',
    trailerId: undefined,
    vehicleMaintenanceIntervalsKm: {
      tyres: 50000,
      alignmentBalancing: 20000,
      service: 10000,
      turboExchange: 150000,
      handbrakeShoes: 100000,
      clutchReplacement: 120000,
    },
    status: VehicleStatus.READY,
    organisationId: 'org1',
    currentOdometer: 15000,
    lastServiceOdo: 10000,
    nextServiceOdo: 20000,
    lastAlignmentOdo: 12000,
  },
  {
    id: 'zHG7nF5fP8FT00LLuG9s',
    model: 'HONDA FIT 3',
    licenceNumber: 'GM 45 TY CT',
    modelYear: 2022,
    odometer: 5000,
    lastServiced: '2024-03-10',
    nextService: '2024-09-10',
    trailerId: undefined,
    vehicleMaintenanceIntervalsKm: {
      tyres: 60000,
      alignmentBalancing: 25000,
      service: 12000,
      turboExchange: 0,
      handbrakeShoes: 80000,
      clutchReplacement: 100000,
    },
    status: VehicleStatus.READY,
    organisationId: 'org1',
    currentOdometer: 5000,
    lastServiceOdo: 0,
    nextServiceOdo: 10000,
    lastAlignmentOdo: 0,
  },
  {
    id: 'v3',
    model: 'Urban Van 101',
    licenceNumber: 'FLEET-003',
    modelYear: 2021,
    odometer: 45000,
    lastServiced: '2024-02-20',
    nextService: '2024-08-20',
    trailerId: 'trailer1',
    vehicleMaintenanceIntervalsKm: {
      tyres: 80000,
      alignmentBalancing: 30000,
      service: 15000,
      turboExchange: 200000,
      handbrakeShoes: 120000,
      clutchReplacement: 150000,
    },
    status: VehicleStatus.ON_TOUR,
    organisationId: 'org1',
    currentDriverName: 'Carlos Ruiz',
    currentDriverId: 'd1',
    assignedByName: 'Sarah Manager',
    assignedById: 'tm1',
    currentOdometer: 45000,
    lastServiceOdo: 40000,
    nextServiceOdo: 50000,
    lastAlignmentOdo: 42000,
  },
];

export const mockTours: Tour[] = [
  { 
    id: 't1', 
    // Fixed: Added mandatory Tour fields
    tour_reference: 'TR-101',
    tour_name: 'VIP Music Group',
    supplier: 'Luxury Travel Co',
    driverId: 'd1', 
    driverName: 'Carlos Ruiz', 
    vehicleId: 'v3', 
    vehicleName: 'Urban Van 101', 
    startDate: '2024-05-01', 
    endDate: '2024-05-15', 
    status: TourStatus.ACTIVE, 
    estimated_km: 1200,
    trailer_required: false,
    notes: 'VIP Music Group' 
  },
  { 
    id: 't2', 
    // Fixed: Added mandatory Tour fields
    tour_reference: 'TR-102',
    tour_name: 'Corporate Retreat',
    supplier: 'Events SA',
    driverId: 'd2', 
    driverName: 'Elena Gilbert', 
    vehicleId: 'zHG7nF5fP8FT00LLuG9s', 
    vehicleName: 'HONDA FIT 3', 
    startDate: '2024-06-01', 
    endDate: '2024-06-10', 
    status: TourStatus.PLANNED, 
    estimated_km: 450,
    trailer_required: false,
    notes: 'Corporate Retreat' 
  },
];

export const mockIssues: Issue[] = [
  { id: 'i1', vehicleId: 'U1I6JYq9ftS0B8lDJzqd', vehicleName: 'BMW 5 Series 2023', description: 'Left headlight flickering', severity: IssueSeverity.LOW, status: IssueStatus.REPORTED, reportedAt: '2024-05-05' },
];

export const mockExpenses: Expense[] = [
  { id: 'e1', amount: 450.00, category: 'Fuel', description: 'Gas station fill up', status: ExpenseStatus.PENDING, createdAt: '2024-05-12' },
];

export const mockFloats: Float[] = [
  { 
    id: 'f1', 
    amount: 1000.00, 
    originalAmount: 100000, 
    remainingAmount: 100000, 
    active: true, 
    driverId: 'd1', 
    driverName: 'Carlos Ruiz', 
    tourId: 't1', 
    status: 'open', 
    issuedAt: '2024-05-01' 
  },
];

export const mockInspections = [
  { id: 'ins1', tourId: 't1', type: 'PRE_TRIP', timestamp: '2024-05-01T08:00:00Z', results: { tires: true, lights: true, fluids: true }, imageUrls: [] },
];
