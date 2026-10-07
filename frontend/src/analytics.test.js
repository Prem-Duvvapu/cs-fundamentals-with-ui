import { describe, expect, it } from 'vitest';
import { redactAnalyticsUrl } from './analytics';

describe('analytics URL privacy', () => {
  it('removes search terms and fragments while retaining the visited route', () => {
    const event = {
      type: 'pageview',
      url: 'https://example.vercel.app/topic/cache?search=private-note&view=practice#answer',
    };
    expect(redactAnalyticsUrl(event)).toEqual({
      type: 'pageview',
      url: 'https://example.vercel.app/topic/cache',
    });
    expect(event.url).toContain('private-note');
  });

  it('preserves ordinary page locations', () => {
    const event = { type: 'pageview', url: 'https://example.vercel.app/' };
    expect(redactAnalyticsUrl(event)).toEqual(event);
  });

  it('drops malformed URLs instead of sending their raw values', () => {
    expect(redactAnalyticsUrl({ type: 'pageview', url: 'private note' })).toBeNull();
  });
});
