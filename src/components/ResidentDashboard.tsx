import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Camera, CheckCircle2, Copy, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { uploadProofAndSubmit } from '../services/api';

export function ResidentDashboard() {
  const { user, myPayments, appConfig } = useApp();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentPayment = myPayments.find(p => p.month === currentMonth);
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pixKeyToUse = appConfig.pixKey || "Não configurada";

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
    rejected: { label: 'Recusado/Pendente', color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle }
  };

  const StatusIcon = statusConfig[currentPayment.status].icon;

  return (
    <div className="p-6 space-y-6 max-w-lg mx-auto">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center">
        <h2 className="text-gray-500 font-medium mb-2 uppercase tracking-wide text-xs">
          Status de {format(new Date(), 'MMMM', { locale: ptBR })}
        </h2>
        
        <div className={`flex flex-col items-center justify-center p-4 rounded-full aspect-square w-32 mb-4 ${statusConfig[currentPayment.status].bg}`}>
          <StatusIcon className={`w-10 h-10 mb-2 ${statusConfig[currentPayment.status].color}`} />
          <span className={`text-sm font-semibold capitalize ${statusConfig[currentPayment.status].color}`}>
            {statusConfig[currentPayment.status].label}
          </span>
        </div>
        
        {currentPayment.status === 'pending' || currentPayment.status === 'rejected' ? (
          <>
            <p className="text-gray-600 text-sm mb-2">
              Sua contribuição de <strong>R$ {currentPayment.amount.toFixed(2)}</strong> nos ajuda a manter o espaço para os cães!
            </p>
            {appConfig?.dueDateDay && (
              <p className="text-xs text-gray-500 mb-4 bg-gray-100 py-1 px-3 rounded-full inline-block">
                Vencimento: dia {appConfig.dueDateDay}
              </p>
            )}
            
            <div className="w-full bg-gray-50 p-4 rounded-2xl mb-4 border border-gray-100">
              <span className="text-xs text-gray-400 block mb-1">Chave Pix</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-gray-800 tracking-wider font-semibold">{pixKeyToUse}</span>
                <button 
                  onClick={handleCopyPix}
                  className="text-blue-600 p-2 bg-blue-50 rounded-xl active:scale-95 transition-transform"
                >
                  {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            {appConfig?.paymentInstructions && (
              <p className="text-xs text-gray-500 bg-blue-50/50 p-3 rounded-xl border border-blue-50 mb-4 whitespace-pre-wrap text-left">
                {appConfig.paymentInstructions}
              </p>
            )}

            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full bg-blue-600 active:bg-blue-700 text-white p-4 rounded-2xl font-medium flex items-center justify-center transition-all disabled:opacity-70"
            >
              {isUploading ? (
                <><Loader2 size={20} className="mr-2 animate-spin" /> Enviando...</>
              ) : (
                <><Camera size={20} className="mr-2" /> Enviar Comprovante</>
              )}
            </button>
          </>
        ) : currentPayment.status === 'analyzing' ? (
          <p className="text-gray-500 text-sm px-4">
            Comprovante enviado! Aguarde a avaliação de um administrador.
          </p>
        ) : (
          <p className="text-gray-500 text-sm px-4">
            Obrigado por contribuir! Seu pagamento foi confirmado.
          </p>
        )}
      </div>

      {(currentPayment.status === 'analyzing' || currentPayment.status === 'approved') && currentPayment.proofUrl && (
        <div className="bg-gray-100 rounded-3xl p-4 overflow-hidden border border-gray-200">
          <h3 className="text-xs text-gray-500 font-medium uppercase mb-3">Seu Comprovante</h3>
          <img src={currentPayment.proofUrl} alt="Comprovante" className="w-full rounded-2xl object-cover max-h-64 opacity-80" />
        </div>
      )}
    </div>
  );
}
