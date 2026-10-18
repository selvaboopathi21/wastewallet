// SocketContext: Central Socket.io connection provider for real-time events
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import useAuth from '../hooks/useAuth';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only connect if user is authenticated
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Dynamic socket URL resolution
    const getSocketUrl = () => {
      const envUrl = import.meta.env.VITE_SOCKET_URL;
      const isBrowser = typeof window !== 'undefined';
      const hostname = isBrowser ? window.location.hostname : '';

      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
        return envUrl || 'http://localhost:5000';
      }

      if (hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
        return `http://${hostname}:5000`;
      }

      if (
        hostname.endsWith('.vercel.app') ||
        (hostname && !hostname.startsWith('192.168.') && !hostname.startsWith('10.'))
      ) {
        return envUrl && !envUrl.includes('localhost')
          ? envUrl
          : 'https://wastewallet-backend-93py.onrender.com';
      }

      return envUrl || 'http://localhost:5000';
    };

    const socketUrl = getSocketUrl();
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Join personal room
      if (user.id || user._id) {
        const uid = user.id || user._id;
        newSocket.emit('join_user', uid);
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const joinPickup = (pickupId) => {
    if (socket && isConnected && pickupId) {
      socket.emit('join_pickup', pickupId);
    }
  };

  const value = {
    socket,
    isConnected,
    joinPickup,
    on: (...args) => socket?.on?.(...args),
    off: (...args) => socket?.off?.(...args),
    emit: (...args) => socket?.emit?.(...args),
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
