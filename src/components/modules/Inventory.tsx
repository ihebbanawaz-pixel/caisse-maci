import React, { useState } from 'react';
import { ClipboardCheck, Plus, CheckCircle2, AlertTriangle, Printer, Eye, X, ArrowRight } from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { InventorySession } from '../../types';
import { formatTND, formatDate, formatDateTime } from '../../utils/formatters';
import { printDocument } from '../../utils/exportUtils';

export const Inventory: React.FC = () => {
  const { 
    warehouses, 
    products, 
    balances, 
    inventorySessions, 
    createInventorySession, 
    validateInventorySession 
  } = useStock();

  const { currentUser, hasPermission } = useAuth();
  const canManage = hasPermission(['admin', 'stock_manager']);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouses[0]?.id || '');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [counts, setCounts] = useState<{ [prodId: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const activeSession = inventorySessions.find(s => s.id === activeSessionId);

  const handleStartSession = () => {
    const newId = createInventorySession(selectedWarehouseId);
    setActiveSessionId(newId);
    setIsNewModalOpen(false);

    // Initialiser le comptage avec la quantité théorique par défaut
    const session = inventorySessions.find(s => s.id === newId);
    const initialCounts: { [prodId: string]: number } = {};
    products.forEach(p => {
      const bal = balances.find(b => b.productId === p.id && b.warehouseId === selectedWarehouseId);
      initialCounts[p.id] = bal ? bal.physicalQuantity : 0;
    });
    setCounts(initialCounts);
  };

  const handleOpenExistingSession = (session: InventorySession) => {
    setActiveSessionId(session.id);
    const sessionCounts: { [prodId: string]: number } = {};
    session.items.forEach(it => {
      sessionCounts[it.productId] = it.countedQty;
    });
    setCounts(sessionCounts);
    setError('');
  };

  const handleCountChange = (productId: string, val: number) => {
    setCounts(prev => ({ ...prev, [productId]: Math.max(0, val) }));
  };

  const handleValidateSession = (sessionId: string) => {
    if (!confirm("Attention : La validation de l'inventaire va ajuster définitivement les soldes de stock en générant les écritures comptables d'écart. Confirmer ?")) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    const countedItems = Object.entries(counts).map(([productId, countedQty]) => ({
      productId,
      countedQty
    }));

    const res = validateInventorySession(
      sessionId,
      countedItems,
      currentUser?.id || 'ANON',
      currentUser?.displayName || 'Responsable'
    );

    setIsSubmitting(false);

    if (res.success) {
      alert("Session d'inventaire validée avec succès ! Les écritures de régularisation ont été inscrites au journal.");
    } else {
      setError(res.error || "Échec de validation de l'inventaire.");
    }
  };

  const handlePrintInventory = (session: InventorySession) => {
    const wh = warehouses.find(w => w.id === session.warehouseId)?.name;
    const linesHtml = session.items.map(it => {
      const varVal = it.variance * it.unitCost;
      return `
        <tr>
          <td>${it.sku}</td>
          <td>${it.name}</td>
          <td style="text-align: center;">${it.theoreticalQty}</td>
          <td style="text-align: center; font-weight: bold;">${it.countedQty}</td>
          <td style="text-align: center; color: ${it.variance === 0 ? '#334155' : it.variance > 0 ? '#10b981' : '#f43f5e'}; font-weight: bold;">
            ${it.variance > 0 ? '+' : ''}${it.variance}
          </td>
          <td style="text-align: right;">${formatTND(varVal)}</td>
        </tr>
      `;
    }).join('');

    const content = `
      <div style="margin-bottom: 20px;">
        <p><strong>Réf. Session d'Inventaire :</strong> ${session.reference}</p>
        <p><strong>Dépôt Audité :</strong> ${wh}</p>
        <p><strong>Statut :</strong> ${session.status === 'validated' ? 'Validé et Régularisé' : 'Brouillon'}</p>
        <p><strong>Validé par :</strong> ${session.validatedBy || '-'}</p>
        <p><strong>Date de validation :</strong> ${formatDateTime(session.validatedAt)}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Réf. SKU</th>
            <th>Article</th>
            <th style="text-align: center;">Stock Théorique</th>
            <th style="text-align: center;">Compté Physique</th>
            <th style="text-align: center;">Écart (Unités)</th>
            <th style="text-align: right;">Valorisation Écart</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml}
        </tbody>
      </table>
      <div style="margin-top: 40px; display: flex; justify-content: space-between;">
        <div>Visa Auditeur / Magasinier :<br/><br/>______________________</div>
        <div>Visa Responsable Stock / Direction :<br/><br/>______________________</div>
      </div>
    `;
    printDocument(`Inventaire ${session.reference}`, content);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-black text-slate-800">Inventaires Physiques & Régularisations</h2>
          <p className="text-xs text-slate-400">Sessions de pointage physique, calcul des écarts et ajustements traçables</p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4" /> Nouvelle Session d'Inventaire
          </button>
        )}
      </div>

      {/* Session active ouverte */}
      {activeSession && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  {activeSession.reference}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  activeSession.status === 'validated' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {activeSession.status === 'validated' ? 'Session Validée & Clôturée' : 'Comptage en cours'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Dépôt : <strong>{warehouses.find(w => w.id === activeSession.warehouseId)?.name}</strong> • Créée le {formatDateTime(activeSession.createdAt)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePrintInventory(activeSession)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-200"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimer PV d'Inventaire
              </button>

              <button
                onClick={() => setActiveSessionId(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-xs font-bold"
              >
                Fermer
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Table de comptage */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Réf. SKU</th>
                  <th className="py-2.5 px-3">Désignation</th>
                  <th className="py-2.5 px-3 text-center">Théorique</th>
                  <th className="py-2.5 px-3 text-center">Compté Physique</th>
                  <th className="py-2.5 px-3 text-center">Écart Unités</th>
                  <th className="py-2.5 px-3 text-right">Impact Financier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeSession.items.map((item) => {
                  const counted = counts[item.productId] !== undefined ? counts[item.productId] : item.countedQty;
                  const variance = counted - item.theoreticalQty;
                  const financialImpact = variance * item.unitCost;
                  const isClosed = activeSession.status === 'validated';

                  return (
                    <tr key={item.productId} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{item.sku}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{item.name}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{item.theoreticalQty}</td>
                      <td className="py-2.5 px-3 text-center">
                        {isClosed ? (
                          <span className="font-bold text-slate-900">{counted}</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            value={counted}
                            onChange={(e) => handleCountChange(item.productId, parseInt(e.target.value) || 0)}
                            className="w-20 text-center py-1 border border-slate-300 rounded font-black text-slate-900 bg-white"
                          />
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black">
                        <span className={variance === 0 ? 'text-slate-400' : variance > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {variance > 0 ? `+${variance}` : variance}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatTND(financialImpact)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Validation */}
          {activeSession.status !== 'validated' && canManage && (
            <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Clôture et régularisation d'inventaire</span>
                <span className="text-xs text-slate-300">
                  Les écarts constatés seront immédiatement ajustés et enregistrés au grand livre des mouvements.
                </span>
              </div>
              <button
                onClick={() => handleValidateSession(activeSession.id)}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting ? "Régularisation..." : "Valider les ajustements"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Liste des sessions passées */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Historique des sessions d'inventaire</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Référence</th>
                <th className="py-2.5 px-4">Dépôt</th>
                <th className="py-2.5 px-4">Date de Création</th>
                <th className="py-2.5 px-4">Statut</th>
                <th className="py-2.5 px-4">Validé par</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventorySessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    Aucune session d'inventaire enregistrée.
                  </td>
                </tr>
              ) : (
                inventorySessions.map(session => {
                  const wh = warehouses.find(w => w.id === session.warehouseId)?.name;
                  return (
                    <tr key={session.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">{session.reference}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{wh}</td>
                      <td className="py-3 px-4 text-slate-500">{formatDateTime(session.createdAt)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          session.status === 'validated' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {session.status === 'validated' ? 'Validé' : 'Brouillon'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{session.validatedBy || '-'}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenExistingSession(session)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold"
                        >
                          Consulter
                        </button>
                        <button
                          onClick={() => handlePrintInventory(session)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                        >
                          PV
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

      {/* Modal Nouvelle Session */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">Ouvrir une session d'inventaire</h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sélectionner l'entrepôt à inventorier *</label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  La session chargera l'état théorique actuel de tous les produits référencés dans ce dépôt.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button
                  onClick={handleStartSession}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-2xs"
                >
                  Démarrer le comptage
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
