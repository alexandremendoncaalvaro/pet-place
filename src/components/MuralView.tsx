import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Bell, Info, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { markNotificationAsRead, markEventAsRead } from '../services/api';
import { Badge, Button, Card, EmptyState, Page, SectionTitle } from './ui';

export function MuralView() {
  const { events, myNotifications, user } = useApp();
  const [markingRead, setMarkingRead] = useState<string | null>(null);

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

      {/* Pendências / Avisos Importantes */}
      <section>
        <SectionTitle icon={<Bell className="text-brand-600" size={20} />}>
          Minhas Notificações
        </SectionTitle>

        {myNotifications.length === 0 ? (
          <EmptyState>Nenhuma notificação no momento.</EmptyState>
        ) : (
          <div className="space-y-3">
            {myNotifications.map(n => (
              <Card
                key={n.id}
                onClick={() => {
                  if (!n.isRead) markNotificationAsRead(n.id);
                }}
                className={`p-4 transition-all ${n.isRead ? 'opacity-70' : 'border-brand-100 bg-brand-50 ring-1 ring-brand-500/10 cursor-pointer'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`font-semibold text-sm ${n.isRead ? 'text-ink-700' : 'text-brand-700'}`}>{n.title}</h4>
                  {!n.isRead && <span className="w-2 h-2 bg-brand-600 rounded-full mt-1.5 flex-shrink-0"></span>}
                </div>
                <p className={`text-xs ${n.isRead ? 'text-ink-500' : 'text-brand-700'} leading-relaxed`}>{n.message}</p>
                <div className="text-[10px] text-ink-400 mt-2 text-right">
                  {format(parseISO(n.createdAt), "d 'de' MMM, HH:mm", { locale: ptBR })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Agenda e Encontros */}
      <section>
        <SectionTitle icon={<Calendar className="text-brand-600" size={20} />}>
          Eventos e Avisos
        </SectionTitle>

        {events.length === 0 ? (
          <EmptyState>Nenhum evento agendado.</EmptyState>
        ) : (
          <div className="space-y-4">
            {events.map(ev => (
              <Card key={ev.id} className="p-4 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${ev.type === 'event' ? 'bg-brand-600' : 'bg-warning-600'}`}></div>
                <div className="pl-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge tone={ev.type === 'event' ? 'brand' : 'warning'} className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider">
                      {ev.type === 'event' ? 'Evento' : 'Aviso'}
                    </Badge>
                    <span className="text-xs text-ink-500 font-medium">
                      {ev.date ? format(parseISO(ev.date), "dd/MM/yyyy", { locale: ptBR }) : ''}
                      {ev.time ? ` às ${ev.time}` : ''}
                    </span>
                  </div>
                  <h4 className="font-semibold text-ink-900 text-base">{ev.title}</h4>
                  <p className="text-sm text-ink-700 mt-1.5 leading-relaxed bg-ink-50 p-3 rounded-2xl">
                    {ev.description}
                  </p>

                  {ev.type === 'announcement' && user && (
                    <div className="mt-3 flex justify-end">
                      {ev.readBy?.includes(user.uid) ? (
                        <Badge tone="success" className="gap-1.5">
                          <Check size={14} className="mr-1" /> Lido
                        </Badge>
                      ) : (
                        <Button
                          onClick={() => handleMarkAsRead(ev.id)}
                          disabled={markingRead === ev.id}
                          variant="ghost"
                          size="sm"
                          className="text-brand-600"
                        >
                          {markingRead === ev.id ? 'Marcando...' : 'Marcar como ciente'}
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
