import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Camera, CheckCircle2, Copy, AlertTriangle, Clock, Loader2, ImagePlus, Send, X, Heart, MessageCircle, AtSign } from 'lucide-react';
import { uploadProofAndSubmit, addPost, togglePostLike } from '../services/api';
import { PostItem } from './PostItem';
import { NovaDoacaoModal } from './NovaDoacaoModal';

export function ResidentDashboard() {
  const { user, myPayments, appConfig, posts, loadMorePosts, postLimit } = useApp();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentPayment = myPayments.find(p => p.month === currentMonth);
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal State
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);

  const pixKeyToUse = appConfig?.pixKey || "Não configurada";

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
        alert("Erro ao enviar comprovante. Tente novamente.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  if (!currentPayment) {
    return <div className="p-6 text-gray-500 animate-pulse">Carregando status...</div>;
  }

  const statusConfig = {
    pending: { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-100', icon: AlertTriangle },
    analyzing: { label: 'Em Análise', color: 'text-blue-600', bg: 'bg-blue-100', icon: Clock },
    approved: { label: 'Em dia', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCircle2 },
    rejected: { label: 'Pendente', color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle }
  };

  const StatusIcon = statusConfig[currentPayment.status].icon;

  return (
    <div className="pb-24">
      {/* Top Banner for Payment */}
      <div className={`m-4 p-4 rounded-3xl border shadow-sm ${currentPayment.status === 'approved' ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${statusConfig[currentPayment.status].bg}`}>
              <StatusIcon size={18} className={statusConfig[currentPayment.status].color} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Mensalidade: Maio</h2>
              <p className={`text-xs ${statusConfig[currentPayment.status].color}`}>{statusConfig[currentPayment.status].label}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowPaymentDetails(true)}
            className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
          >
            Detalhes
          </button>
        </div>

        {(currentPayment.status === 'pending' || currentPayment.status === 'rejected') && (
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-100">
            <button 
              onClick={handleCopyPix}
              className="flex-1 flex items-center justify-center gap-2 p-2 bg-white rounded-xl text-sm font-medium text-gray-700 shadow-sm active:scale-95 transition-all"
            >
              {copied ? <CheckCircle2 size={16} className="text-green-500"/> : <Copy size={16} className="text-gray-400"/>}
              {copied ? 'Copiado!' : 'Copiar Pix'}
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1 flex items-center justify-center gap-2 p-2 bg-blue-600 text-white rounded-xl text-sm font-medium shadow-sm active:bg-blue-700 active:scale-95 transition-all disabled:opacity-70"
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              Anexar
            </button>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          </div>
        )}
      </div>

      {/* Feed Area */}
      <div className="px-4 space-y-6">
        
        {/* Posts List */}
        <div className="space-y-6">
          {posts.map(post => (
            <PostItem key={post.id} post={post} />
          ))}
          {posts.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <ImagePlus size={40} className="mx-auto mb-3 opacity-20" />
              <p>Nenhuma foto ainda. Seja o primeiro a postar!</p>
            </div>
          )}

          {posts.length >= postLimit && (
            <div className="text-center pb-6">
              <button 
                onClick={loadMorePosts}
                className="text-sm font-medium text-blue-600 bg-blue-50 px-6 py-2 rounded-full active:scale-95 transition-transform"
              >
                Carregar mais
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Payment Details Modal */}
      {showPaymentDetails && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPaymentDetails(false)} />
          <div className="relative bg-white w-full sm:w-full sm:max-w-md rounded-t-[2rem] sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto transform transition-all">
            <button onClick={() => setShowPaymentDetails(false)} className="absolute right-4 top-4 p-2 bg-gray-100 rounded-full text-gray-600 active:scale-90">
              <X size={20} />
            </button>
            <div className="flex items-center justify-between mb-6 pr-8">
              <h2 className="text-xl font-bold text-gray-800">Meus Pagamentos</h2>
              <button 
                onClick={() => setShowDonationModal(true)}
                className="text-xs font-semibold bg-red-50 text-red-600 px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition-all"
              >
                <Heart size={14} className="fill-red-500" /> Doar
              </button>
            </div>
            
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-widest mb-2">Instruções</h3>
              {appConfig?.paymentInstructions && (
                <p className="text-sm text-gray-600 bg-blue-50/50 p-4 rounded-2xl border border-blue-50 whitespace-pre-wrap">
                  {appConfig.paymentInstructions}
                </p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-widest mb-3">Histórico</h3>
              <div className="space-y-3">
                {myPayments.map(payment => (
                  <div key={payment.id} className="flex flex-col gap-2 p-3 rounded-2xl border border-gray-100 bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800">{format(parseISO(`${payment.month}-01`), 'MMMM yyyy', { locale: ptBR })}</p>
                          {(payment.type === 'doacao' || payment.type === 'rateio') && (
                             <span className="text-[10px] font-bold uppercase translate-y-px tracking-wider text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded">
                               {payment.type === 'doacao' ? 'Doação' : 'Rateio'}
                             </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">R$ {payment.amount.toFixed(2)}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        payment.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        payment.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        payment.status === 'analyzing' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {statusConfig[payment.status].label}
                      </span>
                    </div>
                    {payment.description && (
                      <p className="text-xs text-gray-500 italic mt-1">{payment.description}</p>
                    )}
                    {(payment.status === 'pending' || payment.status === 'rejected') && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                        <input type="file" accept="image/*" className="hidden" id={`proof-${payment.id}`} onChange={e => {
                          if (e.target.files?.[0]) uploadProofAndSubmit(payment.id, e.target.files[0]);
                        }} />
                        <label htmlFor={`proof-${payment.id}`} className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors w-full text-center">
                          Anexar Comprovante
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        </div>
      )}

      {showDonationModal && <NovaDoacaoModal onClose={() => setShowDonationModal(false)} />}
    </div>
  );
}
