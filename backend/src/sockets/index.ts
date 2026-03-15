import { Server, Socket } from "socket.io";

export const setupSockets = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("joinWorkspace", (workspaceId: string) => {
      socket.join(`workspace:${workspaceId}`);
      console.log(`Socket ${socket.id} joined workspace ${workspaceId}`);
    });

    socket.on("joinProject", (projectId: string) => {
      socket.join(`project:${projectId}`);
      console.log(`Socket ${socket.id} joined project ${projectId}`);
    });

    socket.on("leaveProject", (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on("joinUser", (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} joined user ${userId}`);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};
