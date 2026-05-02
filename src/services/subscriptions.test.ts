import { describe, expect, it } from 'vitest';
import { matchesTopic } from './subscriptions';

describe('subscription topics', () => {
  it('matches exact realtime topics', () => {
    expect(matchesTopic('posts', ['posts'])).toBe(true);
    expect(matchesTopic('comments:post_1', ['comments:post_1'])).toBe(true);
    expect(matchesTopic('comments:post_2', ['comments:post_1'])).toBe(false);
  });

  it('supports wildcard invalidation for local broad refreshes', () => {
    expect(matchesTopic('*', ['posts'])).toBe(true);
    expect(matchesTopic('payments', ['*'])).toBe(true);
  });
});
