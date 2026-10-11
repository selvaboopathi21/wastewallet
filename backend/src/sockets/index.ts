// Socket.io Setup: Real-time event communication for live weights and price separation
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import env from '../config/env';
import logger from '../utils/logger';

let io: Server | null = null;

export const initSocket = (server: HttpServer): Server => {
  const allowedOrigins = [env.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173', '*'];

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH'],
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`🔌 Socket connected: ${socket.id}`);

    // User joins their personal room for direct user notifications
    socket.on('join_user', (userId: string) => {
      if (userId) {
        socket.join(`user:${userId}`);
        logger.info(`👤 Socket ${socket.id} joined personal room: user:${userId}`);
      }
    });

    // Participant joins a pickup room (for live sync during an active pickup)
    socket.on('join_pickup', (pickupId: string) => {
      if (pickupId) {
        socket.join(`pickup:${pickupId}`);
        logger.info(`📦 Socket ${socket.id} joined pickup room: pickup:${pickupId}`);
      }
    });

    // Collector streams live GPS location to customer
    socket.on('collector.location', (data: { pickupId: string; coordinates: [number, number] }) => {
      if (data?.pickupId && data?.coordinates) {
        io?.to(`pickup:${data.pickupId}`).emit('collector.location', data);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('⚡ Socket.io real-time server initialized');
  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet. Call initSocket(server) first.');
  }
  return io;
};

// --- REAL-TIME EVENT EMITTERS ---

/**
 * 1. Emits live updated weights and total paise amount to the customer
 */
export const emitWeightUpdated = (pickupId: string, customerId: string, data: any) => {
  if (!io) return;
  // Emit to both pickup room and direct customer room
  io.to(`pickup:${pickupId}`).to(`user:${customerId}`).emit('weight.updated', data);
  logger.info(`📡 Emitted "weight.updated" for pickup ${pickupId} to customer ${customerId}`);
};

/**
 * 2. Emits "See separate price" request to the collector
 */
export const emitSeparatePriceRequested = (pickupId: string, collectorId: string, data: any) => {
  if (!io) return;
  io.to(`pickup:${pickupId}`).to(`user:${collectorId}`).emit('pricing.separate.requested', data);
  logger.info(`📡 Emitted "pricing.separate.requested" for pickup ${pickupId} to collector ${collectorId}`);
};

/**
 * 3. Emits collector acceptance of separate price mode to customer
 */
export const emitSeparatePriceAccepted = (pickupId: string, customerId: string, data: any) => {
  if (!io) return;
  io.to(`pickup:${pickupId}`).to(`user:${customerId}`).emit('pricing.separate.accepted', data);
  logger.info(`📡 Emitted "pricing.separate.accepted" for pickup ${pickupId} to customer ${customerId}`);
};

/**
 * 4. Emits collector declination of separate price mode with reason to customer
 */
export const emitSeparatePriceDeclined = (pickupId: string, customerId: string, data: any) => {
  if (!io) return;
  io.to(`pickup:${pickupId}`).to(`user:${customerId}`).emit('pricing.separate.declined', data);
  logger.info(`📡 Emitted "pricing.separate.declined" for pickup ${pickupId} to customer ${customerId}`);
};

/**
 * 5. Emits status transition to both customer and collector
 */
export const emitStatusChanged = (pickupId: string, data: any) => {
  if (!io) return;
  io.to(`pickup:${pickupId}`).emit('pickup.status.changed', data);
  logger.info(`📡 Emitted "pickup.status.changed" for pickup ${pickupId}: ${data.newStatus}`);
};

/**
 * 6. Emits OTP confirmation lock event to collector
 */
export const emitPickupConfirmed = (pickupId: string, collectorId: string, data: any) => {
  if (!io) return;
  io.to(`pickup:${pickupId}`).to(`user:${collectorId}`).emit('pickup.confirmed', data);
  logger.info(`📡 Emitted "pickup.confirmed" for pickup ${pickupId} to collector ${collectorId}`);
};

export default {
  initSocket,
  getIO,
  emitWeightUpdated,
  emitSeparatePriceRequested,
  emitSeparatePriceAccepted,
  emitSeparatePriceDeclined,
  emitStatusChanged,
  emitPickupConfirmed,
};
