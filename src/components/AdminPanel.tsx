import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Plus, Receipt, Settings, Users, Edit3, Loader2, Send, Trash2, Eye, Calendar } from 'lucide-react';
import { approvePayment, rejectPayment, addExpense, updateConfig, updateProfile, addEvent, deleteEvent, createCharges, deleteUserAndData, uploadProofAndSubmit, deletePayment, exportFullBackup, restoreZippedBackup, createOfflineUser, createManualPayment, resolveIdentityLinkSuggestion } from '../services/api';
import { Payment, UserProfile, AppEvent, IdentityLinkSuggestion } from '../lib/types';
import { ImageWithSkeleton } from './ImageWithSkeleton';
import { formatPhoneBR, normalizePhoneBR, PHONE_BR_PLACEHOLDER } from '../lib/utils';
import { AdminFeedbackProvider, useAdminFeedback } from './AdminFeedback';

const DeletableUserButton = ({ u, deleteUserAndData }: { u: UserProfile, deleteUserAndData: (id: string) => Promise<void> }) => {
  const [confirming, setConfirming] = useState(false);
  const { toast } = useAdminFeedback();
  
  if (u.email === 'peritto@gmail.com') {
    return (
      <div className="flex-1 text-[10px] bg-blue-50 text-blue-700 py-1.5 rounded-lg font-bold text-center uppercase tracking-wide border border-blue-100">
        👑 Owner
      </div>
    );
  }
  
  if (confirming) {
    return (
      <div className="flex-1 flex gap-1 animate-in zoom-in-95">
        <button onClick={() => setConfirming(false)} className="flex-1 text-[10px] bg-gray-100 text-gray-600 py-1.5 rounded-lg border border-gray-200">Cancelar</button>
        <button onClick={async () => {
          await deleteUserAndData(u.uid);
          toast('Dados apagados.');
        }} className="flex-1 text-[10px] bg-red-500 text-white py-1.5 rounded-lg active:bg-red-600 shadow-sm">Sim, Excluir</button>
      </div>
    );
  }
  return (
    <button 
      onClick={() => setConfirming(true)}
      className="flex-1 text-[10px] bg-red-50 text-red-600 py-1.5 rounded-lg font-medium transition-colors hover:bg-red-100"
      title="Excluir Dados (LGPD)"
    >
      Excluir (LGPD)
    </button>
  );
};

const EventCard = ({ evt, allUsers }: { evt: AppEvent, allUsers: UserProfile[] }) => {
  const [confirming, setConfirming] = useState(false);
  const residentCount = allUsers.filter(u => u.role === 'resident').length;
  const readCount = evt.readBy?.length || 0;
  const isEvent = evt.type === 'event';
  
  return (
    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <div>
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${isEvent ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
            {isEvent ? 'Evento' : 'Aviso'}
          </span>
          <h4 className="text-sm font-semibold text-gray-800 mt-1">{evt.title}</h4>
        </div>
        
        {confirming ? (
          <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg origin-top-right animate-in zoom-in-95">
             <span className="text-[10px] text-red-600 font-medium px-1">Excluir?</span>
             <button onClick={() => setConfirming(false)} className="text-[10px] bg-white px-2 py-1 rounded text-gray-600 shadow-sm border border-gray-200">Não</button>
             <button onClick={async () => {
               await deleteEvent(evt.id);
             }} className="text-[10px] bg-red-500 px-2 py-1 rounded text-white shadow-sm">Sim</button>
          </div>
        ) : (
          <button className="text-gray-400 hover:text-red-500 transition-colors p-1" onClick={() => setConfirming(true)}>
            <XCircle size={16} />
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
        <span className="flex items-center gap-1" title="Visualizações">
          <Eye size={14} /> {readCount} / {residentCount}
        </span>
        {isEvent && evt.date && (
          <span className="flex items-center gap-1">
            <Calendar size={14} /> {format(new Date(evt.date), 'dd/MM/yyyy')} {evt.time}
          </span>
        )}
      </div>
    </div>
  );
};

export function AdminPanel() {
  return (
    <AdminFeedbackProvider>
      <AdminPanelContent />
    </AdminFeedbackProvider>
  );
}

function AdminPanelContent() {
  const { allPayments, allUsers, appConfig, identityLinkSuggestions } = useApp();
  const { confirm, toast } = useAdminFeedback();
  const [tab, setTab] = useState<'approvals' | 'expense' | 'rateio' | 'users' | 'settings' | 'comms'>('approvals');
  const [editingPhoneUid, setEditingPhoneUid] = useState<string | null>(null);

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
          onClick={() => setTab('rateio')}
          className={`flex-1 min-w-[30%] py-2 text-xs sm:text-sm font-medium rounded-xl transition-all ${tab === 'rateio' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
        >
          Rateio
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
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-800 text-lg mb-3">Aguardando Avaliação</h3>
            {allPayments.filter(p => p.status === 'analyzing').length === 0 ? (
               <div className="text-center text-gray-400 text-sm py-6 bg-white rounded-3xl border border-gray-100">
                 Tudo limpo! Nenhuma pendência para analisar.
               </div>
            ) : (
              <div className="space-y-4">
                {allPayments.filter(p => p.status === 'analyzing').map(payment => {
                  const u = allUsers.find(x => x.familyId === payment.familyId || x.uid === payment.familyId);
                  return <ApprovalCard key={payment.id} payment={payment} userName={u?.name ? u.name + ' (Família)' : 'Família'} />;
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 text-lg mb-3">Cobranças Pendentes</h3>
            {allPayments.filter(p => p.status === 'pending').length === 0 ? (
               <div className="text-center text-gray-400 text-sm py-6 bg-white rounded-3xl border border-gray-100">
                 Nenhuma cobrança pendente.
               </div>
            ) : (
              <div className="space-y-4">
                {allPayments.filter(p => p.status === 'pending').map(payment => {
                  const u = allUsers.find(x => x.familyId === payment.familyId || x.uid === payment.familyId);
                  return <PendingChargeCard key={payment.id} payment={payment} userName={u?.name ? u.name + ' (Família)' : 'Família'} />;
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'expense' && <ExpenseForm />}
      {tab === 'rateio' && <RateioForm />}

      {tab === 'users' && (
        <div className="space-y-4">
          <ManualPaymentForm allUsers={allUsers} />
          <IdentityLinkSuggestionsPanel suggestions={identityLinkSuggestions} />
          <h3 className="font-semibold text-gray-800 text-lg mb-2">Pessoas ({allUsers.length})</h3>
          {allUsers.map(u => (
            <div key={u.uid} className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col gap-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800 text-sm">{u.name}</p>
                    {u.userStatus === 'pending' && <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Pendente</span>}
                    {u.userStatus === 'blocked' && <span className="text-[10px] uppercase font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Bloqueado</span>}
                    {u.userStatus === 'active' && <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Ativo</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    Contato: 
                    {editingPhoneUid === u.uid ? (
                      <form 
                        className="flex items-center gap-1 inline-flex"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          updateProfile(u.uid, { phone: normalizePhoneBR(String(formData.get('phone') || '')) });
                          setEditingPhoneUid(null);
                        }}
                      >
                         <input
                           name="phone"
                           defaultValue={formatPhoneBR(u.phone)}
                           placeholder={PHONE_BR_PLACEHOLDER}
                           inputMode="tel"
                           autoComplete="tel-national"
                           maxLength={15}
                           className="border border-gray-300 rounded px-1 py-0.5 w-32 text-[10px]"
                           autoFocus
                         />
                         <button type="submit" className="text-emerald-500 bg-emerald-50 px-1 py-0.5 rounded text-[10px]">OK</button>
                      </form>
                    ) : (
                      <>
                        {formatPhoneBR(u.phone) || '-'}
                        <button 
                          onClick={() => setEditingPhoneUid(u.uid)}
                          className="ml-1 text-blue-500 hover:text-blue-700 transition-colors p-1"
                          title="Editar telefone"
                        >
                          <Edit3 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    const isAdmin = u.role === 'admin';
                    const nextRole = isAdmin ? 'resident' : 'admin';
                    const confirmed = await confirm({
                      title: 'Alterar papel',
                      message: `Alterar ${u.name} para ${nextRole === 'admin' ? 'Admin' : 'Pessoa'}?`,
                      confirmLabel: 'Alterar',
                    });
                    if (!confirmed) return;
                    await updateProfile(u.uid, { role: nextRole });
                    toast('Papel atualizado.');
                  }}
                  className={`text-xs px-2 py-1 rounded-md font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}
                  title="Alterar papel"
                >
                  {u.role === 'admin' ? 'Admin' : 'Pessoa'}
                </button>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                {u.userStatus === 'pending' && (
                  <button 
                    onClick={() => updateProfile(u.uid, { userStatus: 'active' })}
                    className="flex-1 text-xs bg-emerald-500 active:bg-emerald-600 text-white py-1.5 rounded-lg font-medium transition-colors"
                  >
                    Aprovar Acesso
                  </button>
                )}
                {u.userStatus !== 'pending' && (
                  <button 
                    onClick={() => updateProfile(u.uid, { userStatus: u.userStatus === 'blocked' ? 'active' : 'blocked' })}
                    className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${u.userStatus === 'blocked' ? 'bg-amber-100 text-amber-700 active:bg-amber-200' : 'bg-orange-100 text-orange-700 active:bg-orange-200'}`}
                  >
                    {u.userStatus === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                  </button>
                )}
                <DeletableUserButton u={u} deleteUserAndData={deleteUserAndData} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'comms' && <CommsManager />}

      {tab === 'settings' && <SettingsForm />}

    </div>
  );
}

function ManualPaymentForm({ allUsers }: { allUsers: UserProfile[] }) {
  const { toast } = useAdminFeedback();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dogName, setDogName] = useState('');
  const [amount, setAmount] = useState('25');
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [type, setType] = useState<NonNullable<Payment['type']>>('mensalidade');
  const [description, setDescription] = useState('Comprovante recebido pelo WhatsApp');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const activeUsers = allUsers.filter((user) => user.userStatus !== 'blocked');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      toast('Anexe o comprovante recebido.', 'error');
      return;
    }
    setLoading(true);
    try {
      let familyId = selectedUserId;
      if (!familyId) {
        const offlineUser = await createOfflineUser({ name, phone: normalizePhoneBR(phone), dogName });
        familyId = offlineUser.uid;
      }
      await createManualPayment({
        familyId,
        amount: Number(amount || 0),
        month,
        type,
        description,
      }, file);
      toast('Pessoa e comprovante registrados no caixa.');
      setName('');
      setPhone('');
      setDogName('');
      setAmount('25');
      setDescription('Comprovante recebido pelo WhatsApp');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (error: any) {
      toast(error?.message || 'Erro ao registrar comprovante.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 border border-blue-100 shadow-sm space-y-4">
      <div>
        <h3 className="font-semibold text-gray-800 text-lg">Registrar pagamento externo</h3>
        <p className="text-xs text-gray-500 mt-1">Use para comprovantes enviados pelo WhatsApp, sem obrigar a pessoa a entrar no app.</p>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Pessoa existente</label>
        <select
          value={selectedUserId}
          onChange={(event) => setSelectedUserId(event.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
        >
          <option value="">Cadastrar nova pessoa offline</option>
          {activeUsers.map((user) => (
            <option key={user.uid} value={user.familyId || user.uid}>{user.name} {user.isOffline ? '(offline)' : ''}</option>
          ))}
        </select>
      </div>

      {!selectedUserId && (
        <div className="grid grid-cols-1 gap-3">
          <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome da pessoa" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm" />
          <input required value={phone} onChange={(event) => setPhone(formatPhoneBR(event.target.value))} placeholder={PHONE_BR_PLACEHOLDER} inputMode="tel" autoComplete="tel-national" maxLength={15} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm" />
          <input value={dogName} onChange={(event) => setDogName(event.target.value)} placeholder="Nome do pet (opcional)" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <input required type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm" />
        <input required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Valor" className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm" />
      </div>

      <select value={type} onChange={(event) => setType(event.target.value as NonNullable<Payment['type']>)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm">
        <option value="mensalidade">Mensalidade</option>
        <option value="doacao">Doação</option>
        <option value="rateio">Rateio</option>
      </select>

      <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descrição" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm" />

      <button type="button" onClick={() => fileRef.current?.click()} className="w-full bg-blue-50 text-blue-600 py-3 rounded-2xl font-medium flex items-center justify-center active:bg-blue-100">
        <Receipt size={18} className="mr-2" /> {file ? file.name : 'Anexar comprovante'}
      </button>
      <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />

      <button disabled={loading} type="submit" className="w-full bg-gray-900 active:bg-black text-white py-3.5 rounded-2xl font-medium flex items-center justify-center disabled:opacity-50">
        {loading ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} className="mr-2" /> Registrar no caixa</>}
      </button>
    </form>
  );
}

function IdentityLinkSuggestionsPanel({ suggestions }: { suggestions: IdentityLinkSuggestion[] }) {
  const { toast } = useAdminFeedback();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const pending = suggestions.filter((suggestion) => suggestion.status === 'pending');
  if (!pending.length) return null;

  const resolve = async (id: string, status: 'approved' | 'rejected') => {
    setLoadingId(id);
    try {
      await resolveIdentityLinkSuggestion(id, status);
      toast(status === 'approved' ? 'Vínculo aprovado e dados reunidos.' : 'Sugestão recusada.');
    } catch (error: any) {
      toast(error?.message || 'Erro ao resolver vínculo.', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-amber-50 rounded-3xl p-5 border border-amber-100 space-y-3">
      <h3 className="font-semibold text-amber-900 text-sm">Sugestões de vínculo por telefone</h3>
      {pending.map((suggestion) => (
        <div key={suggestion.id} className="bg-white rounded-2xl p-3 border border-amber-100">
          <p className="text-sm text-gray-800">
            <strong>{suggestion.sourceName}</strong> parece ser <strong>{suggestion.targetName}</strong>
          </p>
          <p className="text-xs text-gray-500 mt-1">Telefone: {formatPhoneBR(suggestion.phone)}</p>
          <div className="flex gap-2 mt-3">
            <button disabled={loadingId === suggestion.id} onClick={() => resolve(suggestion.id, 'rejected')} className="flex-1 text-xs bg-gray-100 text-gray-600 py-2 rounded-xl disabled:opacity-50">Recusar</button>
            <button disabled={loadingId === suggestion.id} onClick={() => resolve(suggestion.id, 'approved')} className="flex-1 text-xs bg-emerald-600 text-white py-2 rounded-xl disabled:opacity-50">Juntar dados</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsForm() {
  const { appConfig, user } = useApp();
  const { confirm, toast } = useAdminFeedback();
  const [pixKey, setPixKey] = useState(appConfig?.pixKey || '');
  const [monthlyAmount, setMonthlyAmount] = useState(appConfig?.monthlyAmount?.toString() ?? '30');
  const [dueDateDay, setDueDateDay] = useState(appConfig?.dueDateDay?.toString() ?? '10');
  const [paymentInstructions, setPaymentInstructions] = useState(appConfig?.paymentInstructions || '');
  const [loading, setLoading] = useState(false);
  const restoreFileRef = useRef<HTMLInputElement>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await updateConfig({ 
      pixKey, 
      monthlyAmount: parseFloat(monthlyAmount) || 0,
      dueDateDay: parseInt(dueDateDay, 10) || 1,
      paymentInstructions
    });
    setLoading(false);
    toast('Configurações salvas.');
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

      <div className="pt-6 border-t border-gray-100 mt-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Backup de Segurança</h3>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          O backup é importante e deu. Salve este arquivo num local seguro, como o seu Google Drive, para usarmos como checkpoint de restauração caso necessário.
        </p>
        <button 
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              const zipBlob = await exportFullBackup();
              if (zipBlob) {
                const url = URL.createObjectURL(zipBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup_petplace_${new Date().toISOString().split('T')[0]}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }
            } catch (err: any) {
              toast('Erro ao exportar backup: ' + (err?.message || err), 'error');
            } finally {
              setLoading(false);
            }
          }}
          className="w-full bg-blue-50 text-blue-600 active:bg-blue-100 py-3 rounded-xl font-medium flex items-center justify-center transition-all disabled:opacity-50"
        >
          {loading ? 'Preparando ZIP...' : 'Baixar Dados e Mídias (ZIP)'}
        </button>
        
        {user?.email === 'peritto@gmail.com' && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Opções do Owner 👑</h4>
            <input 
              type="file" 
              accept=".zip" 
              className="hidden" 
              ref={restoreFileRef}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const confirmed = await confirm({
                  title: 'Restaurar backup',
                  message: 'Isso irá restaurar todos os dados e imagens do arquivo ZIP no banco de dados. Deseja continuar?',
                  confirmLabel: 'Restaurar',
                  variant: 'danger',
                });
                if (!confirmed) return;
                setLoading(true);
                try {
                  await restoreZippedBackup(file);
                } catch (err: any) {
                  toast('Erro na restauração: ' + (err?.message || err), 'error');
                } finally {
                  setLoading(false);
                  if (restoreFileRef.current) restoreFileRef.current.value = '';
                }
              }}
            />
            <button 
              type="button"
              disabled={loading}
              onClick={() => restoreFileRef.current?.click()}
              className="w-full bg-red-50 text-red-600 active:bg-red-100 py-3 rounded-xl font-medium flex items-center justify-center transition-all disabled:opacity-50 text-xs"
            >
              {loading ? 'Restaurando...' : 'Restaurar Checkpoint (ZIP)'}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

const ApprovalCard: React.FC<{ payment: Payment, userName?: string }> = ({ payment, userName }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useAdminFeedback();
  const { setFullscreenImage } = useApp();

  const handleAction = async (action: 'approve' | 'reject') => {
    try {
      setIsProcessing(true);
      if (action === 'approve') {
        await approvePayment(payment.id);
      } else {
        await rejectPayment(payment.id);
      }
    } catch (err) {
      toast('Erro ao processar pagamento. Tente novamente.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-semibold text-gray-800">{userName || 'User'}</h4>
          <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-md mt-1 inline-block">
            {payment.type === 'doacao' ? 'Doação' : payment.type === 'rateio' ? 'Rateio' : 'Mensalidade'} • Ref: {payment.month}
          </span>
          {payment.description && <p className="text-sm text-gray-600 mt-1">{payment.description}</p>}
        </div>
        <span className="font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-xl text-sm whitespace-nowrap ml-2">
          R$ {payment.amount.toFixed(2)}
        </span>
      </div>
      
      {payment.proofUrl && (
        <button
          type="button"
          onClick={() => setFullscreenImage({ url: payment.proofUrl!, title: `Comprovante: ${userName || 'Pagamento'}` })}
          className="w-full h-48 rounded-2xl mb-4 overflow-hidden block text-left transition-transform active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Abrir comprovante em tela cheia"
        >
          <ImageWithSkeleton
            src={payment.proofUrl}
            alt="Comprovante"
            className="w-full h-48 object-cover border border-gray-100 cursor-zoom-in"
            containerClassName="w-full h-48 rounded-2xl overflow-hidden"
          />
        </button>
      )}
      
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

const PendingChargeCard: React.FC<{ payment: Payment, userName?: string }> = ({ payment, userName }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useAdminFeedback();

  const handleUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      await uploadProofAndSubmit(payment.id, file);
      toast('Comprovante anexado. A cobrança foi movida para avaliação.');
    } catch (err) {
      toast('Erro ao enviar comprovante.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-semibold text-gray-800">{userName || 'User'}</h4>
          <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-md mt-1 inline-block">
            {payment.type === 'doacao' ? 'Doação' : payment.type === 'rateio' ? 'Rateio' : 'Mensalidade'} • Ref: {payment.month}
          </span>
          {payment.description && <p className="text-sm text-gray-600 mt-1">{payment.description}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-xl text-sm whitespace-nowrap ml-2">
            R$ {payment.amount.toFixed(2)}
          </span>
          {confirmingDelete ? (
            <div className="bg-red-50 p-2 rounded-lg flex flex-col gap-1 mt-1 origin-top-right animate-in zoom-in-95">
              <span className="text-[10px] text-red-600 font-medium whitespace-nowrap">Confirmar exclusão?</span>
              <div className="flex gap-1 justify-end mt-1">
                 <button disabled={isProcessing} onClick={() => setConfirmingDelete(false)} className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded shadow-sm text-gray-600 transition-colors active:bg-gray-50 disabled:opacity-50">Não</button>
                 <button disabled={isProcessing} onClick={async () => {
                   setIsProcessing(true);
                   try {
                     await deletePayment(payment.id);
                   } catch (e: any) {
                     toast(e.message || 'Erro ao excluir cobrança.', 'error');
                   } finally {
                     setIsProcessing(false);
                     setConfirmingDelete(false);
                   }
                 }} className="text-[10px] bg-red-500 px-2 py-1 rounded shadow-sm text-white transition-colors active:bg-red-600 disabled:opacity-50">Sim, excluir</button>
              </div>
            </div>
          ) : (
            <button 
              disabled={isProcessing}
              onClick={() => setConfirmingDelete(true)}
              className="text-gray-400 hover:text-red-500 transition-colors p-1"
              title="Apagar cobrança incorreta"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <button 
        disabled={isProcessing}
        onClick={() => fileRef.current?.click()}
        className="w-full bg-gray-50 text-gray-600 py-3 rounded-xl font-medium flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50"
      >
        {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <><Receipt size={18} className="mr-2" /> Anexar Comprovante do Morador</>}
      </button>
      <input 
        ref={fileRef} 
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={(e) => {
          if (e.target.files?.[0]) handleUpload(e.target.files[0]);
        }} 
      />
    </div>
  );
}

function ExpenseForm() {
  const { user } = useApp();
  const { toast } = useAdminFeedback();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast('Por favor, anexe o comprovante.', 'error');
      return;
    }
    setLoading(true);
    await addExpense({
      title,
      amount: parseFloat(amount) || 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      category: 'Geral',
      createdBy: user?.uid || '',
      createdAt: new Date().toISOString()
    }, file);
    setLoading(false);
    toast('Despesa lançada com sucesso.');
    setTitle('');
    setAmount('');
    setFile(null);
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
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Comprovante (Foto)</label>
        {file ? (
          <div className="relative w-full aspect-video bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 flex items-center justify-center">
            <img src={URL.createObjectURL(file)} alt="Preview" className="max-w-full max-h-full object-contain" />
            <button 
              type="button"
              className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full backdrop-blur-md"
              onClick={() => { setFile(null); if(fileRef.current) fileRef.current.value=''; }}
            >
              <XCircle size={20} />
            </button>
          </div>
        ) : (
          <button 
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full bg-gray-50 border border-dashed border-gray-300 rounded-2xl py-6 flex flex-col items-center justify-center text-gray-500 active:bg-gray-100"
          >
            <Receipt size={24} className="mb-2 opacity-50" />
            <span className="text-sm font-medium">Tocar para Anexar</span>
          </button>
        )}
        <input ref={fileRef} type="file" required={!file} accept="image/*" className="hidden" onChange={e => {
          if (e.target.files?.[0]) setFile(e.target.files[0]);
        }} />
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

function RateioForm() {
  const { allUsers } = useApp();
  const { confirm, toast } = useAdminFeedback();
  const [desc, setDesc] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Active users only to avoid charging pending/blocked people unless desired, but let's just show all active
  const selectableUsers = allUsers.filter(u => u.userStatus === 'active' || u.userStatus === undefined);

  const handleToggleUser = (uid: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedUsers(new Set(selectableUsers.map(u => u.uid)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) {
      toast('Adicione uma descrição do rateio.', 'error');
      return;
    }
    const amt = parseFloat(amountStr);
    if (!amt || amt <= 0) {
      toast('Adicione um valor válido para dividir.', 'error');
      return;
    }
    if (selectedUsers.size === 0) {
      toast('Selecione pelo menos uma pessoa.', 'error');
      return;
    }
    
    const valuePerPerson = amt / selectedUsers.size;
    const isConfirmed = await confirm({
      title: 'Gerar rateio',
      message: `O valor total de R$ ${amt.toFixed(2)} será dividido entre ${selectedUsers.size} pessoas. Cada pessoa pagará R$ ${valuePerPerson.toFixed(2)}.`,
      confirmLabel: 'Gerar',
    });
    if (!isConfirmed) return;

    setLoading(true);
    
    try {
      // Group charges by family
      const familyCharges: Record<string, number> = {};
      for (const uid of selectedUsers) {
        const user = selectableUsers.find(u => u.uid === uid);
        if (user) {
          const fId = user.familyId || user.uid;
          familyCharges[fId] = (familyCharges[fId] || 0) + valuePerPerson;
        }
      }

      const currentMonth = format(new Date(), 'yyyy-MM');
      const charges: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'proofUrl'>[] = Object.entries(familyCharges).map(([familyId, amount]) => ({
        familyId,
        month: currentMonth,
        amount,
        status: 'pending',
        type: 'rateio',
        description: desc.trim()
      }));

      await createCharges(charges);
      
      toast('Rateio gerado com sucesso. As famílias verão a cobrança agregada.');
      setDesc('');
      setAmountStr('');
      setSelectedUsers(new Set());
    } catch(e: any) {
      toast('Erro ao gerar rateio: ' + (e.message || e), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">O que é este rateio?</label>
        <input 
          type="text" 
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Ex: Churrasco de Junho"
          required
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-600"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Valor Total p/ Dividir (R$)</label>
        <input 
          type="number" 
          step="0.01" 
          value={amountStr}
          onChange={e => setAmountStr(e.target.value)}
          required
          placeholder="0.00"
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-600"
        />
      </div>
      
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3 text-sm">
          <label className="font-semibold text-gray-800">Pessoas a cobrar ({selectedUsers.size} sel.)</label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => handleSelectAll(true)} className="text-blue-600 font-medium">Todas</button>
            <button type="button" onClick={() => handleSelectAll(false)} className="text-red-500 font-medium">Nenhuma</button>
          </div>
        </div>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 pb-2 hide-scrollbar">
          {selectableUsers.map(u => {
            const isSelected = selectedUsers.has(u.uid);
            return (
              <div 
                key={u.uid} 
                className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer select-none transition-colors ${isSelected ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}
                onClick={() => handleToggleUser(u.uid)}
              >
                <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600' : 'bg-white border border-gray-300'}`}>
                  {isSelected && <CheckCircle2 size={14} className="text-white" />}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>{u.name}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button 
        disabled={loading}
        type="submit"
        className="w-full mt-4 bg-gray-900 active:bg-black text-white py-4 rounded-2xl font-medium flex items-center justify-center transition-all disabled:opacity-50"
      >
        {loading ? 'Gerando...' : <><Plus size={20} className="mr-2" /> Gerar Cobranças</>}
      </button>
    </form>
  );
}

function CommsForm() {
  const { user } = useApp();
  const { toast } = useAdminFeedback();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'event' | 'announcement'>('announcement');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notifyNow, setNotifyNow] = useState(true);
  const [notify24h, setNotify24h] = useState(false);
  const [notify1h, setNotify1h] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const eventId = await addEvent({
        title,
        description: desc,
        type,
        date,
        time,
        notifyNow: type === 'event' ? notifyNow : true,
        notify24h: type === 'event' ? notify24h : false,
        notify1h: type === 'event' ? notify1h : false,
        readBy: [],
        createdBy: user?.uid || ''
      });
      
      // O Worker unificado cria a notificação e dispara Web Push quando notifyNow=true.
      void eventId;

      toast('Publicado.');
      setTitle('');
      setDesc('');
      setDate('');
      setTime('');
      setNotifyNow(true);
      setNotify24h(false);
      setNotify1h(false);
    } catch(err) {
      toast('Erro ao publicar.', 'error');
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
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Título</label>
        <input 
          required value={title} onChange={e => setTitle(e.target.value)}
          placeholder={type === 'announcement' ? "Ex: Aplicação de veneno no mato." : "Ex: Churrasco de Junho"}
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
        <div className="flex flex-col gap-3">
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
          
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mt-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 block">Notificações</label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={notifyNow} onChange={e => setNotifyNow(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm text-gray-700">Notificar agora</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={notify24h} onChange={e => setNotify24h(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm text-gray-700">Notificar 24h antes</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={notify1h} onChange={e => setNotify1h(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm text-gray-700">Notificar 1h antes</span>
              </label>
            </div>
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

function CommsManager() {
  const { events, allUsers } = useApp();
  const { confirm } = useAdminFeedback();
  
  return (
    <div className="space-y-6">
      <CommsForm />
      
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Mural Recente</h3>
        <div className="space-y-4">
          {events.length === 0 ? (
             <p className="text-sm text-gray-400 italic text-center py-4">Nenhum aviso ou evento publicado.</p>
          ) : events.map(evt => {
             const residentCount = allUsers.filter(u => u.role === 'resident').length;
             const readCount = evt.readBy?.length || 0;
             const isEvent = evt.type === 'event';
             return (
               <div key={evt.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex flex-col gap-2">
                 <div className="flex justify-between items-start">
                   <div>
                     <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${isEvent ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                       {isEvent ? 'Evento' : 'Aviso'}
                     </span>
                     <h4 className="text-sm font-semibold text-gray-800 mt-1">{evt.title}</h4>
                   </div>
                   <button className="text-gray-400 hover:text-red-500 transition-colors p-1" onClick={async () => {
                     if (await confirm({ title: 'Excluir item', message: 'Excluir este item do mural?', confirmLabel: 'Excluir', variant: 'danger' })) {
                       await deleteEvent(evt.id);
                     }
                   }}>
                     <XCircle size={16} />
                   </button>
                 </div>
                 
                 <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                   {!isEvent && (
                     <div className="flex items-center gap-1">
                       <CheckCircle2 size={14} className={readCount === residentCount && residentCount > 0 ? "text-green-500" : "text-gray-400"} />
                       Lido por {readCount} de {residentCount} pessoas
                     </div>
                   )}
                   {isEvent && (
                     <div className="flex items-center gap-1">
                       <span>📅 {format(new Date(evt.date + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                       {evt.time && <span>⏰ {evt.time}</span>}
                     </div>
                   )}
                 </div>
               </div>
             );
          })}
        </div>
      </div>
    </div>
  );
}
