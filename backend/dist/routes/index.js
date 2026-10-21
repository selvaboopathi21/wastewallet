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
const collector_routes_1 = __importDefault(require("./collector.routes"));
const batch_routes_1 = __importDefault(require("./batch.routes"));
const rating_routes_1 = __importDefault(require("./rating.routes"));
const companyDispatch_routes_1 = __importDefault(require("./companyDispatch.routes"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/pickups', pickup_routes_1.default);
router.use('/collector', collector_routes_1.default);
router.use('/batches', batch_routes_1.default);
router.use('/ratings', rating_routes_1.default);
router.use('/company-dispatch', companyDispatch_routes_1.default);
router.use('/', admin_routes_1.default); // Mounts /rates, /zones, and /admin/*
exports.default = router;
