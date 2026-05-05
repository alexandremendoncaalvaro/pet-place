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

export function mentionNotification({ actorName, context }: InteractionNotificationInput & { context: 'post' | 'comment' }) {
  return {
    type: 'mention' as const,
    title: 'Nova menção',
    message: context === 'comment'
      ? `${firstName(actorName)} marcou você ou seu pet em um comentário.`
      : `${firstName(actorName)} marcou você ou seu pet em uma publicação.`,
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

export function paymentStatusNotification(status: 'approved' | 'rejected') {
  if (status === 'approved') {
    return {
      type: 'payment' as const,
      title: 'Pagamento aprovado',
      message: 'Seu comprovante foi aprovado. Obrigado por ajudar a manter o PetPlace.',
    };
  }

  return {
    type: 'payment' as const,
    title: 'Comprovante recusado',
    message: 'Seu comprovante precisa de revisão. Confira os detalhes do pagamento.',
  };
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'Alguém';
}
