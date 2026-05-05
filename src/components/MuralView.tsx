import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Bell, Check, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { markNotificationAsRead, markEventAsRead, NotificationFilter } from '../services/api';
import { AppNotification } from '../lib/types';
import { Badge, Button, Card, EmptyState, Page, SectionTitle } from './ui';

const NOTIFICATION_PAGE_SIZE = 20;

const filterOptions: { id: NotificationFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'unread', label: 'Não lidas' },
  { id: 'social', label: 'Social' },
  { id: 'payments', label: 'Pagamentos' },
  { id: 'admin', label: 'Admin' },
];

export function MuralView({ onNavigateNotification }: { onNavigateNotification?: (notification: AppNotification) => void }) {
  const { events, myNotifications, user } = useApp();
  const [markingRead, setMarkingRead] = useState<string | null>(null);
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>('all');
  const [visibleNotificationCount, setVisibleNotificationCount] = useState(NOTIFICATION_PAGE_SIZE);

  const availableFilters = user?.role === 'admin' ? filterOptions : filterOptions.filter((option) => option.id !== 'admin');
  const filteredNotifications = useMemo(
    () => myNotifications.filter((notification) => matchesNotificationFilter(notification, notificationFilter, user?.role)),
    [myNotifications, notificationFilter, user?.role],
  );
  const visibleNotifications = filteredNotifications.slice(0, visibleNotificationCount);
  const hasMoreNotifications = visibleNotificationCount < filteredNotifications.length;

  const handleMarkAsRead = async (eventId: string) => {
    if (!user) return;
    setMarkingRead(eventId);
    try {
      await markEventAsRead(eventId, user.uid);
    } finally {
      setMarkingRead(null);
    }
  };

  return (
    <Page className="space-y-8">
      <section>
        <SectionTitle
          icon={<Bell className="text-brand-600" size={20} />}
          action={<span className="text-xs font-semibold text-ink-400">{filteredNotifications.length}</span>}
        >
          Notificações
        </SectionTitle>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {availableFilters.map((option) => (
            <Button
              key={option.id}
              onClick={() => {
                setNotificationFilter(option.id);
                setVisibleNotificationCount(NOTIFICATION_PAGE_SIZE);
              }}
              variant={notificationFilter === option.id ? 'primary' : 'secondary'}
              size="sm"
              className="shrink-0 rounded-full"
            >
              {option.label}
            </Button>
          ))}
        </div>

        {filteredNotifications.length === 0 ? (
          <EmptyState>Nenhuma notificação no momento.</EmptyState>
        ) : (
          <div className="space-y-3">
            {visibleNotifications.map((notification) => (
              <Card
                key={notification.id}
                as="button"
                onClick={async () => {
                  if (!notification.isRead) await markNotificationAsRead(notification.id);
                  onNavigateNotification?.(notification);
                }}
                className={`w-full p-4 text-left transition-all active:scale-[0.99] ${notification.isRead ? 'opacity-75 hover:border-ink-200' : 'border-brand-100 bg-brand-50 ring-1 ring-brand-500/10'}`}
              >
                <div className="mb-1 flex items-start justify-between">
                  <h4 className={`text-sm font-semibold ${notification.isRead ? 'text-ink-700' : 'text-brand-700'}`}>{notification.title}</h4>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    {!notification.isRead && <span className="h-2 w-2 rounded-full bg-brand-600"></span>}
                    <ChevronRight size={16} className="text-ink-300" />
                  </div>
                </div>
                <p className={`text-xs leading-relaxed ${notification.isRead ? 'text-ink-500' : 'text-brand-700'}`}>{notification.message}</p>
                <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-ink-400">
                  <Badge tone={notificationTone(notification)} className="rounded-md px-1.5 py-0.5 text-[10px]">
                    {notificationLabel(notification)}
                  </Badge>
                  <span>{format(parseISO(notification.createdAt), "d 'de' MMM, HH:mm", { locale: ptBR })}</span>
                </div>
              </Card>
            ))}
            {hasMoreNotifications && (
              <div className="pt-1 text-center">
                <Button
                  onClick={() => setVisibleNotificationCount((count) => count + NOTIFICATION_PAGE_SIZE)}
                  variant="ghost"
                  className="rounded-full text-brand-600"
                >
                  Carregar mais
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <SectionTitle icon={<Calendar className="text-brand-600" size={20} />}>
          Eventos e Avisos
        </SectionTitle>

        {events.length === 0 ? (
          <EmptyState>Nenhum evento agendado.</EmptyState>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <Card key={event.id} className="relative overflow-hidden p-4">
                <div className={`absolute left-0 top-0 h-full w-1.5 ${event.type === 'event' ? 'bg-brand-600' : 'bg-warning-600'}`}></div>
                <div className="pl-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge tone={event.type === 'event' ? 'brand' : 'warning'} className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider">
                      {event.type === 'event' ? 'Evento' : 'Aviso'}
                    </Badge>
                    <span className="text-xs font-medium text-ink-500">
                      {event.date ? format(parseISO(event.date), 'dd/MM/yyyy', { locale: ptBR }) : ''}
                      {event.time ? ` às ${event.time}` : ''}
                    </span>
                  </div>
                  <h4 className="text-base font-semibold text-ink-900">{event.title}</h4>
                  <p className="mt-1.5 rounded-2xl bg-ink-50 p-3 text-sm leading-relaxed text-ink-700">
                    {event.description}
                  </p>

                  {event.type === 'announcement' && user && (
                    <div className="mt-3 flex justify-end">
                      {event.readBy?.includes(user.uid) ? (
                        <Badge tone="success" className="gap-1.5">
                          <Check size={14} className="mr-1" /> Lido
                        </Badge>
                      ) : (
                        <Button
                          onClick={() => handleMarkAsRead(event.id)}
                          disabled={markingRead === event.id}
                          variant="ghost"
                          size="sm"
                          className="text-brand-600"
                        >
                          {markingRead === event.id ? 'Marcando...' : 'Marcar como ciente'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}

function matchesNotificationFilter(notification: AppNotification, filter: NotificationFilter, role?: string) {
  if (filter === 'unread') return !notification.isRead;
  if (filter === 'social') return notification.type === 'post_comment' || notification.type === 'post_like' || notification.type === 'mention';
  if (filter === 'payments') return notification.type === 'payment';
  if (filter === 'admin') return role === 'admin' && notification.userId === 'admins';
  return true;
}

function notificationLabel(notification: AppNotification) {
  if (notification.type === 'post_comment') return 'Comentário';
  if (notification.type === 'post_like') return 'Curtida';
  if (notification.type === 'mention') return 'Menção';
  if (notification.type === 'payment') return 'Pagamento';
  if (notification.type === 'event') return 'Aviso';
  if (notification.userId === 'admins') return 'Admin';
  return 'Geral';
}

function notificationTone(notification: AppNotification): 'neutral' | 'brand' | 'success' | 'warning' | 'danger' {
  if (notification.type === 'payment') return 'warning';
  if (notification.userId === 'admins') return 'danger';
  if (notification.type === 'mention' || notification.type === 'post_comment' || notification.type === 'post_like') return 'brand';
  if (notification.type === 'event') return 'success';
  return 'neutral';
}
