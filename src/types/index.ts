export type UserRole = 
  | 'admin' 
  | 'stock_manager' 
  | 'warehouseman' 
  | 'buyer' 
  | 'sales' 
  | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  warehouseAccess?: string[];
  createdAt: string;
}

export type UnitOfMeasure = 'pièce' | 'carton' | 'kg' | 'litre' | 'mètre' | 'paquet' | 'boîte' | 'rouleau';

export interface Category {
  id: string;
  code: string;
  name: string;
  description?: string;
  productCount?: number;
  createdAt: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  manager: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId: string;
  brand?: string;
  unit: UnitOfMeasure;
  purchasePrice: number;     // Coût unitaire d'achat ou CMP actuel (TND)
  sellingPrice: number;      // Prix de vente catalogue (TND)
  minThreshold: number;      // Seuil d'alerte minimale
  maxThreshold?: number;     // Seuil de sur-stockage
  primarySupplierId?: string;
  isArchived: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockBalance {
  id: string;                // Format: `${productId}_${warehouseId}`
  productId: string;
  warehouseId: string;
  physicalQuantity: number;  // Stock physique réel
  reservedQuantity: number;  // Quantité allouée aux commandes clients
  availableQuantity: number; // physical - reserved
  location?: string;         // Emplacement (ex: Allée B, Rack 04)
  updatedAt: string;
}

export type MovementType = 
  | 'ENTRY_SUPPLIER' 
  | 'ENTRY_RETURN_CUSTOMER' 
  | 'ENTRY_INITIAL' 
  | 'ENTRY_ADJUSTMENT'
  | 'EXIT_SALE' 
  | 'EXIT_INTERNAL_USE' 
  | 'EXIT_DAMAGED' 
  | 'EXIT_LOSS' 
  | 'EXIT_RETURN_SUPPLIER'
  | 'TRANSFER_OUT' 
  | 'TRANSFER_IN';

export interface MovementItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  unit: UnitOfMeasure;
}

export interface StockMovement {
  id: string;
  movementNumber: string;    // Ex: MOV-2026-00042
  type: MovementType;
  date: string;
  sourceWarehouseId?: string;
  targetWarehouseId?: string;
  documentRef?: string;      // N° BL, Facture ou Bon de commande
  partnerId?: string;        // Fournisseur ou Client
  partnerName?: string;
  items: MovementItem[];
  totalValue: number;
  notes?: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export type TransferStatus = 'draft' | 'pending' | 'in_transit' | 'completed' | 'cancelled';

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  items: MovementItem[];
  status: TransferStatus;
  userId: string;
  userName: string;
  createdAt: string;
  completedAt?: string;
  notes?: string;
}

export interface InventoryItemCount {
  productId: string;
  sku: string;
  name: string;
  theoreticalQty: number;
  countedQty: number;
  variance: number;          // countedQty - theoreticalQty
  unitCost: number;
}

export interface InventorySession {
  id: string;
  reference: string;
  warehouseId: string;
  status: 'draft' | 'in_progress' | 'validated' | 'cancelled';
  items: InventoryItemCount[];
  createdAt: string;
  validatedAt?: string;
  validatedBy?: string;
  notes?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantityOrdered: number;
  quantityProcessed: number; // Received for PO, Delivered for SO
  unitPrice: number;
  discountPercent?: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  expectedDate: string;
  items: OrderItem[];
  status: 'draft' | 'confirmed' | 'partially_received' | 'completed' | 'cancelled';
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  warehouseId: string;
  warehouseName: string;
  deliveryDate?: string;
  items: OrderItem[];
  status: 'draft' | 'confirmed' | 'partially_prepared' | 'delivered' | 'cancelled';
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  taxId?: string;
  paymentTerms?: string;
  notes?: string;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  taxId?: string;
  notes?: string;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface AppSettings {
  companyName: string;
  companyLogo?: string;      // URL ou image encodée en base64 pour les documents officiels
  taxId: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  dateFormat: string;
  timezone: string;
  valuationMethod: 'CMP' | 'FIFO';
  lowStockAlert: boolean;
  defaultVatRate: number;    // Taux de TVA par défaut (ex: 19%)
  fiscalStamp: number;       // Timbre fiscal en dinars tunisiens (ex: 1.000 TND)
}

export interface POSSaleItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  total: number;
  unit: UnitOfMeasure;
}

export interface POSSaleTicket {
  id: string;
  ticketNumber: string;      // Ex: TIK-2026-00042
  invoiceNumber?: string;    // Ex: FACT-2026-00042
  date: string;
  customerId?: string;
  customerName: string;
  customerTaxId?: string;
  customerAddress?: string;
  warehouseId: string;
  warehouseName: string;
  items: POSSaleItem[];
  subtotalHT: number;
  vatRate: number;
  vatAmount: number;
  fiscalStamp: number;
  totalTTC: number;
  paymentMethod: 'especes' | 'carte' | 'cheque' | 'virement';
  amountReceived: number;
  changeReturned: number;
  cashierId: string;
  cashierName: string;
  notes?: string;
  createdAt: string;
}

export interface StockAlert {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'danger' | 'info';
  productId?: string;
  warehouseId?: string;
  date: string;
  read: boolean;
}

export type DocumentType = 
  | 'INVOICE'          // Facture de vente officielle
  | 'DELIVERY_NOTE'    // Bon de livraison (BL)
  | 'PROFORMA'         // Devis commercial ou Facture proforma
  | 'PURCHASE_ORDER'   // Bon de commande fournisseur
  | 'RECEPTION_NOTE'   // Bon de réception fournisseur (BR)
  | 'EXIT_SLIP';       // Bon de sortie interne ou transfert

export type DocumentStatus = 'draft' | 'validated' | 'paid' | 'delivered' | 'cancelled';

export interface DocumentItem {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unit: UnitOfMeasure;
  unitPrice: number;     // Prix unitaire HT (TND)
  discountPercent?: number;
  totalHT: number;       // quantity * unitPrice * (1 - discount/100)
}

export interface CommercialDocument {
  id: string;
  documentNumber: string; // Ex: FACT-2026-00042, BL-2026-00018, DEV-2026-00005, BR-2026-00012
  type: DocumentType;
  title: string;
  date: string;
  dueDate?: string;
  warehouseId: string;
  warehouseName: string;
  // Partenaire
  partnerType: 'customer' | 'supplier';
  partnerId?: string;
  partnerName: string;
  partnerTaxId?: string;
  partnerAddress?: string;
  partnerPhone?: string;
  partnerEmail?: string;
  // Lignes d'articles
  items: DocumentItem[];
  // Données financières (TND)
  subtotalHT: number;
  vatRate: number;        // Taux TVA en % (ex: 19)
  vatAmount: number;
  fiscalStamp: number;    // Timbre fiscal (1.000 TND pour les factures de vente)
  totalTTC: number;
  paymentMethod?: 'especes' | 'cheque' | 'virement' | 'traite' | 'carte' | 'a_terme';
  status: DocumentStatus;
  notes?: string;
  relatedOrderId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
