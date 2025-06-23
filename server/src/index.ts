import http from "http";
import { Server } from "socket.io";
import { setupSocket } from "./socket/socket";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer();

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

setupSocket(io);

httpServer.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
