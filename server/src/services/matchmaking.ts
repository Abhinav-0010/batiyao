import { v4 as uuidv4 } from 'uuid';
import { Redis } from 'redis';
import type { MatchRequest, MatchResult } from '../types/api.js';

const MATCHING_QUEUE_KEY = 'matching_queue';
const ACTIVE_MATCHES_KEY = 'active_matches';
const USER_PREFERENCES_KEY = 'user_preferences';

export class MatchmakingService {
  private redis: Redis;
  private matchingInterval: NodeJS.Timeout | null = null;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async start(): Promise<void> {
    console.log('🎯 Starting matchmaking service...');
    // Run matching every 500ms for sub-second matching
    this.matchingInterval = setInterval(() => this.runMatching(), 500);
  }

  async stop(): Promise<void> {
    if (this.matchingInterval) {
      clearInterval(this.matchingInterval);
      this.matchingInterval = null;
    }
    console.log('🛑 Matchmaking service stopped');
  }

  async joinQueue(userId: string, request: MatchRequest): Promise<void> {
    try {
      // Store user preferences
      await this.redis.hSet(
        USER_PREFERENCES_KEY,
        userId,
        JSON.stringify(request)
      );

      // Add to matching queue with timestamp for fairness
      await this.redis.zAdd(MATCHING_QUEUE_KEY, {
        score: Date.now(),
        member: userId,
      });

      console.log(`✅ User ${userId} joined matching queue`);
    } catch (error) {
      console.error(`❌ Error joining queue for user ${userId}:`, error);
      throw error;
    }
  }

  async leaveQueue(userId: string): Promise<void> {
    try {
      await this.redis.zRem(MATCHING_QUEUE_KEY, userId);
      await this.redis.hDel(USER_PREFERENCES_KEY, userId);
      console.log(`✅ User ${userId} left matching queue`);
    } catch (error) {
      console.error(`❌ Error leaving queue for user ${userId}:`, error);
      throw error;
    }
  }

  private async runMatching(): Promise<MatchResult[]> {
    const matches: MatchResult[] = [];
    try {
      const queueLength = await this.redis.zCard(MATCHING_QUEUE_KEY);

      if (queueLength < 2) {
        return matches;
      }

      // Get all users in queue
      const queuedUsers = await this.redis.zRange(MATCHING_QUEUE_KEY, 0, -1);
      const preferences = await this.redis.hGetAll(USER_PREFERENCES_KEY);

      // Match pairs
      const usersToRemove: string[] = [];

      for (let i = 0; i < queuedUsers.length - 1; i++) {
        if (usersToRemove.includes(queuedUsers[i])) continue;

        const user1Id = queuedUsers[i];
        const user1Prefs = JSON.parse(preferences[user1Id]);

        for (let j = i + 1; j < queuedUsers.length; j++) {
          if (usersToRemove.includes(queuedUsers[j])) continue;

          const user2Id = queuedUsers[j];
          const user2Prefs = JSON.parse(preferences[user2Id]);

          // Check compatibility
          const compatibility = this.calculateCompatibility(user1Prefs, user2Prefs);

          if (compatibility > 0.6) {
            // Match found!
            const matchResult: MatchResult = {
              user1: { ...user1Prefs, userId: user1Id },
              user2: { ...user2Prefs, userId: user2Id },
              compatibility,
              score: compatibility * 100,
            };

            matches.push(matchResult);

            // Store matched session
            const sessionId = uuidv4();
            await this.redis.setEx(
              `session:${sessionId}`,
              3600, // 1 hour TTL
              JSON.stringify({
                user1Id,
                user2Id,
                createdAt: Date.now(),
              })
            );

            // Store match result for retrieval
            await this.redis.hSet(
              'match_results',
              sessionId,
              JSON.stringify(matchResult)
            );

            usersToRemove.push(user1Id, user2Id);
            break;
          }
        }
      }

      // Remove matched users from queue
      if (usersToRemove.length > 0) {
        await this.redis.zRem(MATCHING_QUEUE_KEY, usersToRemove);
        // Clean up preferences
        for (const userId of usersToRemove) {
          await this.redis.hDel(USER_PREFERENCES_KEY, userId);
        }
      }

      return matches;
    } catch (error) {
      console.error('❌ Error during matching run:', error);
      return matches;
    }
  }

  private calculateCompatibility(pref1: MatchRequest, pref2: MatchRequest): number {
    let score = 1.0; // Start with 1

    // Mode compatibility
    if (pref1.preferences.mode === pref2.preferences.mode) {
      score *= 1.0; // Perfect match
    } else {
      score *= 0.8; // Allow some flexibility
    }

    // Gender filter compatibility
    if (pref1.preferences.genderFilter || pref2.preferences.genderFilter) {
      const canMatch = this.checkGendercompatibility(
        pref1.preferences.genderFilter,
        pref2.preferences.genderFilter
      );
      score *= canMatch ? 1.0 : 0.0;
    }

    // Region compatibility
    if (pref1.preferences.regionFilter && pref2.preferences.regionFilter) {
      const regionOverlap = pref1.preferences.regionFilter.some((r) =>
        pref2.preferences.regionFilter?.includes(r)
      );
      score *= regionOverlap ? 1.0 : 0.7;
    }

    // Interest compatibility
    if (pref1.interests && pref2.interests) {
      const commonInterests = pref1.interests.filter((i) =>
        pref2.interests?.includes(i)
      ).length;
      const totalInterests = new Set([
        ...pref1.interests,
        ...(pref2.interests || []),
      ]).size;
      const interestScore = totalInterests > 0 ? commonInterests / totalInterests : 0.5;
      score *= 0.8 + 0.2 * interestScore;
    }

    // Time waiting factor (prioritize older requests)
    const waitTime1 = Date.now() - pref1.joinedAt;
    const waitTime2 = Date.now() - pref2.joinedAt;
    const maxWaitTime = 60000; // 60 seconds
    const waitFactor = 1 + (Math.min(waitTime1, maxWaitTime) / maxWaitTime) * 0.1;
    score *= Math.min(waitFactor, 1.1);

    return Math.min(score, 1.0);
  }

  private checkGenderCompatibility(gender1?: string, gender2?: string): boolean {
    if (!gender1 || !gender2) return true;
    if (gender1 === 'any' || gender2 === 'any') return true;
    if (gender1 === gender2) return true;
    return false;
  }

  async getQueueStats(): Promise<{ total: number; byMode: Record<string, number> }> {
    try {
      const total = await this.redis.zCard(MATCHING_QUEUE_KEY);
      const preferences = await this.redis.hGetAll(USER_PREFERENCES_KEY);

      const byMode: Record<string, number> = {};
      for (const prefs of Object.values(preferences)) {
        const mode = JSON.parse(prefs).preferences.mode;
        byMode[mode] = (byMode[mode] || 0) + 1;
      }

      return { total, byMode };
    } catch (error) {
      console.error('❌ Error getting queue stats:', error);
      throw error;
    }
  }
}
