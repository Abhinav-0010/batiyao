import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from 'redis';
import { config } from './config/index.js';
import { MatchmakingService } from './services/matchmaking.js';
import { ModerationService } from './services/moderation.js';
import { PaymentService } from './services/payment.js';
import { SignalingService } from './services/signaling.js';
import { createUserRouter, createMatchmakingRouter } from './api/routes.js';
import type { ApiResponse } from './types/api.js';

const app: Express = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
  },
});

// Initialize Redis
const redis = createClient({ url: config.redis.url });

// Initialize services
const matchmakingService = new MatchmakingService(redis);
const moderationService = new ModerationService(config.moderation.nsfwThreshold);
const paymentService = new PaymentService();
const signalingService = new SignalingService(io, redis);
let redisConnected = false;
let activePort = config.port;

// Middleware
app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Health check
app.get('/health', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    timestamp: Date.now(),
  };
  res.json(response);
});

// Status
app.get('/status', async (req: Request, res: Response) => {
  try {
    const stats = redisConnected
      ? await matchmakingService.getQueueStats()
      : { total: 0, byMode: {} };
    const connectedUsers = await signalingService.getConnectedUsers();

    const response: ApiResponse = {
      success: true,
      data: {
        connectedUsers,
        queueStats: stats,
        uptime: process.uptime(),
      },
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Failed to fetch status',
      },
      timestamp: Date.now(),
    });
  }
});

// API Routes
app.use('/api/users', createUserRouter());
app.use('/api/matching', createMatchmakingRouter());

// Stripe webhook
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    // Verify webhook signature
    // const event = stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);

    // Handle event
    // await paymentService.handleWebhook(event);

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
    timestamp: Date.now(),
  });
});

// Start server
async function start() {
  try {
    // Connect to Redis when available, but keep the app bootable in dev if it is not running.
    try {
      await redis.connect();
      redisConnected = true;
      console.log('✅ Redis connected');
    } catch (error) {
      console.warn('⚠️ Redis unavailable, starting in degraded mode');
    }

    // Start matchmaking service
    if (redisConnected) {
      await matchmakingService.start();
    }

    const listenOnPort = (port: number, retriesLeft: number): void => {
      const onError = (error: NodeJS.ErrnoException): void => {
        if (error.code === 'EADDRINUSE' && retriesLeft > 0) {
          activePort = port + 1;
          console.warn(`⚠️ Port ${port} is in use, trying ${activePort}`);
          httpServer.off('error', onError);
          listenOnPort(activePort, retriesLeft - 1);
          return;
        }

        console.error('❌ Failed to start server:', error);
        process.exit(1);
      };

      httpServer.once('error', onError);
      httpServer.listen(port, () => {
        httpServer.off('error', onError);
        activePort = port;
        console.log(`🚀 Server running on port ${port}`);
        console.log(`📍 Environment: ${config.nodeEnv}`);
      });
    };

    // Start HTTP server
    listenOnPort(activePort, 10);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📛 SIGTERM received, shutting down gracefully');
  await matchmakingService.stop();
  await redis.quit();
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

start();
