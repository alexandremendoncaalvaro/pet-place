import React from 'react';
import { X, Heart, ShieldCheck, Coffee, Users, ScrollText } from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex flex-col justify-end sm:justify-center sm:p-4 animate-in fade-in">
      <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl min-h-[70vh] max-h-[90vh] flex flex-col shadow-2xl relative translate-y-0 animate-in slide-in-from-bottom-5">
        
        <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-gray-100 p-4 flex justify-between items-center rounded-t-3xl z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
              <Heart size={16} className="fill-blue-500" />
            </div>
            <h2 className="font-bold text-gray-800 text-lg">Sobre o Projeto</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500 active:scale-90 transition-transform">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 pb-10">
          
          <div className="text-center">
            <h3 className="font-bold text-2xl text-blue-900 mb-2">Nosso Pet Place</h3>
            <p className="text-sm text-gray-600 leading-relaxed bg-blue-50/50 p-4 rounded-2xl border border-blue-50 inline-block text-left">
              Criamos este Pet Place em um terreno gentilmente emprestado. Com a união de moradores e apaixonados por pets, cercamos a área e construímos um espaço seguro e divertido para nossos melhores amigos.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500 flex-shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 text-sm mb-1">Portão com Eclusa</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Para a segurança de todos, implementamos um portão duplo que impede que os pets fujões escapem quando alguém entra ou sai.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-500 flex-shrink-0">
                <Coffee size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 text-sm mb-1">Estrutura Comunitária</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  O espaço conta com uma área coberta, cadeiras, lixeiras, potes de água, brinquedos e até uma churrasqueira provisória para nossos encontros.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-500 flex-shrink-0">
                <Users size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 text-sm mb-1">Colabora quem quer</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  O espaço é de todos e para todos! As despesas e manutenções são pagas com rateios e doações voluntárias. O objetivo é manter o local limpo e seguro.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-500 flex-shrink-0">
                <ScrollText size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 text-sm mb-1">Gestão Transparente</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Este app foi desenvolvido para gerenciar nossos rateios de forma aberta, ter um mural de avisos e um diretório com nossa comunidade de duas ou quatro patas.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center pb-8 border-t border-gray-100 pt-6">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
              Feito com carinho ❤️
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Para a nossa comunidade.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
