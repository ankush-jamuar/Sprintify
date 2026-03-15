import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/useAuthStore';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

let globalSocket: Socket | null = null;

export const useSocket = () => {
  const { isAuthenticated, user } = useAuthStore();
  const { activeWorkspace } = useWorkspaceStore();
  const [socket, setSocket] = useState<Socket | null>(globalSocket);

  useEffect(() => {
    if (!isAuthenticated) {
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
        setSocket(null);
      }
      return;
    }

    if (!globalSocket) {
      const token = localStorage.getItem("sprintify_token");
      globalSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        withCredentials: true,
        extraHeaders: token ? { Authorization: `Bearer ${token}` } : {}
      });

      globalSocket.on('connect', () => {
        console.log('Connected to WebSocket server:', globalSocket?.id);
      });

      setSocket(globalSocket);
    }

    if (globalSocket) {
      if (activeWorkspace) {
        globalSocket.emit('joinWorkspace', activeWorkspace._id);
      }
      if (user?._id) {
        globalSocket.emit('joinUser', user._id);
      }
    }

    return () => {
      // We don't explicitly disconnect globalSocket on unmount to keep connection alive across route changes
    };
  }, [isAuthenticated, activeWorkspace, user]);

  return socket;
};
