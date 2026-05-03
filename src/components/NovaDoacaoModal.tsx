import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { X, Heart, UploadCloud } from 'lucide-react';
import { submitDonation } from '../services/api';
import { ImageWithSkeleton } from './ImageWithSkeleton';
import { useFeedback } from './Feedback';
import { Button, FieldGroup, FieldLabel, IconButton, ModalSurface, TextInput } from './ui';

export function NovaDoacaoModal({ onClose }: { onClose: () => void }) {
  const { user } = useApp();
  const { toast } = useFeedback();
  const [amountStr, setAmountStr] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) {
      toast('Informe um valor válido.', 'error');
      return;
    }
    if (!file) {
      toast('Anexe o comprovante.', 'error');
      return;
    }

    setLoading(true);
    try {
      await submitDonation(amount, file, user.familyId || user.uid);
      toast('Doação enviada para aprovação.');
      onClose();
    } catch (err) {
      toast('Erro ao enviar doação. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <ModalSurface as="form" onSubmit={handleSubmit} className="flex h-[85vh] flex-col p-0 sm:h-auto animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 pb-2">
          <h2 className="text-xl font-bold flex items-center gap-2 text-ink-900"><Heart className="text-danger-600 fill-danger-600" /> Fazer uma Doação</h2>
          <IconButton type="button" onClick={onClose} className="bg-ink-100 text-ink-500">
            <X size={20} />
          </IconButton>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <p className="text-sm text-ink-700">
            Você pode doar valores adicionais para ajudar em melhorias, festas ou fundo de reserva comunitário. Muito obrigado!
          </p>

          <FieldGroup>
            <FieldLabel>Valor da Doação (R$)</FieldLabel>
            <TextInput
              type="number"
              step="0.01"
              required
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
              placeholder="Ex: 50.00"
              className="p-4 text-xl"
            />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel>Comprovante PIX</FieldLabel>
            {file ? (
              <div className="relative border border-ink-200 rounded-2xl overflow-hidden aspect-video bg-ink-50 flex items-center justify-center">
                <ImageWithSkeleton src={URL.createObjectURL(file)} alt="Comprovante" className="max-w-full max-h-full object-contain" containerClassName="w-full h-full flex justify-center items-center" />
                <IconButton
                  type="button"
                  onClick={() => setFile(null)}
                  className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 backdrop-blur"
                >
                  <X size={16} />
                </IconButton>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-ink-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-ink-500 hover:text-brand-600 hover:border-brand-500 hover:bg-brand-50 cursor-pointer transition-colors"
              >
                <UploadCloud size={32} />
                <span className="text-sm font-medium">Toque para anexar comprovante</span>
              </div>
            )}
            <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={e => {
              if (e.target.files?.[0]) setFile(e.target.files[0]);
            }} />
          </FieldGroup>
        </div>

        <div className="p-4 border-t border-ink-100 pb-safe">
          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-full flex-shrink-0"
            size="lg"
          >
            {loading ? 'Enviando...' : 'Confirmar e Enviar'}
          </Button>
        </div>
      </ModalSurface>
    </div>
  );
}
