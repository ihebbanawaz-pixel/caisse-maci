import React, { useState, useMemo } from 'react';
import { History as HistoryIcon, Search, Filter, Download, Calendar, ArrowDownLeft, ArrowUpRight, Repeat, Printer } from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { StockMovement } from '../../types';
import { formatTND, formatDate, formatDateTime } from '../../utils/formatters';
import { exportToCSV, printDocument } from '../../utils/exportUtils';

export const History: React.FC<{ initialFilter?: string }> = ({ initialFilter = '' }) => {
  const { movements, warehouses, products } = useStock();

  const [search, setSearch] = useState(initialFilter);
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState('ALL');

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      // Recherche
      if (search) {
        const q = search.toLowerCase();
        const matchNum = m.movementNumber.toLowerCase().includes(q);
        const matchDoc = m.documentRef ? m.documentRef.toLowerCase().includes(q) : false;
        const matchPartner = m.partnerName ? m.partnerName.toLowerCase().includes(q) : false;
        const matchItem = m.items.some(i => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
        if (!matchNum && !matchDoc && !matchPartner && !matchItem) return false;
      }

      // Type de mouvement
      if (selectedType === 'ENTRY' && !m.type.startsWith('ENTRY')) return false;
      if (selectedType === 'EXIT' && !m.type.startsWith('EXIT')) return false;
      if (selectedType === 'TRANSFER' && !m.type.startsWith('TRANSFER')) return false;

      // Entrepôt
      if (selectedWarehouse !== 'ALL') {
        const matchesWh = m.sourceWarehouseId === selectedWarehouse || m.targetWarehouseId === selectedWarehouse;
        if (!matchesWh) return false;
      }

      // Produit
      if (selectedProduct !== 'ALL') {
        const hasProd = m.items.some(i => i.productId === selectedProduct);
        if (!hasProd) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [movements, search, selectedType, selectedWarehouse, selectedProduct]);

  const handleExport = () => {
    const headers = [
      'N° Mouvement', 'Date & Heure', 'Type', 'Entrepôt Source', 'Entrepôt Cible',
      'Document Réf', 'Partenaire', 'Articles', 'Quantité Totale', 'Valeur (TND)', 'Opérateur'
    ];
    const rows = filteredMovements.map(m => {
      const src = warehouses.find(w => w.id === m.sourceWarehouseId)?.name || '-';
      const tgt = warehouses.find(w => w.id === m.targetWarehouseId)?.name || '-';
      const itemsStr = m.items.map(i => `${i.sku} (${i.quantity})`).join(', ');
      const totalQty = m.items.reduce((s, i) => s + i.quantity, 0);

      return [
        m.movementNumber,
        formatDateTime(m.date),
        m.type,
        src,
        tgt,
        m.documentRef || '',
        m.partnerName || '',
        itemsStr,
        totalQty,
        m.totalValue,
        m.userName
      ];
    });

    exportToCSV('grand_livre_mouvements_stock_pro', headers, rows);
  };

  const handlePrint = () => {
    const lines = filteredMovements.map(m => {
      const isEntry = m.type.startsWith('ENTRY');
      const isExit = m.type.startsWith('EXIT');
      const itemsDesc = m.items.map(i => `${i.sku} (${i.quantity} ${i.unit})`).join(', ');
      return `
        <tr>
          <td>${m.movementNumber}</td>
          <td>${formatDate(m.date)}</td>
          <td>${isEntry ? 'Entrée' : isExit ? 'Sortie' : 'Transfert'}</td>
          <td>${itemsDesc}</td>
          <td>${m.documentRef || '-'}</td>
          <td>${m.userName}</td>
          <td style="text-align: right; font-weight: bold;">${formatTND(m.totalValue)}</td>
        </tr>
      `;
    }).join('');

    const content = `
      <table>
        <thead>
          <tr>
            <th>N° Mouvement</th>
            <th>Date</th>
            <th>Type</th>
            <th>Articles</th>
            <th>Document</th>
            <th>Opérateur</th>
            <th style="text-align: right;">Valeur</th>
          </tr>
        </thead>
        <tbody>
          ${lines}
        </tbody>
      </table>
    `;
    printDocument('Journal des Mouvements de Stock', content);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-black text-slate-800">Grand Livre des Mouvements de Stock</h2>
          <p className="text-xs text-slate-400">Journal d'audit inaltérable de tous les flux validés</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimer
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" /> Exporter en CSV
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shadow-2xs">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Recherche</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="N° mouvement, BL, article..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Type de flux</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-medium text-slate-700"
          >
            <option value="ALL">Tous les types</option>
            <option value="ENTRY">Entrées seulement (Réception, Retour...)</option>
            <option value="EXIT">Sorties seulement (Vente, Rebut...)</option>
            <option value="TRANSFER">Transferts inter-dépôts</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Entrepôt</label>
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-medium text-slate-700"
          >
            <option value="ALL">Tous les dépôts</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filtrer par produit</label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-medium text-slate-700"
          >
            <option value="ALL">Tous les produits</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Journal */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">N° Mouvement</th>
                <th className="py-2.5 px-4">Date & Heure</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Articles & Quantités</th>
                <th className="py-2.5 px-4">Dépôt</th>
                <th className="py-2.5 px-4">Document Réf.</th>
                <th className="py-2.5 px-4">Opérateur</th>
                <th className="py-2.5 px-4 text-right">Valeur Flux</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <HistoryIcon className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    Aucun mouvement ne correspond aux filtres appliqués.
                  </td>
                </tr>
              ) : (
                filteredMovements.map(m => {
                  const isEntry = m.type.startsWith('ENTRY');
                  const isExit = m.type.startsWith('EXIT');
                  const whName = warehouses.find(w => w.id === (m.targetWarehouseId || m.sourceWarehouseId))?.name || '-';

                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{m.movementNumber}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDateTime(m.date)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isEntry ? 'bg-emerald-100 text-emerald-800' :
                          isExit ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {isEntry ? 'ENTRÉE' : isExit ? 'SORTIE' : 'TRANSFERT'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {m.items.map((it, idx) => (
                            <span key={idx} className="block font-medium text-slate-800">
                              <strong className="text-blue-700">{it.sku}</strong> : {isEntry ? '+' : isExit ? '-' : ''}{it.quantity} {it.unit}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{whName}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{m.documentRef || '-'}</td>
                      <td className="py-3 px-4 text-slate-600">{m.userName}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                        {formatTND(m.totalValue)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
