import io from 'socket.io-client';

// If we are in production, use the deployed backend URL. 
// If on localhost, use port 5000.
const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

export const socket = io.connect(URL);