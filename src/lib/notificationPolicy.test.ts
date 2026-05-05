import { describe, expect, it } from 'vitest';
import { commentNotification, likeNotification, mentionNotification, paymentStatusNotification } from './notificationPolicy';

describe('notification policy', () => {
  it('creates direct comment notifications with a concise actor name', () => {
    expect(commentNotification({ actorName: 'Tutor Verde' })).toEqual({
      type: 'post_comment',
      title: 'Novo comentário',
      message: 'Tutor comentou na sua publicação.',
    });
  });

  it('keeps a single like notification personal', () => {
    expect(likeNotification({ actorName: 'Tutor Azul', count: 1 })).toEqual({
      type: 'post_like',
      title: 'Nova curtida',
      message: 'Tutor curtiu sua publicação.',
    });
  });

  it('aggregates multiple likes instead of producing noisy copy', () => {
    expect(likeNotification({ actorName: 'Tutor Azul', count: 4 })).toEqual({
      type: 'post_like',
      title: 'Curtidas na sua publicação',
      message: '4 pessoas curtiram sua publicação.',
    });
  });

  it('separates mention copy for comments from regular comments', () => {
    expect(mentionNotification({ actorName: 'Tutor Verde', context: 'comment' })).toEqual({
      type: 'mention',
      title: 'Nova menção',
      message: 'Tutor marcou você ou seu pet em um comentário.',
    });
  });

  it('notifies families when payment proof is approved or rejected', () => {
    expect(paymentStatusNotification('approved').title).toBe('Pagamento aprovado');
    expect(paymentStatusNotification('rejected').title).toBe('Comprovante recusado');
  });
});
