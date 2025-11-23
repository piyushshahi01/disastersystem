import { io } from "socket.io-client";

export const BACKEND_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

export const socket = io(BACKEND_URL, {
  transports: ["websocket"],
  withCredentials: true,
});
