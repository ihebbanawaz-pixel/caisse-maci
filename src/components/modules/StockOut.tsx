import React, { useState } from 'react';
import { ArrowUpRight, AlertOctagon, CheckCircle2, Building2, Users, FileText } from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { MovementItem, MovementType } from '../../types';
import { formatTND } from '../../utils/formatters';

export const StockOut: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const { products, warehouses, customers, balances, executeStockOut } = useStock();
  const { currentUser, hasPermission } = useAuth();
  const canPerformExit = hasPermission(['admin', 'stock_manager', 'warehouseman', 'sales']);

  const activeProducts = products.filter(p => !p.isArchived);

  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [partnerId, setPartnerId] = useState('');
  const [exitType, setExitType] = useState<MovementType>('EXIT_SALE');
  const [documentRef, setDocumentRef] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [selectedProductId, setSelectedProductId] = useState(activeProducts[0]?.id || '');
  const [quantity, setQuantity] = useState(1);

  // Solde actuel dans ce dépôt
  const currentBalance = balances.find(
    b => b.productId === selectedProductId && b.warehouseId === warehouseId
  );

  const physicalQty = currentBalance ? currentBalance.physicalQuantity : 0;
  const reservedQty = currentBalance ? currentBalance.reservedQuantity : 0;
  const availableQty = currentBalance ? currentBalance.availableQuantity : 0;

  const isStockSufficient = quantity <= availableQty && availableQty > 0;
  const currentProduct = activeProducts.find(p => p.id === selectedProductId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!canPerformExit) {
      setErrorMessage("Votre rôle actuel ne vous autorise pas à effectuer des sorties de stock.");
      return;
    }

    if (!isStockSufficient) {
      setErrorMessage(
        `Sortie refusée : La quantité demandée (${quantity}) dépasse le stock disponible (${availableQty}). Les sorties ordinaires ne peuvent jamais rendre le stock négatif.`
      );
      return;
    }

    setIsSubmitting(true);

    const cust = customers.find(c => c.id === partnerId);
    const movementItems: MovementItem[] = [{
      productId: currentProduct!.id,
      productName: currentProduct!.name,
      sku: currentProduct!.sku,
      quantity: Number(quantity),
      unitCost: currentProduct!.purchasePrice,
      unit: currentProduct!.unit
    }];

    const result = executeStockOut({
      type: exitType,
      warehouseId,
      items: movementItems,
      documentRef,
      partnerId,
      partnerName: cust?.name,
      notes,
      userId: currentUser?.id || 'ANON',
      userName: currentUser?.displayName || 'Magasinier'
    });

    setIsSubmitting(false);

    if (result.success) {
      alert(`Sortie de stock enregistrée avec succès sous la référence ${result.movementNumber} !`);
      onSuccess();
    } else {
      setErrorMessage(result.error || "Échec de validation de la sortie de stock.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">Enregistrer une Sortie de Stock</h2>
              <p className="text-xs text-slate-400">Contrôle strict des disponibilités physiques et refus des stocks négatifs</p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs font-semibold">
            <AlertOctagon className="w-4 h-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Entrepôt Source (Expéditeur) *
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:bg-white"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Motif de Déstockage *</label>
              <select
                value={exitType}
                onChange={(e) => setExitType(e.target.value as MovementType)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:bg-white"
              >
                <option value="EXIT_SALE">Vente Client</option>
                <option value="EXIT_INTERNAL_USE">Consommation Interne</option>
                <option value="EXIT_DAMAGED">Produit Endommagé / Rebut</option>
                <option value="EXIT_LOSS">Perte Justifiée</option>
                <option value="EXIT_RETURN_SUPPLIER">Retour au Fournisseur</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Article à Déstocker *</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:bg-white"
            >
              {activeProducts.map(p => (
                <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
              ))}
            </select>
          </div>

          {/* Indicateur visuel du stock disponible */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-600">Disponibilité dans cet entrepôt :</span>
              <span className={`text-sm font-black ${availableQty > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {availableQty} {currentProduct?.unit}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 border-t border-slate-200/60 pt-2">
              <span>Stock physique réel : <strong>{physicalQty}</strong></span>
              <span>Stock réservé client : <strong>{reservedQty}</strong></span>
              <span>Coût CMP unitaire : <strong>{formatTND(currentProduct?.purchasePrice)}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Quantité demandée *</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-full text-xs p-2 border rounded-lg font-black text-right ${
                  !isStockSufficient ? 'border-rose-500 text-rose-600 bg-rose-50' : 'border-slate-300 bg-slate-50'
                }`}
              />
              {!isStockSufficient && (
                <span className="text-[10px] text-rose-600 font-bold mt-1 block">
                  Excède le stock disponible ({availableQty}) !
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                N° Bon de Sortie / Commande
              </label>
              <input
                type="text"
                value={documentRef}
                onChange={(e) => setDocumentRef(e.target.value)}
                placeholder="Ex: BS-2026-042"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
              />
            </div>
          </div>

          {exitType === 'EXIT_SALE' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Client Destinataire
              </label>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white"
              >
                <option value="">-- Sélectionner un client --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Remarques / Justificatif</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motif de sortie, chantier, destination..."
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!isStockSufficient || isSubmitting}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ArrowUpRight className="w-4 h-4" />
              {isSubmitting ? "Validation du déstockage..." : "Confirmer la Sortie de Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
