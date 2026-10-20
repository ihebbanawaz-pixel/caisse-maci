import React, { useState } from 'react';
import { Repeat, Plus, AlertCircle, CheckCircle2, ArrowRight, Printer, Calendar, Warehouse } from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { MovementItem } from '../../types';
import { formatTND, formatDate, formatDateTime, generateSequence } from '../../utils/formatters';
import { printDocument } from '../../utils/exportUtils';

export const Transfers: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const { warehouses, products, balances, transfers, executeTransfer } = useStock();
  const { currentUser, hasPermission } = useAuth();
  const canTransfer = hasPermission(['admin', 'stock_manager', 'warehouseman']);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [sourceWarehouseId, setSourceWarehouseId] = useState(warehouses[0]?.id || '');
  const [targetWarehouseId, setTargetWarehouseId] = useState(warehouses[1]?.id || '');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lignes de transfert
  const [items, setItems] = useState<Array<{ productId: string; quantity: number }>>([
    { productId: products[0]?.id || '', quantity: 1 }
  ]);

  const handleAddItem = () => {
    if (products.length === 0) return;
    setItems([...items, { productId: products[0].id, quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const getAvailableAtSource = (productId: string) => {
    const bal = balances.find(b => b.productId === productId && b.warehouseId === sourceWarehouseId);
    return bal ? bal.availableQuantity : 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (sourceWarehouseId === targetWarehouseId) {
      setErrorMessage("L'entrepôt source et l'entrepôt destination doivent être strictement différents.");
      return;
    }

    // Vérifier les disponibilités
    for (const item of items) {
      const avail = getAvailableAtSource(item.productId);
      const p = products.find(prod => prod.id === item.productId);
      if (item.quantity > avail) {
        setErrorMessage(`Quantité insuffisante pour ${p?.sku || 'article'}. Demandé: ${item.quantity}, Disponible à la source: ${avail}.`);
        return;
      }
    }

    setIsSubmitting(true);

    const movementItems: MovementItem[] = items.map(item => {
      const prod = products.find(p => p.id === item.productId)!;
      return {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        quantity: Number(item.quantity),
        unitCost: prod.purchasePrice,
        unit: prod.unit
      };
    });

    const res = executeTransfer({
      sourceWarehouseId,
      targetWarehouseId,
      items: movementItems,
      notes,
      userId: currentUser?.id || 'ANON',
      userName: currentUser?.displayName || 'Magasinier'
    });

    setIsSubmitting(false);

    if (res.success) {
      alert(`Transfert validé avec succès sous la référence ${res.movementNumber} !`);
      setIsFormOpen(false);
      setItems([{ productId: products[0]?.id || '', quantity: 1 }]);
      if (onSuccess) onSuccess();
    } else {
      setErrorMessage(res.error || "Échec de validation du transfert.");
    }
  };

  const handlePrintTransferSlip = (t: any) => {
    const src = warehouses.find(w => w.id === t.sourceWarehouseId)?.name;
    const tgt = warehouses.find(w => w.id === t.targetWarehouseId)?.name;
    const linesHtml = t.items.map((it: any) => `
      <tr>
        <td>${it.sku}</td>
        <td>${it.productName}</td>
        <td style="text-align: center; font-weight: bold;">${it.quantity} ${it.unit}</td>
      </tr>
    `).join('');

    const content = `
      <div style="margin-bottom: 20px;">
        <p><strong>N° Bon de Transfert :</strong> ${t.transferNumber}</p>
        <p><strong>Date d'expédition :</strong> ${formatDateTime(t.createdAt)}</p>
        <p><strong>Dépôt Expéditeur (Source) :</strong> ${src}</p>
        <p><strong>Dépôt Réceptionnaire (Destination) :</strong> ${tgt}</p>
        <p><strong>Opérateur responsable :</strong> ${t.userName}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Réf SKU</th>
            <th>Désignation Article</th>
            <th>Quantité Transférée</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml}
        </tbody>
      </table>
      <div style="margin-top: 40px; display: flex; justify-content: space-between;">
        <div>Visa Magasinier Expéditeur :<br/><br/>______________________</div>
        <div>Visa Chauffeur / Transporteur :<br/><br/>______________________</div>
        <div>Visa Magasinier Réceptionnaire :<br/><br/>______________________</div>
      </div>
    `;
    printDocument(`Bon de Transfert ${t.transferNumber}`, content);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-black text-slate-800">Transferts Inter-Entrepôts</h2>
          <p className="text-xs text-slate-400">Régulation des stocks entre dépôts avec contrôle d'intégrité bilatéral</p>
        </div>

        {canTransfer && !isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4" /> Nouveau Transfert
          </button>
        )}
      </div>

      {/* Formulaire Nouveau Transfert */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Émettre un Bon de Transfert de Marchandises</h3>
              <p className="text-[11px] text-slate-400">Déduction atomique à la source et réallocation au dépôt cible</p>
            </div>
            <button
              onClick={() => setIsFormOpen(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Fermer le formulaire
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Entrepôt Source (Expéditeur) *</label>
                <select
                  value={sourceWarehouseId}
                  onChange={(e) => setSourceWarehouseId(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-semibold"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Entrepôt Destination (Réceptionnaire) *</label>
                <select
                  value={targetWarehouseId}
                  onChange={(e) => setTargetWarehouseId(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-semibold"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Articles à transférer */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 flex justify-between items-center border-b border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase">Marchandises à transférer</span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-bold flex items-center gap-1 hover:bg-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter un article
                </button>
              </div>

              <div className="p-4 space-y-3">
                {items.map((item, idx) => {
                  const avail = getAvailableAtSource(item.productId);
                  const isExceeded = item.quantity > avail;
                  return (
                    <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex-1 w-full sm:w-auto">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Produit</label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                          className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded font-medium"
                        >
                          {products.filter(p => !p.isArchived).map(p => (
                            <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-32">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Dispo. Source</label>
                        <span className={`text-xs font-black block pt-1.5 ${avail > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {avail} unités
                        </span>
                      </div>

                      <div className="w-32">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Quantité Transférée</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          className={`w-full text-xs p-1.5 bg-white border rounded font-black text-right ${
                            isExceeded ? 'border-rose-500 text-rose-600' : 'border-slate-300'
                          }`}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length === 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 self-end mb-0.5"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Remarques & Justificatif de transfert</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Rééquilibrage du stock pour commande client Sfax..."
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {isSubmitting ? "Traitement bilatéral..." : "Valider le Transfert"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Historique des transferts */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Historique des transferts inter-dépôts</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">N° Transfert</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Origine & Destination</th>
                <th className="py-2.5 px-4">Articles</th>
                <th className="py-2.5 px-4">Responsable</th>
                <th className="py-2.5 px-4 text-center">Statut</th>
                <th className="py-2.5 px-4 text-right">Bon de transport</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <Repeat className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    Aucun transfert inter-dépôts enregistré.
                  </td>
                </tr>
              ) : (
                transfers.map(t => {
                  const src = warehouses.find(w => w.id === t.sourceWarehouseId)?.name || 'Dépôt Source';
                  const tgt = warehouses.find(w => w.id === t.targetWarehouseId)?.name || 'Dépôt Destination';
                  const totalQty = t.items.reduce((s, i) => s + i.quantity, 0);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">{t.transferNumber}</td>
                      <td className="py-3 px-4 text-slate-500">{formatDateTime(t.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <span>{src}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                          <span>{tgt}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {totalQty} pièces ({t.items.length} réf.)
                      </td>
                      <td className="py-3 px-4 text-slate-600">{t.userName}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Réceptionné
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handlePrintTransferSlip(t)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 ml-auto"
                        >
                          <Printer className="w-3.5 h-3.5" /> Imprimer
                        </button>
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
