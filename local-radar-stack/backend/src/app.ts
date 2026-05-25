import "express-async-errors";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { EventEmitter } from "events";
import type { Pool } from "pg";
import { RadarRepository } from "./db/repository.js";
import { RateMonitor } from "./services/rateMonitor.js";
import { IngestLagTracker } from "./services/ingestLagTracker.js";
import { ZoneCacheService } from "./services/zoneCacheService.js";
import { ReplayService } from "./services/replayService.js";
import { PushNotificationService } from "./services/pushNotificationService.js";
import { logger } from "./logger.js";
import { MqttTelemetryClient } from "./mqtt/client.js";

import { createHealthRouter } from "./routes/health.js";
import { createRadarRouter } from "./routes/radars.js";
import { createRoomRouter } from "./routes/rooms.js";
import { createPatientRouter } from "./routes/patients.js";
import { createEventRouter } from "./routes/events.js";
import { createMonitorRouter } from "./routes/monitor.js";
import { createReplayRouter } from "./routes/replay.js";
import { createTestingRouter } from "./routes/testing.js";
import { createPushTokenRouter } from "./routes/pushTokens.js";
import { createDeviceCommandRouter } from "./routes/deviceCommands.js";

import { createAuthRouter } from "./routes/auth.js";
import { getUsersRouter } from "./routes/users.js";
import { getJwtSecret } from "./utils/jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: "admin" | "user";
        permissions: string[];
      };
    }
  }
}

export interface AppDeps {
  pool: Pool;
  repository: RadarRepository;
  rateMonitor: RateMonitor;
  ingestLagTracker: IngestLagTracker;
  zoneCacheService: ZoneCacheService;
  replayService: ReplayService;
  pushNotificationService: PushNotificationService;
  frameStream: EventEmitter;
  mqttClient: MqttTelemetryClient;
  pipeline: any; // Using any to avoid circular dependency if it happens, but better if we can use RadarPipeline type
}

export function createApp(deps: AppDeps): express.Express {
  const app = express();
  
  const corsOrigins = process.env.CORS_ALLOWED_ORIGINS
    ?.split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

  app.use(cors({
    origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true
  }));
  app.use(express.json());

  app.use((req, res, next) => {
    logger.info({ method: req.method, path: req.path }, "Incoming request");
    next();
  });

  // Rate limiter removed for internal tools handling heavy polling
  // const limiter = rateLimit({
  //   windowMs: 15 * 60 * 1000,
  //   limit: 1000,
  //   message: { error: "Too many requests, please try again later." }
  // });
  // app.use(limiter);

  const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const publicPaths = ['/health', '/monitor/health', '/auth/login'];
    if (publicPaths.includes(req.path)) {
      next();
      return;
    }

    let token = "";
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.query.token && typeof req.query.token === "string") {
      token = req.query.token;
    }

    if (!token) {
      logger.warn({ path: req.path, headers: req.headers }, "Missing authorization token");
      res.status(401).json({ error: "Missing or invalid authorization" });
      return;
    }
    
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as any;
      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
        permissions: decoded.permissions || []
      };
      next();
    } catch (err) {
      logger.error({ err, path: req.path, tokenSnippet: token.substring(0, 10) }, "Token verification failed");
      res.status(401).json({ error: "Invalid token" });
    }
  };

  app.use(authMiddleware);

  app.use("/auth", createAuthRouter(deps.pool));
  app.use("/users", getUsersRouter(deps.pool));

  app.use(createHealthRouter({
    repository: deps.repository,
    rateMonitor: deps.rateMonitor,
    ingestLagTracker: deps.ingestLagTracker,
    mqttClient: deps.mqttClient,
  }));

  app.use(createRadarRouter({
    repository: deps.repository,
    zoneCacheService: deps.zoneCacheService,
  }));

  app.use(createRoomRouter({
    repository: deps.repository,
    pool: deps.pool,
  }));

  app.use(createPatientRouter({
    repository: deps.repository,
    pool: deps.pool,
  }));

  app.use(createEventRouter({
    repository: deps.repository,
    pushNotificationService: deps.pushNotificationService,
  }));

  app.use(createMonitorRouter({
    repository: deps.repository,
    pool: deps.pool,
    frameStream: deps.frameStream,
  }));

  app.use(createReplayRouter({
    replayService: deps.replayService,
  }));

  app.use(createTestingRouter({
    repository: deps.repository,
    pipeline: deps.pipeline,
  }));

  app.use(createPushTokenRouter({
    pushNotificationService: deps.pushNotificationService,
  }));

  app.use(createDeviceCommandRouter({
    mqttClient: deps.mqttClient,
  }));

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ error }, "Unhandled API error");
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
