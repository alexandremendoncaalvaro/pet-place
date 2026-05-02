import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Plus, Receipt, Settings, Users, Edit3, Loader2, Send } from 'lucide-react';
import { approvePayment, rejectPayment, addExpense, updateConfig, updateProfile, addEvent, addNotification } from '../services/api';
import { Payment } from '../lib/types';

export function AdminPanel() {
  const { allPayments, allUsers, appConfig } = useApp();
  const [tab, setTab] = useState<'approvals' | 'expense' | 'users' | 'settings' | 'comms'>('approvals');

  return (
    <div className="p-6 max-w-lg mx-auto pb-24 space-y-6">
      
      {/* Tab Switcher */}
      <div className="bg-gray-200/50 p-1 rounded-2xl flex flex-wrap gap-1">
        <button 
          onClick={() => setTab('approvals')}
          className={`flex-1 min-w-[30%] py-2 text-xs sm:text-sm font-medium rounded-xl transition-all ${tab === 'approvals' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
        >
          Caixa
        </button>
        <button 
          onClick={() => setTab('expense')}
          className={`flex-1 min-w-[30%] py-2 text-xs sm:text-sm font-medium rounded-xl transition-all ${tab === 'expense' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
        >
          Despesa
        </button>
        <button 
          onClick={() => setTab('users')}
          className={`flex-1 min-w-[30%] py-2 text-xs sm:text-sm font-medium rounded-xl transition-all ${tab === 'users' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
        >
          Pessoas
        </button>
        <button 
          onClick={() => setTab('comms')}
          className={`flex-1 min-w-[30%] py-2 text-xs sm:text-sm font-medium rounded-xl transition-all ${tab === 'comms' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
        >
          Avisos
        </button>
        <button 
          onClick={() => setTab('settings')}
          className={`flex-1 min-w-[30%] py-2 px-1 text-xs sm:text-sm font-medium rounded-xl transition-all ${tab === 'settings' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
        >
          Ajustes
        </button>
      </div>

      {tab === 'approvals' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800 text-lg mb-2">Aguardando Avaliação</h3>
          {allPayments.filter(p => p.status === 'analyzing').length === 0 ? (
             <div className="text-center text-gray-400 text-sm py-8 bg-white rounded-3xl border border-gray-100">
               Tudo limpo! Nenhuma pendência.
             </div>
          ) : (
            allPayments.filter(p => p.status === 'analyzing').map(payment => {
              const u = allUsers.find(x => x.uid === payment.userId);
              return <ApprovalCard key={payment.id} payment={payment} userName={u?.name} />;
            })
          )}
        </div>
      )}

      {tab === 'expense' && <ExpenseForm />}

      {tab === 'users' && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800 text-lg mb-2">Moradores ({allUsers.length})</h3>
          {allUsers.map(u => (
            <div key={u.uid} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800 text-sm">{u.name}</p>
                <p className="text-xs text-gray-500">Contato: {u.phone || '-'}</p>
              </div>
              <button 
                onClick={() => {
                  const isAdmin = u.role === 'admin';
                  if(confirm(`Mudar papel de ${u.name} para ${isAdmin ? 'Morador' : 'Admin'}?`)) {
                    updateProfile(u.uid, { role: isAdmin ? 'resident' : 'admin' });
                  }
                }}
                className={`text-xs px-2 py-1 rounded-md font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}
              >
                {u.role === 'admin' ? 'Admin' : 'Morador'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'comms' && <CommsForm />}

      {tab === 'settings' && <SettingsForm />}

    </div>
  );
}

function SettingsForm() {
  const { appConfig } = useApp();
  const [pixKey, setPixKey] = useState(appConfig?.pixKey || '');
  const [monthlyAmount, setMonthlyAmount] = useState(appConfig?.monthlyAmount?.toString() || '30');
  const [dueDateDay, setDueDateDay] = useState(appConfig?.dueDateDay?.toString() || '10');
  const [paymentInstructions, setPaymentInstructions] = useState(appConfig?.paymentInstructions || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await updateConfig({ 
      pixKey, 
      monthlyAmount: parseFloat(monthlyAmount),
      dueDateDay: parseInt(dueDateDay, 10),
      paymentInstructions
    });
    setLoading(false);
    alert('Configurações salvas!');
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Chave Pix (Recebedor)</label>
        <input 
          required
          value={pixKey}
          onChange={e => setPixKey(e.target.value)}
          placeholder="ex: 11999999999 ou email@pix.com"
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Valor Mensalidade (R$)</label>
        <input 
          required
          type="number"
          step="0.01"
          value={monthlyAmount}
          onChange={e => setMonthlyAmount(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-600"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Dia de Vencimento</label>
        <input 
          required
          type="number"
          min="1"
          max="31"
          value={dueDateDay}
          onChange={e => setDueDateDay(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-600"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Instruções de Pagamento</label>
        <textarea 
          value={paymentInstructions}
          onChange={e => setPaymentInstructions(e.target.value)}
          rows={3}
          placeholder="Ex: Transferir e anexar comprovante."
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-600 resize-none"
        />
      </div>
      <button 
        disabled={loading}
        type="submit"
        className="w-full mt-4 bg-gray-900 active:bg-black text-white py-4 rounded-2xl font-medium flex items-center justify-center transition-all disabled:opacity-50"
      >
        {loading ? 'Salvando...' : 'Salvar Ajustes'}
      </button>
    </form>
  );
}

const ApprovalCard: React.FC<{ payment: Payment, userName?: string }> = ({ payment, userName }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (action: 'approve' | 'reject') => {
    try {
      setIsProcessing(true);
      if (action === 'approve') {
        await approvePayment(payment.id);
      } else {
        await rejectPayment(payment.id);
      }
    } catch (err) {
      alert("Erro ao processar pagamento. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="font-semibold text-gray-800">{userName || 'User'}</h4>
          <span className="text-xs text-gray-400">Ref: {payment.month}</span>
        </div>
        <span className="font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-xl text-sm">
          R$ {payment.amount.toFixed(2)}
        </span>
      </div>
      
      <img src={payment.proofUrl} alt="Comprovante" className="w-full h-48 object-cover rounded-2xl mb-4 border border-gray-100" />
      
      <div className="flex gap-2">
        <button 
          disabled={isProcessing}
          onClick={() => handleAction('reject')}
          className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-medium flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50"
        >
          {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <><XCircle size={18} className="mr-2" /> Recusar</>}
        </button>
        <button 
          disabled={isProcessing}
          onClick={() => handleAction('approve')}
          className="flex-1 bg-emerald-50 text-emerald-600 py-3 rounded-xl font-medium flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50"
        >
          {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} className="mr-2" /> Aprovar</>}
        </button>
      </div>
    </div>
  );
}

function ExpenseForm() {
  const { user } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileRef.current?.files?.[0]) {
      alert("Por favor, anexe o comprovante.");
      return;
    }
    setLoading(true);
    await addExpense({
      title,
      amount: parseFloat(amount),
      date: format(new Date(), 'yyyy-MM-dd'),
      category: 'Geral',
      createdBy: user?.uid || '',
      createdAt: new Date().toISOString()
    }, fileRef.current.files[0]);
    setLoading(false);
    alert('Despesa lançada com sucesso!');
    setTitle('');
    setAmount('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">O que foi comprado?</label>
        <input 
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ex: Sacos de lixo e lona..."
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Valor (R$)</label>
        <input 
          required
          type="number"
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Nota Fiscal (Foto)</label>
        <button 
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full bg-gray-50 border border-dashed border-gray-300 rounded-2xl py-6 flex flex-col items-center justify-center text-gray-500 active:bg-gray-100"
        >
          <Receipt size={24} className="mb-2 opacity-50" />
          <span className="text-sm font-medium">Tocar para Anexar</span>
        </button>
        <input ref={fileRef} type="file" required accept="image/*" className="hidden" />
      </div>
      
      <button 
        disabled={loading}
        type="submit"
        className="w-full mt-4 bg-gray-900 active:bg-black text-white py-4 rounded-2xl font-medium flex items-center justify-center transition-all disabled:opacity-50"
      >
        {loading ? 'Lançando...' : <><Plus size={20} className="mr-2" /> Registrar Despesa</>}
      </button>
    </form>
  );
}

function CommsForm() {
  const { user } = useApp();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'event' | 'announcement' | 'notification'>('announcement');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (type === 'notification') {
        await addNotification({
          userId: 'all',
          title,
          message: desc
        });
        alert('Notificação enviada a todos!');
      } else {
        await addEvent({
          title,
          description: desc,
          type,
          date: date || undefined,
          time: time || undefined,
          createdBy: user?.uid || ''
        });
        alert('Aviso/Evento publicado no Mural!');
      }
      setTitle('');
      setDesc('');
      setDate('');
      setTime('');
    } catch(err) {
      alert('Erro ao publicar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
      <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-2xl">
        <button 
          type="button" 
          onClick={() => setType('announcement')} 
          className={`flex-1 py-2 text-xs font-medium rounded-xl select-none ${type === 'announcement' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
        >Aviso</button>
        <button 
          type="button" 
          onClick={() => setType('event')} 
          className={`flex-1 py-2 text-xs font-medium rounded-xl select-none ${type === 'event' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
        >Evento</button>
        <button 
          type="button" 
          onClick={() => setType('notification')} 
          className={`flex-1 py-2 text-xs font-medium rounded-xl select-none ${type === 'notification' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
        >Notificação</button>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Título</label>
        <input 
          required value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Ex: Vacinação em breve"
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
        />
      </div>
      
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Detalhes</label>
        <textarea 
          required value={desc} onChange={e => setDesc(e.target.value)} rows={3}
          placeholder="Descreva aqui..."
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm resize-none"
        />
      </div>

      {type === 'event' && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Data</label>
            <input 
              type="date" value={date} onChange={e => setDate(e.target.value)} required
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Hora (Opcional)</label>
            <input 
              type="time" value={time} onChange={e => setTime(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none text-sm"
            />
          </div>
        </div>
      )}

      <button 
        disabled={loading} type="submit"
        className="w-full mt-4 bg-blue-600 active:bg-blue-700 text-white py-3.5 rounded-2xl font-medium flex items-center justify-center transition-all disabled:opacity-50"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} className="mr-2" /> Publicar</>}
      </button>
    </form>
  );
}
