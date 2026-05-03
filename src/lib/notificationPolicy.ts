export type NotificationKind = 'generic' | 'post_comment' | 'post_like' | 'payment' | 'event' | 'mention';

export interface InteractionNotificationInput {
  actorName: string;
  count?: number;
}

export function commentNotification({ actorName }: InteractionNotificationInput) {
  return {
    type: 'post_comment' as const,
    title: 'Novo comentário',
    message: `${firstName(actorName)} comentou na sua publicação.`,
  };
}

export function likeNotification({ actorName, count = 1 }: InteractionNotificationInput) {
  if (count <= 1) {
    return {
      type: 'post_like' as const,
      title: 'Nova curtida',
      message: `${firstName(actorName)} curtiu sua publicação.`,
    };
  }

  return {
    type: 'post_like' as const,
    title: 'Curtidas na sua publicação',
    message: `${count} pessoas curtiram sua publicação.`,
  };
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'Alguém';
}
