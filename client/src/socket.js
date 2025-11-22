import io from 'socket.io-client';

// Automatically detects if we are on localhost or deployed
export const BACKEND_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

export const socket = io.connect(BACKEND_URL);