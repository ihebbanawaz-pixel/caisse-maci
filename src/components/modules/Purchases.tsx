import React, { useState } from 'react';
import { ShoppingBag, Plus, Search, Eye, CheckCircle2, ArrowDownLeft, X, Printer, AlertCircle } from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { PurchaseOrder, OrderItem } from '../../types';
import { formatTND, formatDate, generateSequence } from '../../utils/formatters';
import { printDocument } from '../../utils/exportUtils';

export const Purchases: React.FC<{ initialSearch?: string }> = ({ initialSearch = '' }) => {
  const { 
    purchaseOrders, 
    suppliers, 
    warehouses, 
    products, 
    createPurchaseOrder, 
    receivePurchaseOrder, 
    cancelPurchaseOrder 
  } = useStock();

  const { currentUser, hasPermission } = useAuth();
  const canBuy = hasPermission(['admin', 'stock_manager', 'buyer']);

  const [search, setSearch] = useState(initialSearch);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [receptionOrder, setReceptionOrder] = useState<PurchaseOrder | null>(null);
  const [receptionQuantities, setReceptionQuantities] = useState<{ [productId: string]: number }>({});
  const [errorMessage, setErrorMessage] = useState('');

  // Formulaire Création Commande Achat
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Array<{ productId: string; quantity: number; unitPrice: number }>>([
    { productId: products[0]?.id || '', quantity: 10, unitPrice: products[0]?.purchasePrice || 0 }
  ]);

  const filteredOrders = purchaseOrders.filter(po =>
    po.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    po.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddItem = () => {
    if (products.length === 0) return;
    setItems([...items, { productId: products[0].id, quantity: 1, unitPrice: products[0].purchasePrice }]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== idx));
    }
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = val;
    if (field === 'productId') {
      const p = products.find(prod => prod.id === val);
      if (p) updated[idx].unitPrice = p.purchasePrice;
    }
    setItems(updated);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const sup = suppliers.find(s => s.id === supplierId);
    const wh = warehouses.find(w => w.id === warehouseId);

    if (!sup || !wh) {
      setErrorMessage("Fournisseur ou entrepôt invalide.");
      return;
    }

    const orderItems: OrderItem[] = items.map(it => {
      const p = products.find(prod => prod.id === it.productId)!;
      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        quantityOrdered: Number(it.quantity),
        quantityProcessed: 0,
        unitPrice: Number(it.unitPrice),
        total: Number(it.quantity) * Number(it.unitPrice)
      };
    });

    const totalAmount = orderItems.reduce((sum, it) => sum + it.total, 0);

    createPurchaseOrder({
      supplierId,
      supplierName: sup.name,
      warehouseId,
      warehouseName: wh.name,
      expectedDate: expectedDate || new Date().toISOString().slice(0, 10),
      items: orderItems,
      status: 'confirmed', // Prête à être réceptionnée
      totalAmount,
      notes
    });

    setIsCreateOpen(false);
    alert("Bon de commande fournisseur créé avec succès !");
  };

  // Réception de marchandise
  const openReceptionModal = (order: PurchaseOrder) => {
    setReceptionOrder(order);
    const initQtys: { [pId: string]: number } = {};
    order.items.forEach(it => {
      const remaining = it.quantityOrdered - it.quantityProcessed;
      initQtys[it.productId] = Math.max(0, remaining);
    });
    setReceptionQuantities(initQtys);
    setErrorMessage('');
  };

  const handleConfirmReception = () => {
    if (!receptionOrder) return;
    setErrorMessage('');

    const itemsReceived = Object.entries(receptionQuantities)
      .map(([productId, quantity]) => ({ productId, quantity: Number(quantity) }))
      .filter(i => i.quantity > 0);

    if (itemsReceived.length === 0) {
      setErrorMessage("Veuillez saisir au moins une quantité reçue.");
      return;
    }

    const res = receivePurchaseOrder(
      receptionOrder.id,
      itemsReceived,
      currentUser?.id || 'ANON',
      currentUser?.displayName || 'Magasinier'
    );

    if (res.success) {
      alert("Réception validée ! Le stock physique et le CMP ont été mis à jour dans l'entrepôt.");
      setReceptionOrder(null);
    } else {
      setErrorMessage(res.error || "Échec de la réception.");
    }
  };

  const handlePrintPO = (po: PurchaseOrder) => {
    const lines = po.items.map(it => `
      <tr>
        <td>${it.sku}</td>
        <td>${it.productName}</td>
        <td style="text-align: center;">${it.quantityOrdered}</td>
        <td style="text-align: center;">${it.quantityProcessed}</td>
        <td style="text-align: right;">${formatTND(it.unitPrice)}</td>
        <td style="text-align: right; font-weight: bold;">${formatTND(it.total)}</td>
      </tr>
    `).join('');

    const content = `
      <div style="margin-bottom: 20px;">
        <p><strong>Bon de Commande N° :</strong> ${po.orderNumber}</p>
        <p><strong>Fournisseur :</strong> ${po.supplierName}</p>
        <p><strong>Lieu de Livraison :</strong> ${po.warehouseName}</p>
        <p><strong>Date prévue :</strong> ${formatDate(po.expectedDate)}</p>
        <p><strong>Statut :</strong> ${po.status.toUpperCase()}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Réf SKU</th>
            <th>Désignation Article</th>
            <th>Qté Commandée</th>
            <th>Qté Reçue</th>
            <th style="text-align: right;">Prix Unitaire</th>
            <th style="text-align: right;">Total Ligne</th>
          </tr>
        </thead>
        <tbody>
          ${lines}
        </tbody>
      </table>
      <div style="text-align: right; margin-top: 20px; font-size: 14px; font-weight: bold;">
        Montant Total de la Commande : ${formatTND(po.totalAmount)}
      </div>
    `;
    printDocument(`Bon de Commande ${po.orderNumber}`, content);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-black text-slate-800">Achats & Commandes Fournisseurs</h2>
          <p className="text-xs text-slate-400">Émission de bons de commande, réceptions partielles et traçabilité des coûts</p>
        </div>

        {canBuy && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4" /> Nouveau Bon de Commande
          </button>
        )}
      </div>

      {/* Barre de Recherche */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-2 max-w-md">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par N° commande, fournisseur..."
          className="w-full text-xs bg-transparent focus:outline-none"
        />
      </div>

      {/* Liste des Commandes d'achats */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">N° Commande</th>
                <th className="py-2.5 px-4">Fournisseur</th>
                <th className="py-2.5 px-4">Entrepôt Cible</th>
                <th className="py-2.5 px-4">Date Prévue</th>
                <th className="py-2.5 px-4 text-right">Montant Total</th>
                <th className="py-2.5 px-4 text-center">Statut</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    Aucune commande fournisseur trouvée.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(po => {
                  const isLate = po.status === 'confirmed' && new Date(po.expectedDate) < new Date();
                  return (
                    <tr key={po.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">{po.orderNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{po.supplierName}</td>
                      <td className="py-3 px-4 text-slate-600">{po.warehouseName}</td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${isLate ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                          {formatDate(po.expectedDate)} {isLate && '(En retard)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">{formatTND(po.totalAmount)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          po.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                          po.status === 'partially_received' ? 'bg-amber-100 text-amber-800' :
                          po.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          po.status === 'cancelled' ? 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {po.status === 'completed' ? 'Entièrement reçue' :
                           po.status === 'partially_received' ? 'Partielle' :
                           po.status === 'confirmed' ? 'Confirmée' :
                           po.status === 'cancelled' ? 'Annulée' : 'Brouillon'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedOrder(po)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 rounded"
                          title="Détails"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {(po.status === 'confirmed' || po.status === 'partially_received') && canBuy && (
                          <button
                            onClick={() => openReceptionModal(po)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-2xs inline-flex items-center gap-1"
                          >
                            <ArrowDownLeft className="w-3 h-3" /> Réceptionner
                          </button>
                        )}

                        <button
                          onClick={() => handlePrintPO(po)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 rounded"
                          title="Imprimer"
                        >
                          <Printer className="w-3.5 h-3.5" />
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

      {/* Modal Création Bon de Commande */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">Émettre un Bon de Commande Fournisseur</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-5 overflow-y-auto space-y-4">
              {errorMessage && (
                <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg font-semibold">{errorMessage}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fournisseur *</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dépôt Destinataire *</label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date Prévue *</label>
                  <input
                    type="date"
                    required
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Lignes d'articles */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>Articles à commander</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                  >
                    + Ligne
                  </button>
                </div>

                <div className="p-3 space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <select
                        value={it.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="flex-1 text-xs p-1 bg-white border border-slate-300 rounded"
                      >
                        {products.filter(p => !p.isArchived).map(p => (
                          <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-20 text-xs p-1 bg-white border border-slate-300 rounded text-right font-bold"
                        placeholder="Qté"
                      />
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={it.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-28 text-xs p-1 bg-white border border-slate-300 rounded text-right font-bold"
                        placeholder="Prix unitaire"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length === 1}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes ou instructions particulières</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Conditions de livraison, franco de port..."
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-2xs"
                >
                  Confirmer et émettre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Réception de Marchandise */}
      {receptionOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <div>
                <span className="font-mono text-xs bg-emerald-500 font-bold px-2 py-0.5 rounded">
                  {receptionOrder.orderNumber}
                </span>
                <h3 className="text-sm font-bold mt-1">Réception de marchandises en stock</h3>
              </div>
              <button onClick={() => setReceptionOrder(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500">
                Fournisseur : <strong>{receptionOrder.supplierName}</strong> • Entrepôt : <strong>{receptionOrder.warehouseName}</strong>
              </p>

              {errorMessage && (
                <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorMessage}
                </div>
              )}

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Article</th>
                      <th className="py-2.5 px-3 text-center">Commandé</th>
                      <th className="py-2.5 px-3 text-center">Déjà Reçu</th>
                      <th className="py-2.5 px-3 text-center">Quantité Réceptionnée</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receptionOrder.items.map(it => {
                      const maxR = it.quantityOrdered - it.quantityProcessed;
                      return (
                        <tr key={it.productId}>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{it.sku} - {it.productName}</td>
                          <td className="py-2.5 px-3 text-center">{it.quantityOrdered}</td>
                          <td className="py-2.5 px-3 text-center text-slate-500">{it.quantityProcessed}</td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={maxR}
                              value={receptionQuantities[it.productId] || 0}
                              onChange={(e) => setReceptionQuantities({
                                ...receptionQuantities,
                                [it.productId]: Math.min(maxR, Math.max(0, parseInt(e.target.value) || 0))
                              })}
                              className="w-20 text-center py-1 border border-slate-300 rounded font-black text-slate-900 bg-emerald-50/50"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setReceptionOrder(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmReception}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md"
                >
                  Valider l'Entrée en Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détails Commande */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <span className="font-mono text-xs font-bold text-blue-400">{selectedOrder.orderNumber}</span>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p>Fournisseur : <strong>{selectedOrder.supplierName}</strong></p>
              <p>Dépôt de livraison : <strong>{selectedOrder.warehouseName}</strong></p>
              <p>Date prévue : <strong>{formatDate(selectedOrder.expectedDate)}</strong></p>
              <p>Montant total : <strong className="text-blue-700 font-black">{formatTND(selectedOrder.totalAmount)}</strong></p>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
