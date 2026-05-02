import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDownCircle, ArrowUpCircle, Filter, Receipt } from 'lucide-react';
import { buildCashLedger, calculateCashSummary } from '../lib/finance';

export function TransparenciaView() {
  const { allPayments, allExpenses, setFullscreenImage } = useApp();
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const [period, setPeriod] = useState<string>(currentMonthStr);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allPayments.forEach((payment) => months.add(payment.month));
    allExpenses.forEach((expense) => months.add(expense.date.substring(0, 7)));
    const sorted = Array.from(months).sort().reverse();
    if (!sorted.includes(currentMonthStr)) {
      sorted.unshift(currentMonthStr);
    }
    return sorted;
  }, [allPayments, allExpenses, currentMonthStr]);

  const filteredPayments = useMemo(() => {
    if (period === 'all') return allPayments;
    return allPayments.filter((payment) => payment.month === period);
  }, [allPayments, period]);

  const filteredExpenses = useMemo(() => {
    if (period === 'all') return allExpenses;
    return allExpenses.filter((expense) => expense.date.startsWith(period));
  }, [allExpenses, period]);

  const summary = useMemo(() => calculateCashSummary(filteredPayments, filteredExpenses), [filteredPayments, filteredExpenses]);
  const ledger = useMemo(() => buildCashLedger(filteredPayments, filteredExpenses), [filteredPayments, filteredExpenses]);
  const { totalEntradas, totalSaidas, saldo } = summary;
  const isNegative = saldo < 0;

  return (
    <div className="p-6 max-w-lg mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Transparência</h2>
        <div className="relative">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-4 pr-8 rounded-full text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Todo o período</option>
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {format(parseISO(`${month}-01`), 'MMM yyyy', { locale: ptBR })}
              </option>
            ))}
          </select>
          <Filter size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className={`rounded-3xl p-6 text-white mb-6 shadow-md transition-colors ${isNegative ? 'bg-gray-800 shadow-gray-800/20' : 'bg-emerald-600 shadow-emerald-600/20'}`}>
        <h2 className={`${isNegative ? 'text-gray-400' : 'text-emerald-100'} font-medium text-sm mb-1 uppercase tracking-wide`}>
          {period === 'all' ? 'Saldo Atual Geral' : 'Resultado do Período'}
        </h2>
        <div className={`text-4xl font-bold tracking-tight mb-4 ${isNegative ? 'text-red-400' : ''}`}>
          {isNegative ? '-' : ''}R$ {Math.abs(saldo).toFixed(2)}
        </div>
        <div className="bg-black/10 rounded-xl p-3 flex justify-between text-sm">
          <div>
            <span className={`block text-xs text-opacity-80 ${isNegative ? 'text-gray-400' : 'text-emerald-100'}`}>Entradas</span>
            <span className="font-medium">+ R$ {totalEntradas.toFixed(2)}</span>
          </div>
          <div className="text-right">
            <span className={`block text-xs text-opacity-80 ${isNegative ? 'text-gray-400' : 'text-emerald-100'}`}>Saídas</span>
            <span className="font-medium">- R$ {totalSaidas.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <h3 className="font-semibold text-gray-800 text-lg mb-4 flex items-center">
        <Receipt className="mr-2 text-gray-400" size={20} /> Histórico do Caixa
      </h3>

      <div className="space-y-4">
        {ledger.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8 bg-white rounded-3xl border border-gray-100">
            Nenhum lançamento confirmado neste período.
          </div>
        ) : (
          ledger.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start gap-3 mb-3">
                <div className="flex gap-3 min-w-0">
                  <div className={`mt-0.5 ${item.kind === 'entrada' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {item.kind === 'entrada' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-gray-800 truncate">{item.title}</h4>
                    <span className="text-xs text-gray-400">
                      {format(parseISO(item.date.includes('T') ? item.date : `${item.date}T00:00:00`), 'dd MMM, yyyy', { locale: ptBR })}
                      {item.subtitle ? ` - ${item.subtitle}` : ''}
                    </span>
                  </div>
                </div>
                <span className={`font-semibold px-2 py-1 rounded-lg text-sm whitespace-nowrap ${
                  item.kind === 'entrada' ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'
                }`}>
                  {item.kind === 'entrada' ? '+' : '-'} R$ {item.amount.toFixed(2)}
                </span>
              </div>

              {item.proofUrl && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <span
                    onClick={() => setFullscreenImage({ url: item.proofUrl!, title: `Comprovante: ${item.title}` })}
                    className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg font-medium cursor-pointer inline-flex items-center active:scale-95 transition-all"
                  >
                    Ver Comprovante
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
