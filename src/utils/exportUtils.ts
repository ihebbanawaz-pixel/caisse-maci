/**
 * Utilitaires d'export CSV / Excel, impression PDF, Facture et Ticket de Caisse pour Stock Pro
 */
import { AppSettings, POSSaleTicket, CommercialDocument } from '../types';
import { formatTND, formatDate, formatDateTime } from './formatters';

export const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  if (!rows || !rows.length) {
    alert("Aucune donnée à exporter.");
    return;
  }
  
  // Séparateur point-virgule compatible avec Excel français
  const separator = ';';
  
  const escapeCell = (cell: any): string => {
    if (cell === null || cell === undefined) return '';
    const str = String(cell).replace(/"/g, '""');
    return str.search(/("|\n|;)/g) >= 0 ? `"${str}"` : str;
  };

  const headerLine = headers.map(escapeCell).join(separator);
  const rowsLines = rows.map(row => row.map(escapeCell).join(separator));
  const fullContent = [headerLine, ...rowsLines].join('\r\n');

  // \ufeff correspond au BOM UTF-8 pour obliger Excel à ouvrir le fichier avec les accents français corrects
  const blob = new Blob(['\ufeff' + fullContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const printDocument = (title: string, htmlContent: string, settings?: AppSettings) => {
  const printWindow = window.open('', '_blank', 'width=950,height=950');
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres pop-up dans votre navigateur pour imprimer ou exporter le document en PDF.");
    return;
  }

  const logoHtml = settings?.companyLogo 
    ? `<img src="${settings.companyLogo}" alt="Logo Entreprise" style="max-height: 58px; max-width: 220px; object-fit: contain; margin-bottom: 6px; display: block;" />`
    : `<div class="brand">STOCK <span>PRO</span></div>`;

  const companyDetails = settings ? `
    <div style="font-size: 11px; color: #475569; line-height: 1.45;">
      <strong style="color: #0f172a; font-size: 12.5px;">${settings.companyName}</strong><br/>
      ${settings.address ? `Adresse : ${settings.address}<br/>` : ''}
      ${settings.taxId ? `Matricule Fiscal (MF) : <strong>${settings.taxId}</strong>` : ''}
      ${settings.phone ? ` • Tél : ${settings.phone}` : ''}
      ${settings.email ? ` • Email : ${settings.email}` : ''}
    </div>
  ` : '';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>${title} — ${settings?.companyName || 'Stock Pro'}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }
        * { box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
          padding: 24px; 
          color: #0f172a; 
          background: #fff; 
          margin: 0;
        }
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start; 
          border-bottom: 2.5px solid #2563eb; 
          padding-bottom: 14px; 
          margin-bottom: 18px; 
        }
        .brand { font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; }
        .brand span { color: #2563eb; }
        .title { 
          font-size: 16px; 
          font-weight: 900; 
          color: #0f172a; 
          margin-bottom: 12px; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
        }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
        th { 
          background: #f1f5f9; 
          padding: 8px 10px; 
          text-align: left; 
          font-weight: 800; 
          color: #1e293b; 
          border: 1px solid #cbd5e1; 
          font-size: 10px; 
          text-transform: uppercase; 
          letter-spacing: 0.3px;
        }
        td { padding: 7px 10px; border: 1px solid #e2e8f0; }
        tr:nth-child(even) { background: #f8fafc; }
        tr { page-break-inside: avoid; }
        .footer { 
          margin-top: 30px; 
          font-size: 10px; 
          color: #64748b; 
          text-align: center; 
          border-top: 1px solid #e2e8f0; 
          padding-top: 10px; 
        }
        .print-btn-bar { 
          margin-bottom: 20px; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          background: #eff6ff; 
          border: 1px solid #bfdbfe; 
          padding: 10px 16px; 
          border-radius: 8px; 
        }
        .btn-group { display: flex; gap: 8px; }
        .action-btn { 
          background: #2563eb; 
          color: #fff; 
          border: none; 
          padding: 8px 18px; 
          border-radius: 6px; 
          font-size: 12px; 
          font-weight: 700; 
          cursor: pointer; 
          display: inline-flex; 
          align-items: center; 
          gap: 6px;
          transition: background 0.15s;
        }
        .action-btn:hover { background: #1d4ed8; }
        .action-btn.secondary { background: #0f172a; }
        .action-btn.secondary:hover { background: #1e293b; }
        .helper-text { font-size: 11px; color: #1e40af; font-weight: 600; }
        @media print {
          body { padding: 0; }
          .print-btn-bar { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="print-btn-bar">
        <span class="helper-text">💡 Astuce : Dans la fenêtre d'impression, choisissez la destination <strong>« Enregistrer au format PDF »</strong> pour télécharger le fichier PDF officiel.</span>
        <div class="btn-group">
          <button class="action-btn" onclick="window.print()">📥 Enregistrer / Télécharger en PDF</button>
          <button class="action-btn secondary" onclick="window.print()">🖨️ Imprimer</button>
        </div>
      </div>
      <div class="header">
        <div>
          ${logoHtml}
          ${companyDetails}
        </div>
        <div style="text-align: right; font-size: 11px; color: #475569; line-height: 1.45;">
          Date d'édition : <strong>${new Date().toLocaleDateString('fr-TN')}</strong><br/>
          Heure d'émission : <strong>${new Date().toLocaleTimeString('fr-TN')}</strong><br/>
          <span style="display: inline-block; margin-top: 4px; font-size: 9.5px; font-weight: 800; background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; border: 1px solid #c7d2fe;">
            DOCUMENT OFFICIEL CERTIFIÉ
          </span>
        </div>
      </div>
      <div class="title">${title}</div>
      ${htmlContent}
      <div class="footer">
        Document officiel généré par Stock Pro • ${settings?.companyName || 'Stock Pro'} • Matricule Fiscal : ${settings?.taxId || 'N/A'} • Édition sécurisée
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
};

/**
 * Impression Spéciale : Ticket de Caisse (Format ticket thermique 80mm compact)
 */
export const printPOSTicket = (ticket: POSSaleTicket, settings: AppSettings) => {
  const printWindow = window.open('', '_blank', 'width=440,height=780');
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres pop-up pour imprimer le ticket de caisse.");
    return;
  }

  const logoHtml = settings.companyLogo 
    ? `<img src="${settings.companyLogo}" alt="Logo Entreprise" style="max-height: 48px; max-width: 150px; margin: 0 auto 6px auto; display: block; object-fit: contain;" />`
    : `<div style="font-size: 18px; font-weight: 900; letter-spacing: 1px;">STOCK PRO</div>`;

  const linesHtml = ticket.items.map(it => `
    <tr>
      <td style="padding: 4px 0; text-align: left;">
        <div style="font-weight: 800; font-size: 11px;">${it.productName}</div>
        <div style="font-size: 10px; color: #475569;">${it.quantity} ${it.unit} x ${formatTND(it.unitPrice)}</div>
      </td>
      <td style="padding: 4px 0; text-align: right; font-weight: 800; font-size: 11px; vertical-align: top;">
        ${formatTND(it.total)}
      </td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>Ticket Caisse ${ticket.ticketNumber}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: 'Courier New', Courier, monospace, -apple-system, sans-serif;
          width: 80mm;
          margin: 0 auto;
          padding: 12px 10px;
          color: #000;
          font-size: 11px;
          background: #fff;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: 900; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .double-divider { border-top: 2px solid #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .btn-print {
          background: #2563eb; color: #fff; border: none; padding: 8px 12px;
          border-radius: 6px; font-weight: bold; cursor: pointer; margin-bottom: 12px;
          width: 100%; font-family: sans-serif; font-size: 12px;
        }
        .btn-print:hover { background: #1d4ed8; }
        @media print {
          .no-print { display: none !important; }
          body { width: 100%; padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="no-print">
        <button class="btn-print" onclick="window.print()">🖨️ Imprimer Ticket Caisse (80mm)</button>
      </div>
      <div class="text-center">
        ${logoHtml}
        <div class="bold" style="font-size: 13px; text-transform: uppercase;">${settings.companyName}</div>
        <div style="font-size: 10px;">${settings.address}</div>
        <div style="font-size: 10px;">Mat. Fiscal : <strong>${settings.taxId}</strong></div>
        <div style="font-size: 10px;">Tél : ${settings.phone}</div>
      </div>

      <div class="divider"></div>

      <div style="display: flex; justify-content: space-between; font-size: 10px;">
        <span><strong>TICKET N° :</strong> ${ticket.ticketNumber}</span>
        <span>${formatDateTime(ticket.date)}</span>
      </div>
      <div style="font-size: 10px;">Dépôt : <strong>${ticket.warehouseName}</strong></div>
      <div style="font-size: 10px;">Caissier : ${ticket.cashierName}</div>
      <div style="font-size: 10px;">Client : <strong>${ticket.customerName}</strong></div>

      <div class="divider"></div>

      <table>
        <thead>
          <tr style="border-bottom: 1px dashed #000;">
            <th style="text-align: left; padding-bottom: 4px;">Désignation</th>
            <th style="text-align: right; padding-bottom: 4px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml}
        </tbody>
      </table>

      <div class="double-divider"></div>

      <table style="font-size: 11px;">
        <tr>
          <td>Total Hors Taxes (HT) :</td>
          <td class="text-right">${formatTND(ticket.subtotalHT)}</td>
        </tr>
        <tr>
          <td>TVA (${ticket.vatRate}%) :</td>
          <td class="text-right">${formatTND(ticket.vatAmount)}</td>
        </tr>
        <tr>
          <td>Droit de Timbre :</td>
          <td class="text-right">${formatTND(ticket.fiscalStamp)}</td>
        </tr>
        <tr style="font-size: 13px;" class="bold">
          <td style="padding-top: 5px;">NET À PAYER (TTC) :</td>
          <td class="text-right" style="padding-top: 5px;">${formatTND(ticket.totalTTC)}</td>
        </tr>
      </table>

      <div class="divider"></div>

      <table style="font-size: 10.5px;">
        <tr>
          <td>Mode de Règlement :</td>
          <td class="text-right bold" style="text-transform: uppercase;">${ticket.paymentMethod}</td>
        </tr>
        <tr>
          <td>Montant Reçu :</td>
          <td class="text-right">${formatTND(ticket.amountReceived)}</td>
        </tr>
        <tr>
          <td>Monnaie Rendue :</td>
          <td class="text-right bold" style="color: #000;">${formatTND(ticket.changeReturned)}</td>
        </tr>
      </table>

      <div class="double-divider"></div>

      <div class="text-center" style="font-size: 10px; margin-top: 10px;">
        <p style="margin: 2px 0; font-weight: bold;">*** MERCI DE VOTRE VISITE ***</p>
        <p style="margin: 2px 0; color: #475569;">Conservez ce ticket pour tout échange ou réclamation dans les 48h.</p>
        <p style="margin: 4px 0; font-size: 9px; color: #94a3b8;">Édité via Stock Pro • Solution Gestion de Stock</p>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
};

/**
 * Impression Spéciale : Facture Commerciale Officielle (Format A4 standard avec timbre fiscal)
 */
export const printOfficialInvoice = (ticketOrOrder: any, settings: AppSettings) => {
  const printWindow = window.open('', '_blank', 'width=950,height=950');
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres pop-up pour éditer la facture officielle.");
    return;
  }

  const invoiceNumber = ticketOrOrder.invoiceNumber || `FACT-${ticketOrOrder.ticketNumber || ticketOrOrder.orderNumber || generateSequenceFallback()}`;
  const dateStr = ticketOrOrder.date || ticketOrOrder.createdAt || new Date().toISOString();
  const customerName = ticketOrOrder.customerName || 'Client Comptoir (Passager)';
  const customerTaxId = ticketOrOrder.customerTaxId || '-';
  const customerAddress = ticketOrOrder.customerAddress || '-';

  const logoHtml = settings.companyLogo 
    ? `<img src="${settings.companyLogo}" alt="Logo Entreprise" style="max-height: 64px; max-width: 220px; object-fit: contain; margin-bottom: 6px; display: block;" />`
    : `<div style="font-size: 24px; font-weight: 900; color: #0f172a;">STOCK <span style="color: #2563eb;">PRO</span></div>`;

  const linesHtml = ticketOrOrder.items.map((it: any, idx: number) => {
    const unitPrice = it.unitPrice || 0;
    const qty = it.quantity || it.quantityOrdered || 1;
    const totalLine = it.total || (qty * unitPrice);
    return `
      <tr>
        <td style="text-align: center; color: #64748b; font-weight: bold;">${idx + 1}</td>
        <td style="font-family: monospace; font-weight: 700; color: #2563eb;">${it.sku}</td>
        <td style="font-weight: 600; color: #0f172a;">${it.productName || it.name}</td>
        <td style="text-align: center;">${it.unit || 'pièce'}</td>
        <td style="text-align: center; font-weight: 800;">${qty}</td>
        <td style="text-align: right; font-family: monospace;">${formatTND(unitPrice)}</td>
        <td style="text-align: right; font-weight: 800; font-family: monospace;">${formatTND(totalLine)}</td>
      </tr>
    `;
  }).join('');

  const subtotalHT = ticketOrOrder.subtotalHT || ticketOrOrder.items.reduce((s: number, i: any) => s + (i.total || (i.quantity * i.unitPrice)), 0);
  const vatRate = ticketOrOrder.vatRate || settings.defaultVatRate || 19;
  const vatAmount = ticketOrOrder.vatAmount || (subtotalHT * (vatRate / 100));
  const fiscalStamp = ticketOrOrder.fiscalStamp !== undefined ? ticketOrOrder.fiscalStamp : (settings.fiscalStamp || 1.000);
  const totalTTC = ticketOrOrder.totalTTC || (subtotalHT + vatAmount + fiscalStamp);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>Facture ${invoiceNumber} — ${settings.companyName}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          padding: 24px;
          color: #0f172a;
          font-size: 11.5px;
          background: #fff;
          margin: 0;
        }
        .header-grid { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; }
        .company-info { font-size: 11px; color: #475569; line-height: 1.45; margin-top: 6px; }
        .invoice-card {
          background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; text-align: right; min-width: 250px;
        }
        .invoice-title { font-size: 18px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; }
        .client-box {
          border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; background: #fff;
          display: flex; justify-content: space-between; align-items: flex-start;
        }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
        th { background: #f1f5f9; padding: 8px 10px; font-weight: 800; color: #1e293b; border: 1px solid #cbd5e1; text-transform: uppercase; font-size: 10px; }
        td { padding: 8px 10px; border: 1px solid #e2e8f0; }
        tr:nth-child(even) { background: #fafafa; }
        tr { page-break-inside: avoid; }
        .totals-table { width: 340px; margin-left: auto; margin-top: 16px; font-size: 11px; }
        .totals-table td { border: none; padding: 5px 8px; }
        .total-ttc-row { font-size: 14px; font-weight: 900; color: #1e3a8a; border-top: 2px solid #2563eb !important; background: #eff6ff; }
        .btn-bar { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          background: #eff6ff; 
          border: 1px solid #bfdbfe; 
          padding: 10px 16px; 
          border-radius: 8px; 
          margin-bottom: 22px; 
        }
        .btn-action { 
          background: #2563eb; 
          color: #fff; 
          border: none; 
          padding: 8px 18px; 
          border-radius: 6px; 
          font-weight: 700; 
          cursor: pointer; 
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn-action:hover { background: #1d4ed8; }
        .btn-action.secondary { background: #0f172a; }
        .btn-action.secondary:hover { background: #1e293b; }
        @media print {
          .btn-bar { display: none !important; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="btn-bar">
        <span style="font-size: 11px; color: #1e40af; font-weight: 600;">
          💡 Enregistrement PDF : Choisissez <strong>« Enregistrer au format PDF »</strong> dans la boîte d'impression.
        </span>
        <div style="display: flex; gap: 8px;">
          <button class="btn-action" onclick="window.print()">📥 Télécharger Facture en PDF</button>
          <button class="btn-action secondary" onclick="window.print()">🖨️ Imprimer Facture</button>
        </div>
      </div>

      <div class="header-grid">
        <div>
          ${logoHtml}
          <div class="company-info">
            <strong style="font-size: 13px; color: #0f172a;">${settings.companyName}</strong><br/>
            ${settings.address}<br/>
            Matricule Fiscal : <strong>${settings.taxId}</strong><br/>
            Téléphone : ${settings.phone} | Email : ${settings.email}
          </div>
        </div>

        <div class="invoice-card">
          <div class="invoice-title">FACTURE OFFICIELLE</div>
          <div style="font-size: 13px; font-weight: 800; color: #2563eb; font-family: monospace; margin: 4px 0;">
            ${invoiceNumber}
          </div>
          <div style="font-size: 11px; color: #64748b; line-height: 1.4;">
            Date de facturation : <strong>${formatDate(dateStr)}</strong><br/>
            Règlement : <strong>${ticketOrOrder.paymentMethod ? ticketOrOrder.paymentMethod.toUpperCase() : 'COMPTANT'}</strong>
          </div>
        </div>
      </div>

      <!-- Bloc Client Destinataire -->
      <div class="client-box">
        <div>
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 4px;">
            FACTURÉ À (CLIENT) :
          </span>
          <div style="font-size: 13.5px; font-weight: 800; color: #0f172a;">${customerName}</div>
          <div style="color: #475569; font-size: 11px; margin-top: 2px; line-height: 1.4;">
            ${customerAddress !== '-' ? `Adresse : ${customerAddress}<br/>` : ''}
            ${customerTaxId !== '-' ? `Matricule Fiscal / CIN : <strong>${customerTaxId}</strong>` : ''}
          </div>
        </div>
        <div style="text-align: right; font-size: 11px; color: #64748b;">
          Dépôt expéditeur : <strong>${ticketOrOrder.warehouseName || 'Dépôt Central'}</strong><br/>
          Réf. Transaction : <strong>${ticketOrOrder.ticketNumber || ticketOrOrder.orderNumber || '-'}</strong>
        </div>
      </div>

      <!-- Tableau des Lignes Articles -->
      <table>
        <thead>
          <tr>
            <th style="width: 32px; text-align: center;">N°</th>
            <th style="width: 100px;">Réf. SKU</th>
            <th>Désignation de la marchandise</th>
            <th style="width: 55px; text-align: center;">Unité</th>
            <th style="width: 60px; text-align: center;">Quantité</th>
            <th style="width: 95px; text-align: right;">Prix Unit. HT</th>
            <th style="width: 105px; text-align: right;">Total Net HT</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml}
        </tbody>
      </table>

      <!-- Récapitulatif Financier -->
      <table class="totals-table">
        <tr>
          <td style="color: #475569;">Total Brut Hors Taxes (HT) :</td>
          <td style="text-align: right; font-weight: 700; font-family: monospace;">${formatTND(subtotalHT)}</td>
        </tr>
        <tr>
          <td style="color: #475569;">TVA applicable (${vatRate}%) :</td>
          <td style="text-align: right; font-weight: 700; font-family: monospace;">${formatTND(vatAmount)}</td>
        </tr>
        <tr>
          <td style="color: #475569;">Droit de Timbre Fiscal :</td>
          <td style="text-align: right; font-weight: 700; font-family: monospace;">${formatTND(fiscalStamp)}</td>
        </tr>
        <tr class="total-ttc-row">
          <td>TOTAL NET À PAYER (TTC) :</td>
          <td style="text-align: right; font-family: monospace;">${formatTND(totalTTC)}</td>
        </tr>
      </table>

      <div style="margin-top: 20px; padding: 10px 14px; background: #f8fafc; border-radius: 6px; font-size: 10.5px; color: #475569; border-left: 3px solid #2563eb;">
        <strong>Condition légale :</strong> La présente facture est certifiée sincère et conforme. En cas de retard de paiement, des pénalités seront exigées selon les taux légaux en vigueur.
      </div>

      <div style="margin-top: 35px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="width: 250px; font-size: 10.5px; color: #64748b; text-align: center;">
          Accusé de réception & signature du client :<br/><br/><br/><br/>
          __________________________________
        </div>

        <div style="width: 250px; font-size: 10.5px; color: #64748b; text-align: center;">
          Cachet et signature de l'entreprise :<br/><br/>
          <div style="border: 1.5px dashed #cbd5e1; width: 140px; height: 65px; margin: 6px auto; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #94a3b8;">
            Emplacement Cachet
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
};

const generateSequenceFallback = () => {
  return `${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
};

/**
 * Impression Spéciale et Transfert PDF pour tout document commercial et document de travail :
 * - Facture de Vente
 * - Bon de Livraison (BL)
 * - Devis / Facture Proforma
 * - Bon de Réception Fournisseur (BR)
 * - Bon de Sortie & Transfert
 */
export const printCommercialDocument = (doc: CommercialDocument, settings: AppSettings) => {
  const printWindow = window.open('', '_blank', 'width=950,height=950');
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres pop-up dans votre navigateur pour imprimer ou exporter le document en PDF.");
    return;
  }

  const logoHtml = settings.companyLogo 
    ? `<img src="${settings.companyLogo}" alt="Logo Entreprise" style="max-height: 64px; max-width: 220px; object-fit: contain; margin-bottom: 6px; display: block;" />`
    : `<div style="font-size: 24px; font-weight: 900; color: #0f172a;">STOCK <span style="color: #2563eb;">PRO</span></div>`;

  // Métadonnées selon le type de document
  let docBadgeColor = '#2563eb';
  let docBadgeBg = '#eff6ff';
  let docTypeTitle = 'DOCUMENT COMMERCIAL';
  let partnerSectionTitle = doc.partnerType === 'supplier' ? 'FOURNISSEUR (EXPÉDITEUR) :' : 'CLIENT (DESTINATAIRE) :';
  let signatureLeftTitle = 'Visa et signature du destinataire :';
  let signatureRightTitle = "Pour l'entreprise (Cachet & Signature) :";
  let specificNotice = '';

  switch (doc.type) {
    case 'INVOICE':
      docTypeTitle = 'FACTURE OFFICIELLE DE VENTE';
      docBadgeColor = '#2563eb';
      docBadgeBg = '#eff6ff';
      partnerSectionTitle = 'FACTURÉ À (CLIENT) :';
      signatureLeftTitle = 'Accusé de réception & signature du client :';
      signatureRightTitle = 'Cachet et signature de la direction :';
      specificNotice = '<strong>Condition légale :</strong> La présente facture est certifiée conforme et sincère. En cas de retard de paiement, des pénalités seront appliquées selon les taux légaux en vigueur.';
      break;
    case 'DELIVERY_NOTE':
      docTypeTitle = 'BON DE LIVRAISON (BL)';
      docBadgeColor = '#059669';
      docBadgeBg = '#ecfdf5';
      partnerSectionTitle = 'LIVRÉ À (DESTINATAIRE) :';
      signatureLeftTitle = 'Réception client (« Reçu conforme et en bon état ») :';
      signatureRightTitle = 'Chauffeur / Livreur expéditeur :';
      specificNotice = '<strong>Attestation de livraison :</strong> Le client ou son représentant atteste avoir reçu les colis et marchandises en parfait état de conformité avec la commande passée.';
      break;
    case 'PROFORMA':
      docTypeTitle = 'DEVIS / FACTURE PROFORMA';
      docBadgeColor = '#4f46e5';
      docBadgeBg = '#eef2ff';
      partnerSectionTitle = 'DEVIS ÉTABLI POUR (PROSPECT / CLIENT) :';
      signatureLeftTitle = 'Bon pour accord & commande (Date & signature client) :';
      signatureRightTitle = 'Direction commerciale :';
      specificNotice = '<strong>Validité de l\'offre :</strong> La présente proposition de prix reste valable pendant une durée de trente (30) jours à compter de sa date d\'émission.';
      break;
    case 'RECEPTION_NOTE':
      docTypeTitle = 'BON DE RÉCEPTION FOURNISSEUR (BR)';
      docBadgeColor = '#d97706';
      docBadgeBg = '#fffbeb';
      partnerSectionTitle = 'PROVENANCE (FOURNISSEUR) :';
      signatureLeftTitle = 'Livreur / Transporteur externe :';
      signatureRightTitle = 'Magasinier réceptionnaire Stock Pro :';
      specificNotice = '<strong>Contrôle physique :</strong> Réception sous réserve de contrôle qualitatif et quantitatif des emballages d\'origine.';
      break;
    case 'EXIT_SLIP':
      docTypeTitle = 'BON DE SORTIE DE STOCK / DÉSTOCKAGE';
      docBadgeColor = '#e11d48';
      docBadgeBg = '#fff1f2';
      partnerSectionTitle = 'SERVICE OU PROJET BÉNÉFICIAIRE :';
      signatureLeftTitle = 'Demandeur / Destinataire du matériel :';
      signatureRightTitle = 'Responsable du dépôt expéditeur :';
      specificNotice = '<strong>Déstockage interne :</strong> Ce bon justifie la sortie définitive des articles des registres d\'inventaire.';
      break;
    case 'PURCHASE_ORDER':
      docTypeTitle = 'BON DE COMMANDE FOURNISSEUR (BC)';
      docBadgeColor = '#0284c7';
      docBadgeBg = '#f0f9ff';
      partnerSectionTitle = 'COMMANDE ADRESSÉE À (FOURNISSEUR) :';
      signatureLeftTitle = 'Accusé de réception du fournisseur :';
      signatureRightTitle = 'Service des Achats & Approvisionnements :';
      specificNotice = '<strong>Conditions d\'achat :</strong> Veuillez nous confirmer la date de livraison prévue et nous adresser le bon de livraison lors du dépôt.';
      break;
  }

  const linesHtml = doc.items.map((it, idx) => `
    <tr>
      <td style="text-align: center; color: #64748b; font-weight: bold;">${idx + 1}</td>
      <td style="font-family: monospace; font-weight: 700; color: #2563eb;">${it.sku}</td>
      <td style="font-weight: 600; color: #0f172a;">${it.productName}</td>
      <td style="text-align: center;">${it.unit}</td>
      <td style="text-align: center; font-weight: 800; font-size: 12px;">${it.quantity}</td>
      <td style="text-align: right; font-family: monospace;">${formatTND(it.unitPrice)}</td>
      <td style="text-align: center; color: #64748b;">${it.discountPercent ? `${it.discountPercent}%` : '-'}</td>
      <td style="text-align: right; font-weight: 800; font-family: monospace;">${formatTND(it.totalHT)}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>${doc.documentNumber} — ${docTypeTitle}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          padding: 24px;
          color: #0f172a;
          font-size: 11.5px;
          background: #fff;
          margin: 0;
        }
        .header-grid { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; }
        .company-info { font-size: 11px; color: #475569; line-height: 1.45; margin-top: 6px; }
        .doc-badge-card {
          background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; text-align: right; min-width: 270px;
        }
        .doc-title { font-size: 17px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; }
        .client-box {
          border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; background: #fff;
          display: flex; justify-content: space-between; align-items: flex-start;
        }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
        th { background: #f1f5f9; padding: 8px 10px; font-weight: 800; color: #1e293b; border: 1px solid #cbd5e1; text-transform: uppercase; font-size: 10px; }
        td { padding: 8px 10px; border: 1px solid #e2e8f0; }
        tr:nth-child(even) { background: #fafafa; }
        tr { page-break-inside: avoid; }
        .totals-table { width: 340px; margin-left: auto; margin-top: 16px; font-size: 11px; }
        .totals-table td { border: none; padding: 5px 8px; }
        .total-ttc-row { font-size: 14px; font-weight: 900; color: #1e3a8a; border-top: 2px solid #2563eb !important; background: #eff6ff; }
        .btn-bar { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          background: #eff6ff; 
          border: 1px solid #bfdbfe; 
          padding: 10px 16px; 
          border-radius: 8px; 
          margin-bottom: 22px; 
        }
        .btn-action { 
          background: #2563eb; 
          color: #fff; 
          border: none; 
          padding: 8px 18px; 
          border-radius: 6px; 
          font-weight: 700; 
          cursor: pointer; 
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn-action:hover { background: #1d4ed8; }
        .btn-action.secondary { background: #0f172a; }
        .btn-action.secondary:hover { background: #1e293b; }
        @media print {
          .btn-bar { display: none !important; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="btn-bar">
        <span style="font-size: 11px; color: #1e40af; font-weight: 600;">
          💡 Astuce PDF : Choisissez la destination <strong>« Enregistrer au format PDF »</strong> dans votre navigateur pour exporter ce document.
        </span>
        <div style="display: flex; gap: 8px;">
          <button class="btn-action" onclick="window.print()">📥 Télécharger / Enregistrer en PDF (A4)</button>
          <button class="btn-action secondary" onclick="window.print()">🖨️ Imprimer le Document</button>
        </div>
      </div>

      <div class="header-grid">
        <div>
          ${logoHtml}
          <div class="company-info">
            <strong style="font-size: 13px; color: #0f172a;">${settings.companyName}</strong><br/>
            ${settings.address}<br/>
            Matricule Fiscal (MF) : <strong>${settings.taxId}</strong><br/>
            Téléphone : ${settings.phone} | Email : ${settings.email}
          </div>
        </div>

        <div class="doc-badge-card">
          <div class="doc-title">${docTypeTitle}</div>
          <div style="font-size: 14px; font-weight: 900; color: ${docBadgeColor}; font-family: monospace; margin: 4px 0;">
            ${doc.documentNumber}
          </div>
          <div style="font-size: 11px; color: #64748b; line-height: 1.45;">
            Date d'émission : <strong>${formatDate(doc.date)}</strong><br/>
            ${doc.dueDate ? `Date d'échéance / Livraison : <strong>${formatDate(doc.dueDate)}</strong><br/>` : ''}
            Statut : <strong style="text-transform: uppercase;">${doc.status}</strong>
            ${doc.paymentMethod ? `<br/>Règlement : <strong>${doc.paymentMethod.toUpperCase()}</strong>` : ''}
          </div>
        </div>
      </div>

      <!-- Bloc Partenaire (Client / Fournisseur) -->
      <div class="client-box">
        <div>
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 4px;">
            ${partnerSectionTitle}
          </span>
          <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${doc.partnerName}</div>
          <div style="color: #475569; font-size: 11px; margin-top: 2px; line-height: 1.45;">
            ${doc.partnerAddress ? `Adresse : ${doc.partnerAddress}<br/>` : ''}
            ${doc.partnerTaxId ? `Matricule Fiscal / CIN : <strong>${doc.partnerTaxId}</strong><br/>` : ''}
            ${doc.partnerPhone ? `Téléphone : ${doc.partnerPhone}` : ''}
          </div>
        </div>
        <div style="text-align: right; font-size: 11px; color: #64748b; line-height: 1.45;">
          Dépôt concerné : <strong>${doc.warehouseName}</strong><br/>
          Réf. Interne : <strong>${doc.relatedOrderId || doc.id}</strong><br/>
          Établi par : <strong>${doc.createdBy || 'Stock Pro'}</strong>
        </div>
      </div>

      <!-- Tableau des Lignes Articles -->
      <table>
        <thead>
          <tr>
            <th style="width: 30px; text-align: center;">N°</th>
            <th style="width: 100px;">Réf. SKU</th>
            <th>Désignation des Articles</th>
            <th style="width: 55px; text-align: center;">Unité</th>
            <th style="width: 60px; text-align: center;">Quantité</th>
            <th style="width: 95px; text-align: right;">Prix Unit. HT</th>
            <th style="width: 55px; text-align: center;">Remise</th>
            <th style="width: 105px; text-align: right;">Total Net HT</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml}
        </tbody>
      </table>

      <!-- Récapitulatif Financier -->
      <table class="totals-table">
        <tr>
          <td style="color: #475569;">Total Brut Hors Taxes (HT) :</td>
          <td style="text-align: right; font-weight: 700; font-family: monospace;">${formatTND(doc.subtotalHT)}</td>
        </tr>
        <tr>
          <td style="color: #475569;">TVA légale (${doc.vatRate}%) :</td>
          <td style="text-align: right; font-weight: 700; font-family: monospace;">${formatTND(doc.vatAmount)}</td>
        </tr>
        ${doc.fiscalStamp > 0 ? `
          <tr>
            <td style="color: #475569;">Droit de Timbre Fiscal :</td>
            <td style="text-align: right; font-weight: 700; font-family: monospace;">${formatTND(doc.fiscalStamp)}</td>
          </tr>
        ` : ''}
        <tr class="total-ttc-row">
          <td>TOTAL NET À PAYER (TTC) :</td>
          <td style="text-align: right; font-family: monospace;">${formatTND(doc.totalTTC)}</td>
        </tr>
      </table>

      ${doc.notes ? `
        <div style="margin-top: 16px; padding: 10px 14px; background: #f8fafc; border-radius: 6px; font-size: 11px; color: #475569; border-left: 3px solid #cbd5e1;">
          <strong>Observations & Remarques :</strong> ${doc.notes}
        </div>
      ` : ''}

      ${specificNotice ? `
        <div style="margin-top: 14px; padding: 10px 14px; background: ${docBadgeBg}; border-radius: 6px; font-size: 10.5px; color: #1e293b; border-left: 3px solid ${docBadgeColor};">
          ${specificNotice}
        </div>
      ` : ''}

      <!-- Signatures & Cachets -->
      <div style="margin-top: 35px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="width: 270px; font-size: 10.5px; color: #64748b; text-align: center;">
          ${signatureLeftTitle}<br/><br/><br/><br/>
          ____________________________________
        </div>

        <div style="width: 270px; font-size: 10.5px; color: #64748b; text-align: center;">
          ${signatureRightTitle}<br/><br/>
          <div style="border: 1.5px dashed #cbd5e1; width: 145px; height: 65px; margin: 6px auto; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #94a3b8;">
            Emplacement Cachet
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
};
