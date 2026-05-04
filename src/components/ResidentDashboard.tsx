import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Camera, CheckCircle2, Copy, AlertTriangle, Clock, Loader2, ImagePlus, X, Heart, Receipt } from 'lucide-react';
import { uploadProofAndSubmit } from '../services/api';
import { PostItem } from './PostItem';
import { NovaDoacaoModal } from './NovaDoacaoModal';
import { useFeedback } from './Feedback';
import { Badge, Button, Card, EmptyState, IconButton, ModalSurface, SectionTitle } from './ui';
import { isSupporterActiveForMonth } from '../lib/supporters';

export function ResidentDashboard({ onBecomeSupporter, onOpenTransparency }: { onBecomeSupporter?: () => void; onOpenTransparency?: () => void }) {
  const { user, myPayments, mySupporter, allExpenses, appConfig, posts, loadMorePosts, postLimit, setFullscreenImage } = useApp();
  const { toast } = useFeedback();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentPayment = myPayments.find(p => p.month === currentMonth);
  const isSupporterActive = isSupporterActiveForMonth(mySupporter, currentMonth);
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inviteStorageKey = `petplace_supporter_invite_dismissed_until:${user?.uid || 'anon'}`;
  const [inviteDismissedUntil, setInviteDismissedUntil] = useState(0);

  // Modal State
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);

  const monthLabel = format(parseISO(`${currentMonth}-01`), 'MMMM', { locale: ptBR });
  const pixKeyToUse = appConfig?.pixKey || "Não configurada";
  const monthlyExpenses = useMemo(
    () => allExpenses.filter((expense) => expense.date.startsWith(currentMonth)).reduce((total, expense) => total + expense.amount, 0),
    [allExpenses, currentMonth],
  );
  const inviteDismissed = inviteDismissedUntil > Date.now();

  useEffect(() => {
    setInviteDismissedUntil(Number(localStorage.getItem(inviteStorageKey) || 0));
  }, [inviteStorageKey]);

  const handleDismissInvite = () => {
    const until = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(inviteStorageKey, String(until));
    setInviteDismissedUntil(until);
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKeyToUse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentPayment) {
      try {
        setIsUploading(true);
        await uploadProofAndSubmit(currentPayment.id, file);
      } catch (err) {
        toast('Erro ao enviar comprovante. Tente novamente.', 'error');
      } finally {
        setIsUploading(false);
      }
    }
  };

  if (!currentPayment) {
    return (
      <div className="pb-24">
        {isSupporterActive ? (
          <Card tone="muted" className="m-4 p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-warning-100 text-warning-600">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ink-900">Mensalidade de {monthLabel}</h2>
                <p className="text-xs text-ink-500 mt-1">
                  Ainda não existe cobrança para este mês. Se a página acabou de abrir, aguarde alguns segundos ou recarregue.
                </p>
              </div>
            </div>
          </Card>
        ) : !inviteDismissed && (
          <SupporterInviteCard
            className="m-4"
            monthlyExpenses={monthlyExpenses}
            onBecomeSupporter={onBecomeSupporter}
            onOpenTransparency={onOpenTransparency}
            onDismiss={handleDismissInvite}
          />
        )}

        <div className="px-4 space-y-6">
          {posts.length === 0 ? (
            <EmptyState>
              <ImagePlus size={40} className="mx-auto mb-3 opacity-20" />
              <p>Nenhuma foto ainda. Seja o primeiro a postar!</p>
            </EmptyState>
          ) : (
            posts.map((post, index) => (
              <React.Fragment key={post.id}>
                <PostItem post={post} />
                {!isSupporterActive && !inviteDismissed && index === 1 && (
                  <SupporterInviteCard
                    compact
                    monthlyExpenses={monthlyExpenses}
                    onBecomeSupporter={onBecomeSupporter}
                    onOpenTransparency={onOpenTransparency}
                    onDismiss={handleDismissInvite}
                  />
                )}
              </React.Fragment>
            ))
          )}
        </div>
      </div>
    );
  }

  const statusConfig = {
    pending: { label: 'Pendente', color: 'text-warning-600', bg: 'bg-warning-100', icon: AlertTriangle, tone: 'warning' as const },
    analyzing: { label: 'Em Análise', color: 'text-brand-600', bg: 'bg-brand-100', icon: Clock, tone: 'brand' as const },
    approved: { label: 'Em dia', color: 'text-success-600', bg: 'bg-success-100', icon: CheckCircle2, tone: 'success' as const },
    rejected: { label: 'Pendente', color: 'text-danger-600', bg: 'bg-danger-100', icon: AlertTriangle, tone: 'danger' as const }
  };

  const StatusIcon = statusConfig[currentPayment.status].icon;

  return (
    <div className="pb-24">
      {/* Top Banner for Payment */}
      <Card className={`m-4 p-4 ${currentPayment.status === 'approved' ? 'border-success-100 bg-success-50' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${statusConfig[currentPayment.status].bg}`}>
              <StatusIcon size={18} className={statusConfig[currentPayment.status].color} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Mensalidade: {monthLabel}</h2>
              <p className={`text-xs ${statusConfig[currentPayment.status].color}`}>{statusConfig[currentPayment.status].label}</p>
            </div>
          </div>
          <Button
            onClick={() => setShowPaymentDetails(true)}
            variant="ghost"
            size="sm"
            className="rounded-full text-brand-600"
          >
            Detalhes
          </Button>
        </div>

        {(currentPayment.status === 'pending' || currentPayment.status === 'rejected') && (
          <div className="flex items-center gap-2 bg-ink-50 p-2 rounded-control border border-ink-100">
            <Button
              onClick={handleCopyPix}
              variant="secondary"
              className="flex-1 bg-white"
            >
              {copied ? <CheckCircle2 size={16} className="text-success-600"/> : <Copy size={16} className="text-ink-400"/>}
              {copied ? 'Copiado!' : 'Copiar Pix'}
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1"
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              Anexar
            </Button>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          </div>
        )}
      </Card>

      {/* Feed Area */}
      <div className="px-4 space-y-6">
        
        {/* Posts List */}
        <div className="space-y-6">
          {posts.map((post, index) => (
            <React.Fragment key={post.id}>
              <PostItem post={post} />
              {!isSupporterActive && !inviteDismissed && index === 1 && (
                <SupporterInviteCard
                  compact
                  monthlyExpenses={monthlyExpenses}
                  onBecomeSupporter={onBecomeSupporter}
                  onOpenTransparency={onOpenTransparency}
                  onDismiss={handleDismissInvite}
                />
              )}
            </React.Fragment>
          ))}
          {posts.length === 0 && (
            <EmptyState>
              <ImagePlus size={40} className="mx-auto mb-3 opacity-20" />
              <p>Nenhuma foto ainda. Seja o primeiro a postar!</p>
            </EmptyState>
          )}

          {posts.length >= postLimit && (
            <div className="text-center pb-6">
              <Button
                onClick={loadMorePosts}
                variant="ghost"
                className="rounded-full text-brand-600"
              >
                Carregar mais
              </Button>
            </div>
          )}
        </div>

      </div>

      {/* Payment Details Modal */}
      {showPaymentDetails && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPaymentDetails(false)} />
          <ModalSurface>
            <IconButton onClick={() => setShowPaymentDetails(false)} className="absolute right-4 top-4 bg-ink-100 text-ink-500">
              <X size={20} />
            </IconButton>
            <div className="flex items-center justify-between mb-6 pr-8">
              <h2 className="text-xl font-bold text-ink-900">Meus Pagamentos</h2>
              <Button
                onClick={() => setShowDonationModal(true)}
                variant="danger"
                size="sm"
                className="rounded-full"
              >
                <Heart size={14} className="fill-red-500" /> Doar
              </Button>
            </div>
            
            <div className="mb-6">
              <SectionTitle className="mb-2">Instruções</SectionTitle>
              {appConfig?.paymentInstructions && (
                <p className="text-sm text-ink-700 bg-brand-50 p-4 rounded-control border border-brand-50 whitespace-pre-wrap">
                  {appConfig.paymentInstructions}
                </p>
              )}
            </div>

            <div>
              <SectionTitle className="mb-3">Histórico</SectionTitle>
              <div className="space-y-3">
                {myPayments.map(payment => (
                  <Card key={payment.id} tone="muted" className="flex flex-col gap-2 p-3 shadow-none">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-ink-900">{format(parseISO(`${payment.month}-01`), 'MMMM yyyy', { locale: ptBR })}</p>
                          {(payment.type === 'doacao' || payment.type === 'rateio') && (
                             <Badge tone="brand" className="rounded-md px-1.5 py-0.5 text-[10px] uppercase">
                               {payment.type === 'doacao' ? 'Doação' : 'Rateio'}
                             </Badge>
                          )}
                        </div>
                        <p className="text-xs text-ink-500">R$ {payment.amount.toFixed(2)}</p>
                      </div>
                      <Badge tone={statusConfig[payment.status].tone}>
                        {statusConfig[payment.status].label}
                      </Badge>
                    </div>
                    {payment.description && (
                      <p className="text-xs text-ink-500 italic mt-1">{payment.description}</p>
                    )}
                    {payment.proofUrl && payment.status !== 'pending' && payment.status !== 'rejected' && (
                      <div className="mt-2 pt-2 border-t border-ink-100">
                        <Button
                          onClick={() => setFullscreenImage({url: payment.proofUrl!, title: `Comprovante: ${format(parseISO(`${payment.month}-01`), 'MMMM yyyy', { locale: ptBR })}`})}
                          variant="ghost"
                          size="sm"
                          className="w-full text-brand-600"
                        >
                          Ver Comprovante
                        </Button>
                      </div>
                    )}
                    {(payment.status === 'pending' || payment.status === 'rejected') && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-ink-200">
                        <input type="file" accept="image/*" className="hidden" id={`proof-${payment.id}`} onChange={e => {
                          if (e.target.files?.[0]) uploadProofAndSubmit(payment.id, e.target.files[0]);
                        }} />
                        <label htmlFor={`proof-${payment.id}`} className="text-xs font-semibold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-brand-100 transition-colors w-full text-center">
                          Anexar Comprovante
                        </label>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
            
          </ModalSurface>
        </div>
      )}

      {showDonationModal && <NovaDoacaoModal onClose={() => setShowDonationModal(false)} />}
    </div>
  );
}

function SupporterInviteCard({
  monthlyExpenses,
  onBecomeSupporter,
  onOpenTransparency,
  onDismiss,
  compact = false,
  className = '',
}: {
  monthlyExpenses: number;
  onBecomeSupporter?: () => void;
  onOpenTransparency?: () => void;
  onDismiss: () => void;
  compact?: boolean;
  className?: string;
}) {
  const expenseCopy = monthlyExpenses > 0
    ? `Este mês já tivemos R$ ${monthlyExpenses.toFixed(2)} em cuidados do espaço.`
    : 'Todo mês a comunidade cuida de limpeza, manutenção e melhorias do espaço.';

  return (
    <Card tone="brand" className={`relative overflow-hidden p-5 shadow-none ${className}`}>
      <IconButton onClick={onDismiss} aria-label="Ocultar convite por 24 horas" className="absolute right-3 top-3 h-8 w-8 bg-white/70 text-ink-400">
        <X size={16} />
      </IconButton>
      <div className="flex items-start gap-3 pr-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
          {compact ? <Receipt size={18} /> : <Heart size={18} className="fill-brand-100" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900">{compact ? 'Ajude a manter o PetPlace' : 'Seja um apoiador recorrente'}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-600">{expenseCopy}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={onBecomeSupporter} size="sm" className="rounded-full">
              Virar apoiador
            </Button>
            <Button onClick={onOpenTransparency} variant="ghost" size="sm" className="rounded-full bg-white/70 text-brand-700">
              Ver extrato
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
