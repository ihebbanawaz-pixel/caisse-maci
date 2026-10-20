import React, { useState } from 'react';
import { ArrowDownLeft, Plus, Trash2, CheckCircle2, AlertCircle, Building2, Truck, FileText } from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { MovementItem, MovementType } from '../../types';
import { formatTND } from '../../utils/formatters';

export const StockIn: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const { products, warehouses, suppliers, executeStockIn } = useStock();
  const { currentUser, hasPermission } = useAuth();
  const canPerformEntry = hasPermission(['admin', 'stock_manager', 'warehouseman']);

  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [partnerId, setPartnerId] = useState(suppliers[0]?.id || '');
  const [entryType, setEntryType] = useState<MovementType>('ENTRY_SUPPLIER');
  const [documentRef, setDocumentRef] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Lignes de réception
  const activeProducts = products.filter(p => !p.isArchived);
  const [items, setItems] = useState<Array<{ productId: string; quantity: number; unitCost: number }>>([
    { productId: activeProducts[0]?.id || '', quantity: 10, unitCost: activeProducts[0]?.purchasePrice || 0 }
  ]);

  const handleAddItem = () => {
    if (activeProducts.length === 0) return;
    setItems([...items, { productId: activeProducts[0].id, quantity: 1, unitCost: activeProducts[0].purchasePrice }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    if (field === 'productId') {
      const p = activeProducts.find(prod => prod.id === value);
      if (p) updated[index].unitCost = p.purchasePrice;
    }
    setItems(updated);
  };

  const totalCalculated = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitCost)), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!canPerformEntry) {
      setErrorMessage("Votre rôle actuel ne vous autorise pas à enregistrer des entrées de stock.");
      return;
    }

    if (!warehouseId) {
      setErrorMessage("Veuillez sélectionner l'entrepôt de destination.");
      return;
    }

    if (items.some(i => i.quantity <= 0 || i.unitCost < 0)) {
      setErrorMessage("Les quantités doivent être strictement supérieures à 0 et les prix positifs.");
      return;
    }

    setIsSubmitting(true);

    const sup = suppliers.find(s => s.id === partnerId);
    const movementItems: MovementItem[] = items.map(item => {
      const prod = activeProducts.find(p => p.id === item.productId)!;
      return {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
        unit: prod.unit
      };
    });

    const result = executeStockIn({
      type: entryType,
      warehouseId,
      items: movementItems,
      documentRef,
      partnerId,
      partnerName: sup?.name,
      notes,
      userId: currentUser?.id || 'ANON',
      userName: currentUser?.displayName || 'Magasinier'
    });

    setIsSubmitting(false);

    if (result.success) {
      alert(`Entrée de stock validée sous la référence ${result.movementNumber} ! Le Coût Moyen Pondéré (CMP) a été recalculé.`);
      onSuccess();
    } else {
      setErrorMessage(result.error || "Une erreur est survenue lors de l'enregistrement de l'entrée.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">Enregistrer une Entrée en Stock</h2>
              <p className="text-xs text-slate-400">Réception fournisseur, retour client ou régularisation de stock initial</p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Entrepôt Destinataire *
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
                required
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Motif / Type d'Entrée *</label>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as MovementType)}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
                required
              >
                <option value="ENTRY_SUPPLIER">Réception Fournisseur</option>
                <option value="ENTRY_RETURN_CUSTOMER">Retour Client</option>
                <option value="ENTRY_INITIAL">Stock Initial</option>
                <option value="ENTRY_ADJUSTMENT">Correction d'Inventaire</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                Fournisseur Partenaire
              </label>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
              >
                <option value="">-- Aucun / Non applicable --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                N° Bon de Livraison ou Facture Fournisseur
              </label>
              <input
                type="text"
                value={documentRef}
                onChange={(e) => setDocumentRef(e.target.value)}
                placeholder="Ex: BL-2026-9844"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Observations / Remarques</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Commentaires sur la réception..."
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
              />
            </div>
          </div>

          {/* Lignes d'articles */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 flex justify-between items-center border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase">Articles Réceptionnés</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-bold flex items-center gap-1 hover:bg-blue-700"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter un article
              </button>
            </div>

            <div className="p-4 space-y-3">
              {items.map((item, index) => {
                const prod = activeProducts.find(p => p.id === item.productId);
                return (
                  <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex-1 w-full sm:w-auto">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Article Référencé</label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                        className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded font-medium"
                      >
                        {activeProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="w-28">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        Quantité ({prod?.unit || 'pcs'})
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded font-black text-right"
                      />
                    </div>

                    <div className="w-36">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Coût Unitaire (TND)</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={item.unitCost}
                        onChange={(e) => handleItemChange(index, 'unitCost', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded font-black text-right"
                      />
                    </div>

                    <div className="w-36 text-right">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Sous-total</label>
                      <p className="text-xs font-black text-slate-900 pt-1.5">
                        {formatTND(item.quantity * item.unitCost)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length === 1}
                      className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 self-end mb-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Validation & Total */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-4 rounded-xl">
            <div>
              <span className="text-xs text-slate-400 block uppercase font-medium">Valeur totale réceptionnée</span>
              <span className="text-2xl font-black text-emerald-400">{formatTND(totalCalculated)}</span>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? "Validation atomique..." : "Valider l'Entrée en Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
