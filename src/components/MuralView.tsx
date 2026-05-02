import React from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Bell, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { markNotificationAsRead } from '../services/api';

export function MuralView() {
  const { events, myNotifications } = useApp();

  return (
    <div className="p-6 max-w-lg mx-auto pb-24 space-y-8">
      
      {/* Pendências / Avisos Importantes */}
      <section>
        <h3 className="text-gray-800 font-semibold mb-3 flex items-center">
          <Bell className="mr-2 text-blue-600" size={20} />
          Minhas Notificações
        </h3>
        
        {myNotifications.length === 0 ? (
          <p className="text-sm text-gray-500 italic bg-white p-4 rounded-3xl border border-gray-100 shadow-sm text-center">Nenhuma notificação no momento.</p>
        ) : (
          <div className="space-y-3">
            {myNotifications.map(n => (
              <div 
                key={n.id} 
                onClick={() => {
                  if (!n.isRead) markNotificationAsRead(n.id);
                }}
                className={`bg-white p-4 rounded-3xl border shadow-sm transition-all ${n.isRead ? 'border-gray-100 opacity-70' : 'border-blue-200 bg-blue-50/30 ring-1 ring-blue-500/10 cursor-pointer'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`font-semibold text-sm ${n.isRead ? 'text-gray-700' : 'text-blue-800'}`}>{n.title}</h4>
                  {!n.isRead && <span className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></span>}
                </div>
                <p className={`text-xs ${n.isRead ? 'text-gray-500' : 'text-blue-900/70'} leading-relaxed`}>{n.message}</p>
                <div className="text-[10px] text-gray-400 mt-2 text-right">
                  {format(parseISO(n.createdAt), "d 'de' MMM, HH:mm", { locale: ptBR })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Agenda e Encontros */}
      <section>
        <h3 className="text-gray-800 font-semibold mb-3 flex items-center">
          <Calendar className="mr-2 text-indigo-500" size={20} />
          Eventos e Avisos
        </h3>

        {events.length === 0 ? (
          <p className="text-sm text-gray-500 italic bg-white p-4 rounded-3xl border border-gray-100 shadow-sm text-center">Nenhum evento agendado.</p>
        ) : (
          <div className="space-y-4">
            {events.map(ev => (
              <div key={ev.id} className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${ev.type === 'event' ? 'bg-indigo-500' : 'bg-amber-400'}`}></div>
                <div className="pl-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${ev.type === 'event' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                      {ev.type === 'event' ? 'Evento' : 'Aviso'}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      {ev.date ? format(parseISO(ev.date), "dd/MM/yyyy", { locale: ptBR }) : ''}
                      {ev.time ? ` às ${ev.time}` : ''}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-800 text-base">{ev.title}</h4>
                  <p className="text-sm text-gray-600 mt-1.5 leading-relaxed bg-gray-50 p-3 rounded-2xl">
                    {ev.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      
    </div>
  );
}
