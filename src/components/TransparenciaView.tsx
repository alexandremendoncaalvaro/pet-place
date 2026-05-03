import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDownCircle, ArrowUpCircle, Filter, Receipt } from 'lucide-react';
import { buildCashLedger, calculateCashSummary } from '../lib/finance';
import { Badge, Button, Card, EmptyState, Page, SectionTitle } from './ui';

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
    <Page>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-ink-900">Transparência</h2>
        <div className="relative">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="appearance-none bg-ink-50 border border-ink-200 text-ink-700 py-2 pl-4 pr-8 rounded-full text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          >
            <option value="all">Todo o período</option>
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {format(parseISO(`${month}-01`), 'MMM yyyy', { locale: ptBR })}
              </option>
            ))}
          </select>
          <Filter size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ink-400 pointer-events-none" />
        </div>
      </div>

      <div className={`rounded-card p-6 text-white mb-6 shadow-card transition-colors ${isNegative ? 'bg-ink-900 shadow-ink-900/20' : 'bg-success-600 shadow-success-600/20'}`}>
        <h2 className={`${isNegative ? 'text-ink-400' : 'text-success-100'} font-medium text-sm mb-1 uppercase tracking-wide`}>
          {period === 'all' ? 'Saldo Atual Geral' : 'Resultado do Período'}
        </h2>
        <div className={`text-4xl font-bold tracking-tight mb-4 ${isNegative ? 'text-danger-100' : ''}`}>
          {isNegative ? '-' : ''}R$ {Math.abs(saldo).toFixed(2)}
        </div>
        <div className="bg-black/10 rounded-xl p-3 flex justify-between text-sm">
          <div>
            <span className={`block text-xs text-opacity-80 ${isNegative ? 'text-ink-400' : 'text-success-100'}`}>Entradas</span>
            <span className="font-medium">+ R$ {totalEntradas.toFixed(2)}</span>
          </div>
          <div className="text-right">
            <span className={`block text-xs text-opacity-80 ${isNegative ? 'text-ink-400' : 'text-success-100'}`}>Saídas</span>
            <span className="font-medium">- R$ {totalSaidas.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <SectionTitle icon={<Receipt className="text-ink-400" size={20} />}>
        Histórico do Caixa
      </SectionTitle>

      <div className="space-y-4">
        {ledger.length === 0 ? (
          <EmptyState>
            Nenhum lançamento confirmado neste período.
          </EmptyState>
        ) : (
          ledger.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex justify-between items-start gap-3 mb-3">
                <div className="flex gap-3 min-w-0">
                  <div className={`mt-0.5 ${item.kind === 'entrada' ? 'text-success-600' : 'text-danger-600'}`}>
                    {item.kind === 'entrada' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-ink-900 truncate">{item.title}</h4>
                    <span className="text-xs text-ink-400">
                      {format(parseISO(item.date.includes('T') ? item.date : `${item.date}T00:00:00`), 'dd MMM, yyyy', { locale: ptBR })}
                      {item.subtitle ? ` - ${item.subtitle}` : ''}
                    </span>
                  </div>
                </div>
                <Badge tone={item.kind === 'entrada' ? 'success' : 'danger'} className="rounded-lg text-sm whitespace-nowrap">
                  {item.kind === 'entrada' ? '+' : '-'} R$ {item.amount.toFixed(2)}
                </Badge>
              </div>

              {item.proofUrl && (
                <div className="mt-4 border-t border-ink-100 pt-3">
                  <Button
                    onClick={() => setFullscreenImage({ url: item.proofUrl!, title: `Comprovante: ${item.title}` })}
                    variant="ghost"
                    size="sm"
                    className="text-brand-600"
                  >
                    Ver Comprovante
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </Page>
  );
}
