
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isMockMode: boolean;
}

const getInitialUser = (): User | null => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error("Failed to parse user from localStorage", error);
    return null;
  }
};

const initialState: AuthState = {
  user: getInitialUser(),
  token: localStorage.getItem('auth_token'),
  isMockMode: localStorage.getItem('isMockMode') === 'true',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      localStorage.setItem('auth_token', action.payload.token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
    },
    toggleMockMode: (state) => {
      state.isMockMode = !state.isMockMode;
      localStorage.setItem('isMockMode', state.isMockMode.toString());
    },
  },
});

export const { setCredentials, logout, toggleMockMode } = authSlice.actions;
export default authSlice.reducer;
