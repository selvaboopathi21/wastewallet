"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Master API v1 Route Registry in TypeScript
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const admin_routes_1 = __importDefault(require("./admin.routes"));
const pickup_routes_1 = __importDefault(require("./pickup.routes"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/pickups', pickup_routes_1.default);
router.use('/', admin_routes_1.default); // Mounts /rates, /zones, and /admin/*
exports.default = router;
