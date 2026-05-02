import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Receipt } from 'lucide-react';
import { ImageWithSkeleton } from './ImageWithSkeleton';

export function TransparenciaView() {
  const { allPayments, allExpenses, isRealBackend } = useApp();
  
  const saldo = useMemo(() => {
    const totalEntradas = allPayments.filter(p => p.status === 'approved').reduce((acc, p) => acc + p.amount, 0);
    const totalSaidas = allExpenses.reduce((acc, e) => acc + e.amount, 0);
    return totalEntradas - totalSaidas;
  }, [allPayments, allExpenses]);

  return (
    <div className="p-6 max-w-lg mx-auto pb-24">
      <div className="bg-emerald-600 rounded-3xl p-6 text-white mb-6 shadow-md shadow-emerald-600/20">
        <h2 className="text-emerald-100 font-medium text-sm mb-1 uppercase tracking-wide">Saldo Atual</h2>
        <div className="text-4xl font-bold tracking-tight mb-4">R$ {saldo.toFixed(2)}</div>
        <div className="bg-black/10 rounded-xl p-3 flex justify-between text-sm">
          <div>
            <span className="block text-emerald-100 text-xs text-opacity-80">Entradas</span>
            <span className="font-medium">+ R$ {allPayments.filter(p => p.status === 'approved').reduce((a,b)=>a+b.amount,0).toFixed(2)}</span>
          </div>
          <div className="text-right">
            <span className="block text-emerald-100 text-xs text-opacity-80">Saídas</span>
            <span className="font-medium">- R$ {allExpenses.reduce((a,b)=>a+b.amount,0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <h3 className="font-semibold text-gray-800 text-lg mb-4 flex items-center">
        <Receipt className="mr-2 text-gray-400" size={20} /> Histórico de Gastos
      </h3>

      <div className="space-y-4">
        {allExpenses.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8 bg-white rounded-3xl border border-gray-100">
            Nenhum gasto registrado ainda.
          </div>
        ) : (
          allExpenses.map((expense) => (
            <div key={expense.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-gray-800">{expense.title}</h4>
                  <span className="text-xs text-gray-400">
                    {format(parseISO(expense.date), 'dd MMM, yyyy', { locale: ptBR })} • {expense.category}
                  </span>
                </div>
                <span className="font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-lg text-sm">
                  - R$ {expense.amount.toFixed(2)}
                </span>
              </div>
              
              {expense.receiptUrl && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md font-medium cursor-pointer inline-flex items-center">
                    Ver Nota Fiscal
                  </span>
                  {/* On click could open a modal, keeping it simple as an image for now */}
                  <ImageWithSkeleton src={expense.receiptUrl} alt="Nota" className="mt-2 rounded-xl h-32 object-cover w-full opacity-90 border border-gray-100" containerClassName="w-full mt-2 h-32" />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
