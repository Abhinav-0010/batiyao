import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { ApiResponse } from '../types/api.js';

export function createUserRouter(): Router {
  const router = Router();

  // Create anonymous user
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const userId = uuidv4();
      const pseudonym = generatePseudonym();

      const user = {
        id: userId,
        pseudonym,
        tier: 'free',
        status: 'idle',
        reputation: 0,
        createdAt: new Date(),
      };

      const response: ApiResponse = {
        success: true,
        data: user,
        timestamp: Date.now(),
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'REGISTRATION_ERROR',
          message: 'Failed to create user',
        },
        timestamp: Date.now(),
      });
    }
  });

  // Get user profile
  router.get('/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const response: ApiResponse = {
        success: true,
        data: {
          id: userId,
          pseudonym: 'User_' + userId.slice(0, 8),
          tier: 'free',
          status: 'idle',
          reputation: 0,
        },
        timestamp: Date.now(),
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_USER_ERROR',
          message: 'Failed to fetch user',
        },
        timestamp: Date.now(),
      });
    }
  });

  // Update user preferences
  router.put('/:userId/preferences', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const preferences = req.body;

      const response: ApiResponse = {
        success: true,
        data: { userId, preferences },
        timestamp: Date.now(),
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_PREFERENCES_ERROR',
          message: 'Failed to update preferences',
        },
        timestamp: Date.now(),
      });
    }
  });

  // Get user stats
  router.get('/:userId/stats', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const response: ApiResponse = {
        success: true,
        data: {
          userId,
          totalChats: 42,
          averageRating: 4.8,
          reputation: 850,
          hoursSpent: 12.5,
        },
        timestamp: Date.now(),
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_STATS_ERROR',
          message: 'Failed to fetch stats',
        },
        timestamp: Date.now(),
      });
    }
  });

  return router;
}

export function createMatchmakingRouter(): Router {
  const router = Router();

  // Join matchmaking queue
  router.post('/join', async (req: Request, res: Response) => {
    try {
      const { userId, preferences } = req.body;

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Joined matchmaking queue',
          queuePosition: 42,
        },
        timestamp: Date.now(),
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'JOIN_QUEUE_ERROR',
          message: 'Failed to join queue',
        },
        timestamp: Date.now(),
      });
    }
  });

  // Leave matchmaking queue
  router.post('/leave', async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      const response: ApiResponse = {
        success: true,
        data: { message: 'Left matchmaking queue' },
        timestamp: Date.now(),
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'LEAVE_QUEUE_ERROR',
          message: 'Failed to leave queue',
        },
        timestamp: Date.now(),
      });
    }
  });

  // Get queue stats
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const response: ApiResponse = {
        success: true,
        data: {
          queueLength: 256,
          avgWaitTime: 3.2,
          activeMatches: 128,
          byMode: {
            random: 150,
            mood: 80,
            interest: 26,
          },
        },
        timestamp: Date.now(),
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to fetch stats',
        },
        timestamp: Date.now(),
      });
    }
  });

  return router;
}

function generatePseudonym(): string {
  const adjectives = ['Cosmic', 'Stellar', 'Noble', 'Swift', 'Bright', 'Silent'];
  const nouns = ['Phoenix', 'Eagle', 'Tiger', 'Wolf', 'Dragon', 'Storm'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 10000);

  return `${adj}${noun}${num}`;
}
