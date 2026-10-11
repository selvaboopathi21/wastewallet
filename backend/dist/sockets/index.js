"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitOtpSent = exports.emitPickupOffered = exports.emitPickupConfirmed = exports.emitStatusChanged = exports.emitSeparatePriceDeclined = exports.emitSeparatePriceAccepted = exports.emitSeparatePriceRequested = exports.emitWeightUpdated = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const env_1 = __importDefault(require("../config/env"));
const logger_1 = __importDefault(require("../utils/logger"));
let io = null;
const initSocket = (server) => {
    const allowedOrigins = [env_1.default.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173', '*'];
    io = new socket_io_1.Server(server, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
            methods: ['GET', 'POST', 'PATCH'],
        },
    });
    io.on('connection', (socket) => {
        logger_1.default.info(`🔌 Socket connected: ${socket.id}`);
        // User joins their personal room for direct user notifications
        socket.on('join_user', (userId) => {
            if (userId) {
                socket.join(`user:${userId}`);
                logger_1.default.info(`👤 Socket ${socket.id} joined personal room: user:${userId}`);
            }
        });
        // Participant joins a pickup room (for live sync during an active pickup)
        socket.on('join_pickup', (pickupId) => {
            if (pickupId) {
                socket.join(`pickup:${pickupId}`);
                logger_1.default.info(`📦 Socket ${socket.id} joined pickup room: pickup:${pickupId}`);
            }
        });
        // Collector streams live GPS location to customer
        socket.on('collector.location', (data) => {
            if (data?.pickupId && data?.coordinates) {
                io?.to(`pickup:${data.pickupId}`).emit('collector.location', data);
            }
        });
        socket.on('disconnect', () => {
            logger_1.default.info(`🔌 Socket disconnected: ${socket.id}`);
        });
    });
    logger_1.default.info('⚡ Socket.io real-time server initialized');
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io has not been initialized yet. Call initSocket(server) first.');
    }
    return io;
};
exports.getIO = getIO;
// --- REAL-TIME EVENT EMITTERS ---
/**
 * 1. Emits live updated weights and total paise amount to the customer
 */
const emitWeightUpdated = (pickupId, customerId, data) => {
    if (!io)
        return;
    // Emit to both pickup room and direct customer room
    io.to(`pickup:${pickupId}`).to(`user:${customerId}`).emit('weight.updated', data);
    logger_1.default.info(`📡 Emitted "weight.updated" for pickup ${pickupId} to customer ${customerId}`);
};
exports.emitWeightUpdated = emitWeightUpdated;
/**
 * 2. Emits "See separate price" request to the collector
 */
const emitSeparatePriceRequested = (pickupId, collectorId, data) => {
    if (!io)
        return;
    io.to(`pickup:${pickupId}`).to(`user:${collectorId}`).emit('pricing.separate.requested', data);
    logger_1.default.info(`📡 Emitted "pricing.separate.requested" for pickup ${pickupId} to collector ${collectorId}`);
};
exports.emitSeparatePriceRequested = emitSeparatePriceRequested;
/**
 * 3. Emits collector acceptance of separate price mode to customer
 */
const emitSeparatePriceAccepted = (pickupId, customerId, data) => {
    if (!io)
        return;
    io.to(`pickup:${pickupId}`).to(`user:${customerId}`).emit('pricing.separate.accepted', data);
    logger_1.default.info(`📡 Emitted "pricing.separate.accepted" for pickup ${pickupId} to customer ${customerId}`);
};
exports.emitSeparatePriceAccepted = emitSeparatePriceAccepted;
/**
 * 4. Emits collector declination of separate price mode with reason to customer
 */
const emitSeparatePriceDeclined = (pickupId, customerId, data) => {
    if (!io)
        return;
    io.to(`pickup:${pickupId}`).to(`user:${customerId}`).emit('pricing.separate.declined', data);
    logger_1.default.info(`📡 Emitted "pricing.separate.declined" for pickup ${pickupId} to customer ${customerId}`);
};
exports.emitSeparatePriceDeclined = emitSeparatePriceDeclined;
/**
 * 5. Emits status transition to both customer and collector
 */
const emitStatusChanged = (pickupId, data) => {
    if (!io)
        return;
    const payload = {
        pickupId: String(pickupId),
        requestId: String(pickupId),
        ...data,
    };
    io.to(`pickup:${pickupId}`).emit('pickup.status.changed', payload);
    logger_1.default.info(`📡 Emitted "pickup.status.changed" for pickup ${pickupId}: ${data.newStatus}`);
};
exports.emitStatusChanged = emitStatusChanged;
/**
 * 6. Emits OTP confirmation lock event to collector
 */
const emitPickupConfirmed = (pickupId, collectorId, data) => {
    if (!io)
        return;
    const payload = {
        pickupId: String(pickupId),
        requestId: String(pickupId),
        ...data,
    };
    io.to(`pickup:${pickupId}`).to(`user:${collectorId}`).emit('pickup.confirmed', payload);
    logger_1.default.info(`📡 Emitted "pickup.confirmed" for pickup ${pickupId} to collector ${collectorId}`);
};
exports.emitPickupConfirmed = emitPickupConfirmed;
/**
 * 7. Emits pickup offer to assigned collector and all active collectors
 */
const emitPickupOffered = (collectorId, data) => {
    if (!io)
        return;
    io.to(`user:${collectorId}`).emit('pickup.offered', data);
    io.emit('pickup.offered', data);
    logger_1.default.info(`📡 Emitted "pickup.offered" to collector ${collectorId}`);
};
exports.emitPickupOffered = emitPickupOffered;
/**
 * 8. Emits OTP sent event with code to customer and pickup room
 */
const emitOtpSent = (pickupId, customerId, data) => {
    if (!io)
        return;
    const payload = {
        pickupId: String(pickupId),
        requestId: String(pickupId),
        ...data,
    };
    io.to(`pickup:${pickupId}`).to(`user:${customerId}`).emit('pickup.otp.sent', payload);
    logger_1.default.info(`📡 Emitted "pickup.otp.sent" for pickup ${pickupId} to customer ${customerId}`);
};
exports.emitOtpSent = emitOtpSent;
exports.default = {
    initSocket: exports.initSocket,
    getIO: exports.getIO,
    emitWeightUpdated: exports.emitWeightUpdated,
    emitSeparatePriceRequested: exports.emitSeparatePriceRequested,
    emitSeparatePriceAccepted: exports.emitSeparatePriceAccepted,
    emitSeparatePriceDeclined: exports.emitSeparatePriceDeclined,
    emitStatusChanged: exports.emitStatusChanged,
    emitPickupConfirmed: exports.emitPickupConfirmed,
    emitPickupOffered: exports.emitPickupOffered,
    emitOtpSent: exports.emitOtpSent,
};
