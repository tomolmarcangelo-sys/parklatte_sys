import { io } from "socket.io-client";

// The server is on the same host and port (3000)
export const socket = io();
