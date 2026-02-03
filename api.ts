
import { Tour, Issue, Expense, Float, Inspection, User, TourStatus, IssueStatus, ExpenseStatus, Vehicle, Driver, Trailer } from './types';
import { API_BASE } from './config';

interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    const json: ApiResponse<T> = await response.json();

    if (json.status !== 1) {
      throw new Error(json.message || 'Operation failed');
    }

    return json.data;
  } catch (error: any) {
    console.error(`Request failed for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Handles Multipart/Form-Data requests (e.g., file uploads)
 */
async function postMultipart<T>(endpoint: string, formData: FormData): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers = {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    // NOTE: Content-Type is NOT set here; the browser automatically 
    // sets it with the boundary for FormData.
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    const json: ApiResponse<T> = await response.json();
    if (json.status !== 1) throw new Error(json.message || 'Upload failed');
    return json.data;
  } catch (error: any) {
    console.error(`Multipart request failed for ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  authenticate: (credentials: { username: string, pin: string }) =>
    request<User>('/authenticate', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),

  getDrivers: () => request<Driver[]>('/get-drivers'),

  getVehicles: () => request<Vehicle[]>('/get-vehicles'),
  getVehicle: (id: string) => request<Vehicle>(`/vehicles/${id}`),
  updateVehicle: (id: string, data: Partial<Vehicle>) => request<Vehicle>(`/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  getVehicleTours: (id: string) => request<Tour[]>(`/vehicles/${id}/tours`),
  getVehicleIssues: (id: string) => request<Issue[]>(`/vehicles/${id}/issues`),
  getVehicleInspections: (id: string) => request<Inspection[]>(`/vehicles/${id}/inspections`),

  addVehicle: (data: { model: string, licenceNumber: string, modelYear: string, trailerId?: string, trailerModel?: string, trailerLicence?: string, odometer: string, lastServiced: string, nextService: string }) =>
    request<{ id: string }>('/add-vehicle', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  addTrailer: (data: { model: string, licenceNumber: string, modelYear: string }) =>
    request<{ id: string }>('/add-trailer', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getTrailers: () => request<Trailer[]>('/get-trailers'),
  deleteVehicle: (id: string) => request<void>(`/vehicles/${id}`, {
    method: 'DELETE'
  }),

  // Reverted to /tours as per production backend requirement
  getTours: (status?: TourStatus) => request<Tour[]>(`/tours${status ? `?status=${status}` : ''}`),
  getTour: (id: string) => request<Tour>(`/tours/${id}`),
  createTour: (data: Partial<Tour>) => request<Tour>('/tours', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateTour: (id: string, data: Partial<Tour>) => request<Tour>(`/tours/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  deleteTour: (id: string) => request<void>(`/tours/${id}`, {
    method: 'DELETE'
  }),

  getInspectionsByTour: (tourId: string) => request<Inspection[]>(`/tours/${tourId}/inspections`),

  getFloats: () => request<Float[]>('/floats'),
  issueFloat: (data: { driverId: string, amountCents: number, tourId?: string, message?: string }) =>
    request<Float>('/floats', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  closeFloat: (id: string) => request<Float>(`/floats/${id}/close`, {
    method: 'PATCH'
  }),

  getExpenses: () => request<Expense[]>('/expenses'),
  updateExpenseStatus: (id: string, action: 'approve' | 'reject') =>
    request<Expense>(`/expenses/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ action })
    }),
  deleteExpense: (id: string) => request<void>(`/expenses/${id}`, {
    method: 'DELETE'
  }),

  getIssues: () => request<Issue[]>('/issues'),
  createIssue: (data: Partial<Issue>) => request<Issue>('/issues', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateIssueStatus: (id: string, status: IssueStatus, notes?: string) => request<Issue>(`/issues/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes })
  }),

  // User Management
  getUsers: () => request<User[]>('/users'),
  addUser: (data: Partial<User>) => request<User>('/add-user', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  addDriverWithDocs: (formData: FormData) => postMultipart<User>('/add-user', formData),
  updateUser: (id: string, data: Partial<User>) => request<User>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteUser: (id: string) => request<void>(`/users/${id}`, {
    method: 'DELETE'
  }),
};
