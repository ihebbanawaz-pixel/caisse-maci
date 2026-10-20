import React, { useState, useMemo } from 'react';
import { 
  Package, 
  TrendingDown, 
  AlertTriangle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  ShoppingBag, 
  Truck, 
  Users, 
  Plus, 
  CheckCircle, 
  BarChart2, 
  Clock,
  Layers,
  Sparkles,
  Receipt
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  CartesianGrid,
  Legend
} from 'recharts';
import { useStock } from '../../context/StockContext';
import { formatTND, formatDate } from '../../utils/formatters';

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export const Dashboard: React.FC<{ onNavigate: (view: string, filter?: string) => void }> = ({ onNavigate }) => {
  const { 
    products, 
    balances, 
    movements, 
    categories, 
    suppliers, 
    customers, 
    purchaseOrders, 
    selectedWarehouseId,
    alerts,
    injectDemoData
  } = useStock();

  const [period, setPeriod] = useState<'today' | '7days' | '30days' | 'all'>('30days');

  // Filtrage selon entrepôt sélectionné
  const filteredBalances = useMemo(() => {
    return selectedWarehouseId === 'ALL'
      ? balances
      : balances.filter(b => b.warehouseId === selectedWarehouseId);
  }, [balances, selectedWarehouseId]);

  // Filtrage des mouvements selon la période
  const filteredMovements = useMemo(() => {
    const now = new Date().getTime();
    return movements.filter(m => {
      if (selectedWarehouseId !== 'ALL') {
        const matchesWarehouse = m.sourceWarehouseId === selectedWarehouseId || m.targetWarehouseId === selectedWarehouseId;
        if (!matchesWarehouse) return false;
      }

      if (period === 'all') return true;
      const mDate = new Date(m.date).getTime();
      const diffDays = (now - mDate) / (1000 * 3600 * 24);
      if (period === 'today') return diffDays <= 1;
      if (period === '7days') return diffDays <= 7;
      if (period === '30days') return diffDays <= 30;
      return true;
    });
  }, [movements, selectedWarehouseId, period]);

  // 1. Calculs des métriques fondamentales
  const activeProducts = products.filter(p => !p.isArchived);
  const totalPhysicalUnits = filteredBalances.reduce((sum, b) => sum + (b.physicalQuantity || 0), 0);
  const totalReservedUnits = filteredBalances.reduce((sum, b) => sum + (b.reservedQuantity || 0), 0);
  const totalAvailableUnits = totalPhysicalUnits - totalReservedUnits;

  // Valorisation du stock (CMP)
  const totalValuation = activeProducts.reduce((sum, p) => {
    const qty = filteredBalances
      .filter(b => b.productId === p.id)
      .reduce((acc, b) => acc + b.physicalQuantity, 0);
    return sum + (qty * p.purchasePrice);
  }, 0);

  // Produits en rupture ou stock faible
  const lowStockProducts = activeProducts.filter(p => {
    const avail = filteredBalances
      .filter(b => b.productId === p.id)
      .reduce((acc, b) => acc + b.availableQuantity, 0);
    return avail > 0 && avail <= p.minThreshold;
  });

  const outOfStockProducts = activeProducts.filter(p => {
    const avail = filteredBalances
      .filter(b => b.productId === p.id)
      .reduce((acc, b) => acc + b.availableQuantity, 0);
    return avail <= 0;
  });

  // Flux du jour
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMovements = movements.filter(m => new Date(m.date) >= todayStart);
  const todayEntries = todayMovements.filter(m => m.type.startsWith('ENTRY')).reduce((acc, m) => acc + m.items.reduce((s, i) => s + i.quantity, 0), 0);
  const todayExits = todayMovements.filter(m => m.type.startsWith('EXIT')).reduce((acc, m) => acc + m.items.reduce((s, i) => s + i.quantity, 0), 0);

  // Commandes d'achats en cours
  const pendingOrdersCount = purchaseOrders.filter(po => po.status === 'confirmed').length;

  // 2. Préparation des données pour les graphiques
  // Répartition par catégorie
  const categoryData = useMemo(() => {
    return categories.map(cat => {
      const catProducts = activeProducts.filter(p => p.categoryId === cat.id);
      const val = catProducts.reduce((sum, p) => {
        const q = filteredBalances.filter(b => b.productId === p.id).reduce((s, b) => s + b.physicalQuantity, 0);
        return sum + (q * p.purchasePrice);
      }, 0);
      const count = catProducts.length;
      return {
        name: cat.name,
        value: Math.round(val),
        count
      };
    }).filter(c => c.value > 0);
  }, [categories, activeProducts, filteredBalances]);

  // Évolution des flux récents
  const flowsData = useMemo(() => {
    // Regrouper par jour sur les 7 derniers mouvements ou dates
    const map: { [day: string]: { date: string; entrees: number; sorties: number } } = {};
    filteredMovements.forEach(m => {
      const day = formatDate(m.date);
      if (!map[day]) {
        map[day] = { date: day, entrees: 0, sorties: 0 };
      }
      const qty = m.items.reduce((s, i) => s + i.quantity, 0);
      if (m.type.startsWith('ENTRY')) map[day].entrees += qty;
      if (m.type.startsWith('EXIT')) map[day].sorties += qty;
    });
    return Object.values(map).slice(-7);
  }, [filteredMovements]);

  // Articles les plus sortis
  const topExitedProducts = useMemo(() => {
    const counts: { [prodId: string]: { name: string; sku: string; qty: number } } = {};
    movements.filter(m => m.type.startsWith('EXIT')).forEach(m => {
      m.items.forEach(it => {
        if (!counts[it.productId]) {
          counts[it.productId] = { name: it.productName, sku: it.sku, qty: 0 };
        }
        counts[it.productId].qty += it.quantity;
      });
    });
    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [movements]);

  // Si la base est totalement vide
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-2xl mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-800">Base de données prête et initialisée</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          Aucun produit n'est actuellement enregistré. Vous pouvez ajouter manuellement vos premières références ou charger le jeu de données de test professionnel.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <button
            onClick={() => onNavigate('products')}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-sm transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Créer mon premier produit
          </button>
          <button
            onClick={injectDemoData}
            className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 border border-slate-200 transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-500" /> Charger 12 produits de démo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {selectedWarehouseId === 'ALL' ? 'Tous les dépôts réunis' : 'Dépôt sélectionné'}
            </span>
            <span className="text-xs text-slate-400">• Actualisation temps réel</span>
          </div>
          <h2 className="text-base font-black text-slate-800 mt-1">Indicateurs Opérationnels et Financiers</h2>
        </div>

        {/* Filtres de Période */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {(['today', '7days', '30days', 'all'] as const).map((p) => {
            const labels = { today: "Aujourd'hui", '7days': '7 jours', '30days': '30 jours', all: 'Tout' };
            const isSel = period === p;
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                  isSel ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cartes KPI Principales (10 Indicateurs spécifiés) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Valorisation Stock */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Valeur du Stock (CMP)</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Wallet className="w-4 h-4" /></div>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">{formatTND(totalValuation)}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Méthode Coût Moyen Pondéré</span>
        </div>

        {/* Unités Physiques & Disponibles */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Unités en Stock</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Package className="w-4 h-4" /></div>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">
            {totalPhysicalUnits.toLocaleString('fr-TN')}
            <span className="text-xs font-semibold text-slate-400 ml-1">unités</span>
          </p>
          <div className="flex gap-2 text-[10px] text-slate-500 mt-1">
            <span>Dispo: <strong className="text-emerald-700">{totalAvailableUnits}</strong></span>
            <span>•</span>
            <span>Réservé: <strong className="text-amber-700">{totalReservedUnits}</strong></span>
          </div>
        </div>

        {/* Stock Faible & Ruptures */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Alertes de Stock</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><AlertTriangle className="w-4 h-4" /></div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-xl font-black text-amber-600">{lowStockProducts.length}</span>
            <span className="text-xs text-slate-500 font-medium">faibles</span>
            <span className="text-slate-300">|</span>
            <span className="text-xl font-black text-rose-600">{outOfStockProducts.length}</span>
            <span className="text-xs text-slate-500 font-medium">ruptures</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">{activeProducts.length} références actives</span>
        </div>

        {/* Flux Entrées / Sorties du jour */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Flux du Jour</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Clock className="w-4 h-4" /></div>
          </div>
          <div className="flex items-baseline gap-3 mt-2">
            <div className="flex items-center gap-1 text-emerald-600 font-black text-base">
              <ArrowDownLeft className="w-3.5 h-3.5" /> +{todayEntries}
            </div>
            <div className="flex items-center gap-1 text-rose-600 font-black text-base">
              <ArrowUpRight className="w-3.5 h-3.5" /> -{todayExits}
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">{todayMovements.length} transactions aujourd'hui</span>
        </div>
      </div>

      {/* Cartes secondaires : Partenaires & Commandes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Commandes d'achats en cours</span>
            <p className="text-lg font-black text-slate-800 mt-0.5">{pendingOrdersCount}</p>
          </div>
          <ShoppingBag className="w-5 h-5 text-amber-600" />
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Fournisseurs Actifs</span>
            <p className="text-lg font-black text-slate-800 mt-0.5">{suppliers.filter(s => s.status === 'active').length}</p>
          </div>
          <Truck className="w-5 h-5 text-blue-600" />
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Clients Actifs</span>
            <p className="text-lg font-black text-slate-800 mt-0.5">{customers.filter(c => c.status === 'active').length}</p>
          </div>
          <Users className="w-5 h-5 text-indigo-600" />
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Total Références</span>
            <p className="text-lg font-black text-slate-800 mt-0.5">{products.length}</p>
          </div>
          <Layers className="w-5 h-5 text-emerald-600" />
        </div>
      </div>

      {/* Graphiques Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Évolution des flux (BarChart) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Mouvements de stock récents</h3>
              <p className="text-[11px] text-slate-400">Comparatif des quantités entrées et sorties</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Entrées
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-rose-600">
                <span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Sorties
              </span>
            </div>
          </div>

          <div className="h-64">
            {flowsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Aucune donnée de flux pour la période sélectionnée.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flowsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="entrees" name="Entrées" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sorties" name="Sorties" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 2. Répartition par Catégorie (PieChart) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Valeur par catégorie (TND)</h3>
            <p className="text-[11px] text-slate-400">Proportion financière du stock</p>
          </div>

          <div className="h-52">
            {categoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Aucune valeur de stock enregistrée.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString('fr-TN')} TND`, 'Valeur']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 mt-2 max-h-24 overflow-y-auto">
            {categoryData.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-[11px] text-slate-600">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></span>
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="font-bold text-slate-800 ml-2">{item.value.toLocaleString('fr-TN')} TND</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Derniers mouvements & Alertes critiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table des derniers mouvements */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs lg:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Derniers mouvements enregistrés</h3>
              <p className="text-[11px] text-slate-400">Journal d'audit temps réel</p>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              Voir tout l'historique →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">N° Mouvement</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Articles & Qté</th>
                  <th className="py-2.5 px-3">Valeur (TND)</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.slice(0, 6).map((m) => {
                  const isEntry = m.type.startsWith('ENTRY');
                  const isExit = m.type.startsWith('EXIT');
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{m.movementNumber}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isEntry ? 'bg-emerald-100 text-emerald-800' : isExit ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {isEntry ? 'ENTRÉE' : isExit ? 'SORTIE' : 'TRANSFERT'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {m.items.reduce((s, i) => s + i.quantity, 0)} {m.items[0]?.unit || 'pcs'} ({m.items.length} réf.)
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{formatTND(m.totalValue)}</td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">{formatDate(m.date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 5 Articles les plus sortis */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Articles les plus demandés</h3>
          <p className="text-[11px] text-slate-400 mb-4">Volume total de sorties cumulées</p>

          <div className="space-y-3">
            {topExitedProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Aucune sortie enregistrée pour l'instant.</p>
            ) : (
              topExitedProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="font-bold text-blue-700 text-[10px] block">{p.sku}</span>
                    <span className="font-semibold text-slate-800 truncate block text-[11px]">{p.name}</span>
                  </div>
                  <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded font-black text-xs shrink-0">
                    -{p.qty}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
            <button
              onClick={() => onNavigate('pos')}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <Receipt className="w-4 h-4 text-emerald-300" /> Caisse & Vente Comptoir (POS)
            </button>
            <button
              onClick={() => onNavigate('stock_in')}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" /> Enregistrer une Entrée
            </button>
            <button
              onClick={() => onNavigate('stock_out')}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" /> Enregistrer une Sortie
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
