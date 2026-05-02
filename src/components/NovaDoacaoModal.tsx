import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { X, Heart, UploadCloud } from 'lucide-react';
import { submitDonation } from '../services/api';

export function NovaDoacaoModal({ onClose }: { onClose: () => void }) {
  const { user } = useApp();
  const [amountStr, setAmountStr] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) return alert('Valor inválido.');
    if (!file) return alert('Anexe o comprovante.');
    
    setLoading(true);
    await submitDonation(amount, file, user.familyId || user.uid);
    setLoading(false);
    alert('Doação enviada com sucesso! Ela entrará no rateio/balanço assim que aprovada.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative bg-white w-full sm:w-full sm:max-w-md rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col h-[85vh] sm:h-auto animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 pb-2">
          <h2 className="text-xl font-bold flex items-center gap-2"><Heart className="text-red-500 fill-red-500" /> Fazer uma Doação</h2>
          <button type="button" onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500 active:scale-90 transition-transform">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <p className="text-sm text-gray-600">
            Você pode doar valores adicionais para ajudar em melhorias, festas ou fundo de reserva comunitário. Muito obrigado!
          </p>
          
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">Valor da Doação (R$)</label>
            <input 
              type="number"
              step="0.01"
              required
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
              placeholder="Ex: 50.00"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xl font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">Comprovante PIX</label>
            {file ? (
              <div className="relative border border-gray-200 rounded-2xl overflow-hidden aspect-video bg-gray-50 flex items-center justify-center">
                <img src={URL.createObjectURL(file)} alt="Comprovante" className="max-w-full max-h-full object-contain" />
                <button 
                  type="button"
                  onClick={() => setFile(null)} 
                  className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 backdrop-blur"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-colors"
              >
                <UploadCloud size={32} />
                <span className="text-sm font-medium">Toque para anexar comprovante</span>
              </div>
            )}
            <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={e => {
              if (e.target.files?.[0]) setFile(e.target.files[0]);
            }} />
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 pb-safe">
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gray-900 active:bg-black text-white px-4 py-4 rounded-full font-semibold transition-all shadow-md disabled:opacity-50 flex items-center justify-center flex-shrink-0"
          >
            {loading ? 'Enviando...' : 'Confirmar e Enviar'}
          </button>
        </div>
      </form>
    </div>
  );
}
