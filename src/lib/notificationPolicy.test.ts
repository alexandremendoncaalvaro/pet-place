import { describe, expect, it } from 'vitest';
import { commentNotification, likeNotification } from './notificationPolicy';

describe('notification policy', () => {
  it('creates direct comment notifications with a concise actor name', () => {
    expect(commentNotification({ actorName: 'Bruna Silva' })).toEqual({
      type: 'post_comment',
      title: 'Novo comentário',
      message: 'Bruna comentou na sua publicação.',
    });
  });

  it('keeps a single like notification personal', () => {
    expect(likeNotification({ actorName: 'Alexandre Alvaro', count: 1 })).toEqual({
      type: 'post_like',
      title: 'Nova curtida',
      message: 'Alexandre curtiu sua publicação.',
    });
  });

  it('aggregates multiple likes instead of producing noisy copy', () => {
    expect(likeNotification({ actorName: 'Alexandre Alvaro', count: 4 })).toEqual({
      type: 'post_like',
      title: 'Curtidas na sua publicação',
      message: '4 pessoas curtiram sua publicação.',
    });
  });
});
