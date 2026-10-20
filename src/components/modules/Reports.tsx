import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  Warehouse, 
  Tags, 
  Truck, 
  Users,
  Clock,
  PieChart as PieChartIcon,
  FileDown,
  FileText
} from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { formatTND, formatDate, formatDateTime } from '../../utils/formatters';
import { exportToCSV, printDocument } from '../../utils/exportUtils';

export const Reports: React.FC = () => {
  const { 
    products, 
    categories, 
    warehouses, 
    balances, 
    movements, 
    purchaseOrders, 
    salesOrders, 
    inventorySessions,
    settings
  } = useStock();

  const [activeReportId, setActiveReportId] = useState<number>(1);
  const [filterWarehouse, setFilterWarehouse] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');

  const reportList = [
    { id: 1, title: 'État du stock actuel', desc: 'Soldes physiques, réservés et disponibles de tous les articles' },
    { id: 2, title: 'Stock par entrepôt', desc: 'Ventilation du stock et valorisation par site de stockage' },
    { id: 3, title: 'Stock par catégorie', desc: 'Répartition du stock physique et financier par famille' },
    { id: 4, title: 'Produits en rupture', desc: 'Articles épuisés avec stock disponible nul' },
    { id: 5, title: 'Produits sous seuil minimal', desc: 'Articles nécessitant un réapprovisionnement urgent' },
    { id: 6, title: 'Historique des entrées', desc: 'Toutes les réceptions fournisseurs et retours validés' },
    { id: 7, title: 'Historique des sorties', desc: 'Toutes les sorties de stock (ventes et consommations)' },
    { id: 8, title: 'Mouvements par période', desc: 'Synthèse chronologique complète des flux de stock' },
    { id: 9, title: 'Produits les plus sortis', desc: 'Classement des meilleures rotations d\'articles' },
    { id: 10, title: 'Produits sans mouvement', desc: 'Articles dormants sans aucune sortie enregistrée' },
    { id: 11, title: 'Historique des achats', desc: 'Commandes fournisseurs émises et réceptions' },
    { id: 12, title: 'Historique des commandes clients', desc: 'Commandes de vente et expéditions enregistrées' },
    { id: 13, title: 'Écarts d\'inventaire', desc: 'Régularisations et écarts comptés lors des inventaires' },
    { id: 14, title: 'Valorisation estimée du stock', desc: 'Valorisation financière intégrale selon la méthode du CMP' },
  ];

  // Helper pour récupérer le stock d'un produit
  const getProductStock = (productId: string, whId: string = 'ALL') => {
    const list = whId === 'ALL' 
      ? balances.filter(b => b.productId === productId)
      : balances.filter(b => b.productId === productId && b.warehouseId === whId);
    
    const physical = list.reduce((s, b) => s + b.physicalQuantity, 0);
    const reserved = list.reduce((s, b) => s + b.reservedQuantity, 0);
    const available = physical - reserved;
    return { physical, reserved, available };
  };

  // Données du rapport sélectionné
  const reportData = useMemo(() => {
    switch (activeReportId) {
      case 1: { // État du stock actuel
        const rows = products.filter(p => !p.isArchived).map(p => {
          const { physical, reserved, available } = getProductStock(p.id, filterWarehouse);
          const cat = categories.find(c => c.id === p.categoryId)?.name || '-';
          return {
            sku: p.sku,
            name: p.name,
            category: cat,
            unit: p.unit,
            purchasePrice: p.purchasePrice,
            physical,
            reserved,
            available,
            val: physical * p.purchasePrice
          };
        });
        return {
          headers: ['SKU', 'Désignation', 'Catégorie', 'Unité', 'Coût CMP (TND)', 'Stock Physique', 'Réservé', 'Disponible', 'Valeur Totale (TND)'],
          rows: rows.map(r => [r.sku, r.name, r.category, r.unit, r.purchasePrice, r.physical, r.reserved, r.available, formatTND(r.val)]),
          summary: `Total de ${rows.length} articles répertoriés. Stock physique cumulé : ${rows.reduce((s, r) => s + r.physical, 0)} unités.`
        };
      }

      case 2: { // Stock par entrepôt
        const rows: any[] = [];
        warehouses.forEach(w => {
          if (filterWarehouse !== 'ALL' && w.id !== filterWarehouse) return;
          const wBal = balances.filter(b => b.warehouseId === w.id);
          wBal.forEach(b => {
            const p = products.find(prod => prod.id === b.productId);
            if (!p || p.isArchived) return;
            rows.push({
              warehouse: w.name,
              sku: p.sku,
              name: p.name,
              physical: b.physicalQuantity,
              available: b.availableQuantity,
              val: b.physicalQuantity * p.purchasePrice
            });
          });
        });
        return {
          headers: ['Entrepôt', 'Réf. SKU', 'Article', 'Stock Physique', 'Disponible', 'Valorisation CMP'],
          rows: rows.map(r => [r.warehouse, r.sku, r.name, r.physical, r.available, formatTND(r.val)]),
          summary: `Ventilation par dépôt pour ${warehouses.length} entrepôt(s).`
        };
      }

      case 3: { // Stock par catégorie
        const rows = categories.map(c => {
          const catProds = products.filter(p => p.categoryId === c.id && !p.isArchived);
          let catUnits = 0;
          let catVal = 0;
          catProds.forEach(p => {
            const { physical } = getProductStock(p.id, filterWarehouse);
            catUnits += physical;
            catVal += (physical * p.purchasePrice);
          });
          return {
            category: c.name,
            code: c.code,
            prodCount: catProds.length,
            units: catUnits,
            val: catVal
          };
        });
        return {
          headers: ['Code', 'Catégorie', 'Nombre de Références', 'Unités Physiques', 'Valeur Totale (TND)'],
          rows: rows.map(r => [r.code, r.category, r.prodCount, r.units, formatTND(r.val)]),
          summary: `Valorisation totale par famille : ${formatTND(rows.reduce((s, r) => s + r.val, 0))}.`
        };
      }

      case 4: { // Produits en rupture
        const rows = products.filter(p => !p.isArchived).filter(p => {
          const { available } = getProductStock(p.id, filterWarehouse);
          return available <= 0;
        }).map(p => [
          p.sku,
          p.name,
          categories.find(c => c.id === p.categoryId)?.name || '-',
          p.minThreshold,
          formatTND(p.purchasePrice),
          formatTND(p.sellingPrice)
        ]);
        return {
          headers: ['SKU', 'Désignation', 'Catégorie', 'Seuil Min', 'Coût Achat (CMP)', 'Prix Vente'],
          rows,
          summary: `${rows.length} article(s) en rupture totale de stock disponible.`
        };
      }

      case 5: { // Produits sous seuil minimal
        const rows = products.filter(p => !p.isArchived).filter(p => {
          const { available } = getProductStock(p.id, filterWarehouse);
          return available > 0 && available <= p.minThreshold;
        }).map(p => {
          const { available, physical } = getProductStock(p.id, filterWarehouse);
          return [
            p.sku,
            p.name,
            physical,
            available,
            p.minThreshold,
            p.minThreshold - available,
            formatTND(p.purchasePrice)
          ];
        });
        return {
          headers: ['SKU', 'Désignation', 'Stock Phys.', 'Disponible', 'Seuil Min.', 'Manquant pour Seuil', 'Coût CMP'],
          rows,
          summary: `${rows.length} article(s) sous le seuil d'alerte.`
        };
      }

      case 6: { // Historique des entrées
        const entries = movements.filter(m => m.type.startsWith('ENTRY'));
        const rows = entries.map(m => {
          const wh = warehouses.find(w => w.id === m.targetWarehouseId)?.name || '-';
          const itemsStr = m.items.map(i => `${i.sku} (${i.quantity} ${i.unit})`).join(', ');
          return [
            m.movementNumber,
            formatDate(m.date),
            m.documentRef || '-',
            m.partnerName || '-',
            wh,
            itemsStr,
            formatTND(m.totalValue),
            m.userName
          ];
        });
        return {
          headers: ['N° Entrée', 'Date', 'N° Document', 'Fournisseur / Motif', 'Dépôt', 'Articles reçus', 'Valeur Réception', 'Opérateur'],
          rows,
          summary: `Total de ${entries.length} réceptions enregistrées pour ${formatTND(entries.reduce((s, m) => s + m.totalValue, 0))}.`
        };
      }

      case 7: { // Historique des sorties
        const exits = movements.filter(m => m.type.startsWith('EXIT'));
        const rows = exits.map(m => {
          const wh = warehouses.find(w => w.id === m.sourceWarehouseId)?.name || '-';
          const itemsStr = m.items.map(i => `${i.sku} (${i.quantity} ${i.unit})`).join(', ');
          return [
            m.movementNumber,
            formatDate(m.date),
            m.documentRef || '-',
            m.partnerName || m.type,
            wh,
            itemsStr,
            formatTND(m.totalValue),
            m.userName
          ];
        });
        return {
          headers: ['N° Sortie', 'Date', 'N° Commande / Document', 'Client / Motif', 'Dépôt Source', 'Articles sortis', 'Valeur Déstockage', 'Opérateur'],
          rows,
          summary: `Total de ${exits.length} sorties enregistrées pour ${formatTND(exits.reduce((s, m) => s + m.totalValue, 0))}.`
        };
      }

      case 8: { // Mouvements par période
        const rows = movements.map(m => [
          m.movementNumber,
          formatDateTime(m.date),
          m.type,
          m.items.reduce((s, i) => s + i.quantity, 0),
          m.documentRef || '-',
          formatTND(m.totalValue),
          m.userName
        ]);
        return {
          headers: ['N° Mouvement', 'Horodatage', 'Type Flux', 'Total Unités', 'Document Réf', 'Valeur', 'Opérateur'],
          rows,
          summary: `${movements.length} transactions répertoriées au journal.`
        };
      }

      case 9: { // Produits les plus sortis
        const countMap: { [pId: string]: { sku: string; name: string; qty: number; val: number } } = {};
        movements.filter(m => m.type.startsWith('EXIT')).forEach(m => {
          m.items.forEach(it => {
            if (!countMap[it.productId]) {
              countMap[it.productId] = { sku: it.sku, name: it.productName, qty: 0, val: 0 };
            }
            countMap[it.productId].qty += it.quantity;
            countMap[it.productId].val += (it.quantity * it.unitCost);
          });
        });
        const rows = Object.values(countMap)
          .sort((a, b) => b.qty - a.qty)
          .map(r => [r.sku, r.name, r.qty, formatTND(r.val)]);
        return {
          headers: ['SKU', 'Désignation', 'Quantités Totales Déstockées', 'Valeur Consommée'],
          rows,
          summary: `Classement des rotations de stocks par volume de sortie.`
        };
      }

      case 10: { // Produits sans mouvement (dormants)
        const exitedIds = new Set(
          movements.filter(m => m.type.startsWith('EXIT')).flatMap(m => m.items.map(i => i.productId))
        );
        const rows = products.filter(p => !p.isArchived && !exitedIds.has(p.id)).map(p => {
          const { physical } = getProductStock(p.id, filterWarehouse);
          return [
            p.sku,
            p.name,
            categories.find(c => c.id === p.categoryId)?.name || '-',
            physical,
            formatTND(p.purchasePrice),
            formatTND(physical * p.purchasePrice)
          ];
        });
        return {
          headers: ['SKU', 'Désignation', 'Catégorie', 'Stock Immobilisé', 'Coût Unitaire (CMP)', 'Capital Immobilisé'],
          rows,
          summary: `${rows.length} article(s) dormant(s) sans aucun flux de sortie.`
        };
      }

      case 11: { // Historique des achats
        const rows = purchaseOrders.map(po => [
          po.orderNumber,
          po.supplierName,
          po.warehouseName,
          formatDate(po.createdAt),
          formatDate(po.expectedDate),
          po.items.length,
          formatTND(po.totalAmount),
          po.status
        ]);
        return {
          headers: ['N° Commande', 'Fournisseur', 'Dépôt', 'Date Émission', 'Date Prévue', 'Nb Lignes', 'Montant Total', 'Statut'],
          rows,
          summary: `${purchaseOrders.length} commandes d'approvisionnement enregistrées.`
        };
      }

      case 12: { // Historique des commandes clients
        const rows = salesOrders.map(so => [
          so.orderNumber,
          so.customerName,
          so.warehouseName,
          formatDate(so.createdAt),
          formatDate(so.deliveryDate),
          so.items.length,
          formatTND(so.totalAmount),
          so.status
        ]);
        return {
          headers: ['N° Commande', 'Client', 'Dépôt Expéditeur', 'Date Émission', 'Date Livraison', 'Nb Lignes', 'Montant Total', 'Statut'],
          rows,
          summary: `${salesOrders.length} commandes clients enregistrées.`
        };
      }

      case 13: { // Écarts d'inventaire
        const rows: any[] = [];
        inventorySessions.forEach(session => {
          const wh = warehouses.find(w => w.id === session.warehouseId)?.name;
          session.items.filter(it => it.variance !== 0).forEach(it => {
            rows.push([
              session.reference,
              wh,
              it.sku,
              it.name,
              it.theoreticalQty,
              it.countedQty,
              it.variance > 0 ? `+${it.variance}` : it.variance,
              formatTND(it.variance * it.unitCost),
              formatDate(session.validatedAt || session.createdAt)
            ]);
          });
        });
        return {
          headers: ['Session Inventaire', 'Dépôt', 'Réf SKU', 'Article', 'Théorique', 'Compté', 'Écart', 'Impact Financier', 'Date'],
          rows,
          summary: `${rows.length} régularisation(s) et écart(s) d'inventaire constatés.`
        };
      }

      case 14: // Valorisation estimée du stock (CMP)
      default: {
        const rows = products.filter(p => !p.isArchived).map(p => {
          const { physical, available } = getProductStock(p.id, filterWarehouse);
          const totalVal = physical * p.purchasePrice;
          return {
            sku: p.sku,
            name: p.name,
            unit: p.unit,
            cmp: p.purchasePrice,
            physical,
            available,
            totalVal
          };
        });
        const grandTotal = rows.reduce((s, r) => s + r.totalVal, 0);
        return {
          headers: ['SKU', 'Désignation', 'Unité', 'Coût Moyen Pondéré (CMP)', 'Stock Physique', 'Disponible', 'Valorisation Stock (TND)'],
          rows: rows.map(r => [r.sku, r.name, r.unit, formatTND(r.cmp), r.physical, r.available, formatTND(r.totalVal)]),
          summary: `Valorisation financière globale estimée : ${formatTND(grandTotal)} (Méthode Coût Moyen Pondéré).`
        };
      }
    }
  }, [activeReportId, products, categories, warehouses, balances, movements, purchaseOrders, salesOrders, inventorySessions, filterWarehouse]);

  const handleExportCSV = () => {
    const reportTitle = reportList.find(r => r.id === activeReportId)?.title || 'Rapport';
    exportToCSV(`rapport_${activeReportId}_${reportTitle.replace(/\s+/g, '_').toLowerCase()}`, reportData.headers, reportData.rows);
  };

  const handlePrintPDF = () => {
    const reportMeta = reportList.find(r => r.id === activeReportId);
    const reportTitle = reportMeta ? `Rapport N° ${reportMeta.id} : ${reportMeta.title}` : 'Rapport de Stock';
    const warehouseLabel = filterWarehouse === 'ALL' 
      ? 'Tous les dépôts réunis' 
      : (warehouses.find(w => w.id === filterWarehouse)?.name || filterWarehouse);

    const headersHtml = reportData.headers.map(h => `<th style="padding: 8px 10px; background: #f1f5f9; border: 1px solid #cbd5e1; font-weight: 800; font-size: 10px; text-transform: uppercase;">${h}</th>`).join('');

    const lines = reportData.rows.map((row: any, rIdx: number) => `
      <tr style="background: ${rIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        ${row.map((cell: any, cIdx: number) => {
          const isNum = typeof cell === 'number' || (typeof cell === 'string' && (cell.includes('TND') || !isNaN(Number(cell))));
          return `<td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 11px; ${isNum ? 'text-align: right; font-family: monospace; font-weight: 600;' : ''}">${cell}</td>`;
        }).join('')}
      </tr>
    `).join('');

    const content = `
      <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px 18px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="display: inline-block; font-size: 10px; font-weight: 800; color: #2563eb; text-transform: uppercase; background: #eff6ff; padding: 2px 8px; border-radius: 4px; border: 1px solid #bfdbfe; margin-bottom: 4px;">
            RAPPORT OFFICIEL ${activeReportId} / 14
          </span>
          <h2 style="font-size: 16px; font-weight: 900; color: #0f172a; margin: 2px 0;">${reportTitle}</h2>
          <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">${reportData.summary}</p>
        </div>
        <div style="text-align: right; font-size: 11px; color: #475569; border-left: 2px solid #e2e8f0; padding-left: 18px; line-height: 1.45;">
          Périmètre Dépôt : <strong>${warehouseLabel}</strong><br/>
          Lignes inventoriées : <strong>${reportData.rows.length}</strong><br/>
          Date de situation : <strong>${new Date().toLocaleDateString('fr-TN')}</strong>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr>${headersHtml}</tr>
        </thead>
        <tbody>
          ${lines.length ? lines : '<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;">Aucune donnée enregistrée</td></tr>'}
        </tbody>
      </table>

      <div style="margin-top: 30px; padding-top: 14px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 10px; color: #64748b;">
        <div>
          Certifié conforme aux registres de gestion des stocks • Stock Pro v1.0<br/>
          Document officiel à archiver avec les pièces comptables
        </div>
        <div style="text-align: right;">
          Visa et signature du Responsable de Stock :<br/><br/>
          ______________________________________
        </div>
      </div>
    `;

    printDocument(reportTitle, content, settings);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-black text-slate-800">Centre d'Analyses & Rapports (14 Modules)</h2>
          <p className="text-xs text-slate-400">Génération d'états d'inventaire, valorisation CMP et exports PDF / Excel avec logo d'entreprise</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintPDF}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Transférer et enregistrer ce rapport en document PDF officiel"
          >
            <FileDown className="w-3.5 h-3.5" /> Transférer en PDF
          </button>
          <button
            onClick={handlePrintPDF}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimer
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Exporter en CSV (Excel)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation des 14 rapports */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1 block">
            Sélectionner un rapport
          </span>
          <div className="space-y-1 max-h-[70vh] overflow-y-auto">
            {reportList.map(r => {
              const isSel = activeReportId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setActiveReportId(r.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex flex-col ${
                    isSel 
                      ? 'bg-blue-600 text-white font-bold shadow-2xs' 
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="leading-tight">{r.id}. {r.title}</span>
                  <span className={`text-[10px] mt-0.5 line-clamp-1 ${isSel ? 'text-blue-100' : 'text-slate-400'}`}>
                    {r.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Zone Principale d'affichage du rapport */}
        <div className="lg:col-span-3 space-y-4">
          {/* Entête du rapport & Filtres */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Rapport N° {activeReportId}
              </span>
              <h3 className="text-base font-black text-slate-900 mt-1">
                {reportList.find(r => r.id === activeReportId)?.title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{reportData.summary}</p>
            </div>

            {/* Actions & Filtre Entrepôt */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-semibold">Dépôt :</span>
                <select
                  value={filterWarehouse}
                  onChange={(e) => setFilterWarehouse(e.target.value)}
                  className="text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700"
                >
                  <option value="ALL">Tous les dépôts</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handlePrintPDF}
                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Exporter ce rapport en document PDF officiel"
              >
                <FileDown className="w-3.5 h-3.5" /> Exporter PDF
              </button>
            </div>
          </div>

          {/* Table de Données du rapport */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                  <tr>
                    {reportData.headers.map((h, idx) => (
                      <th key={idx} className="py-2.5 px-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={reportData.headers.length} className="text-center py-10 text-slate-400">
                        Aucune donnée enregistrée pour ce rapport.
                      </td>
                    </tr>
                  ) : (
                    reportData.rows.map((row: any, rIdx: number) => (
                      <tr key={rIdx} className="hover:bg-slate-50/80">
                        {row.map((cell: any, cIdx: number) => (
                          <td key={cIdx} className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-800">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
