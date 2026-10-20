import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Product, 
  Warehouse, 
  Category, 
  StockBalance, 
  StockMovement, 
  Supplier, 
  Customer, 
  PurchaseOrder, 
  SalesOrder, 
  InventorySession, 
  StockTransfer, 
  AppSettings, 
  StockAlert,
  MovementItem,
  MovementType,
  POSSaleTicket,
  POSSaleItem,
  CommercialDocument,
  DocumentType,
  DocumentStatus
} from '../types';
import { 
  DEFAULT_SETTINGS, 
  DEMO_PRODUCTS, 
  DEMO_WAREHOUSES, 
  DEMO_CATEGORIES, 
  DEMO_SUPPLIERS, 
  DEMO_CUSTOMERS,
  DEMO_COMMERCIAL_DOCUMENTS
} from '../firebase/seedData';
import { StockEngine, TransactionResult } from '../services/stockEngine';
import { generateSequence } from '../utils/formatters';

interface StockContextType {
  products: Product[];
  categories: Category[];
  warehouses: Warehouse[];
  balances: StockBalance[];
  movements: StockMovement[];
  suppliers: Supplier[];
  customers: Customer[];
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  inventorySessions: InventorySession[];
  transfers: StockTransfer[];
  posTickets: POSSaleTicket[];
  commercialDocuments: CommercialDocument[];
  settings: AppSettings;
  alerts: StockAlert[];
  selectedWarehouseId: string;
  setSelectedWarehouseId: (id: string) => void;

  // Opérations Produits
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; error?: string };
  updateProduct: (id: string, product: Partial<Product>) => { success: boolean; error?: string };
  deleteProduct: (id: string, force?: boolean) => { success: boolean; error?: string };
  archiveProduct: (id: string) => { success: boolean; error?: string };
  unarchiveProduct: (id: string) => { success: boolean };

  // Opérations Catégories & Entrepôts
  addCategory: (cat: Omit<Category, 'id' | 'createdAt'>) => void;
  updateCategory: (id: string, cat: Partial<Category>) => void;
  addWarehouse: (wh: Omit<Warehouse, 'id' | 'createdAt'>) => void;
  updateWarehouse: (id: string, wh: Partial<Warehouse>) => void;

  // Opérations Partenaires
  addSupplier: (sup: Omit<Supplier, 'id' | 'createdAt'>) => void;
  updateSupplier: (id: string, sup: Partial<Supplier>) => void;
  addCustomer: (cust: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomer: (id: string, cust: Partial<Customer>) => void;

  // Transactions de stock
  executeStockIn: (params: {
    type: MovementType;
    warehouseId: string;
    items: MovementItem[];
    documentRef?: string;
    partnerId?: string;
    partnerName?: string;
    notes?: string;
    userId: string;
    userName: string;
  }) => TransactionResult;

  executeStockOut: (params: {
    type: MovementType;
    warehouseId: string;
    items: MovementItem[];
    documentRef?: string;
    partnerId?: string;
    partnerName?: string;
    notes?: string;
    userId: string;
    userName: string;
  }) => TransactionResult;

  executeTransfer: (params: {
    sourceWarehouseId: string;
    targetWarehouseId: string;
    items: MovementItem[];
    notes?: string;
    userId: string;
    userName: string;
  }) => TransactionResult;

  // Commandes Fournisseurs & Ventes
  createPurchaseOrder: (order: Omit<PurchaseOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => void;
  receivePurchaseOrder: (orderId: string, itemsReceived: { productId: string; quantity: number }[], userId: string, userName: string) => TransactionResult;
  cancelPurchaseOrder: (orderId: string) => void;

  createSalesOrder: (order: Omit<SalesOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => void;
  confirmSalesOrder: (orderId: string) => { success: boolean; error?: string };
  deliverSalesOrder: (orderId: string, userId: string, userName: string) => TransactionResult;
  cancelSalesOrder: (orderId: string) => void;

  // Point de Vente / Caisse
  executePOSSale: (params: {
    warehouseId: string;
    customerId?: string;
    customerName: string;
    customerTaxId?: string;
    customerAddress?: string;
    items: POSSaleItem[];
    paymentMethod: 'especes' | 'carte' | 'cheque' | 'virement';
    amountReceived: number;
    vatRate?: number;
    fiscalStamp?: number;
    notes?: string;
    cashierId: string;
    cashierName: string;
  }) => { success: boolean; ticket?: POSSaleTicket; error?: string };

  // Inventaires
  createInventorySession: (warehouseId: string, productIds?: string[]) => string;
  validateInventorySession: (sessionId: string, countedItems: { productId: string; countedQty: number }[], userId: string, userName: string) => TransactionResult;

  // Département Facturation & Documents Commerciaux
  addCommercialDocument: (doc: Omit<CommercialDocument, 'id' | 'documentNumber' | 'createdAt' | 'updatedAt'>) => { success: boolean; document: CommercialDocument };
  updateCommercialDocument: (id: string, doc: Partial<CommercialDocument>) => void;
  deleteCommercialDocument: (id: string) => void;
  changeCommercialDocumentStatus: (id: string, status: DocumentStatus) => void;
  generateDocumentFromOrder: (order: SalesOrder | PurchaseOrder, targetType: DocumentType) => CommercialDocument;

  // Paramètres & Utilitaires
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  injectDemoData: () => void;
  resetDatabase: () => void;
  markAlertRead: (id: string) => void;
}

const StockContext = createContext<StockContextType>({} as StockContextType);

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const s = localStorage.getItem('sp_settings');
    return s ? JSON.parse(s) : DEFAULT_SETTINGS;
  });

  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => {
    const s = localStorage.getItem('sp_warehouses');
    return s ? JSON.parse(s) : DEMO_WAREHOUSES;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const s = localStorage.getItem('sp_categories');
    return s ? JSON.parse(s) : DEMO_CATEGORIES;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const s = localStorage.getItem('sp_suppliers');
    return s ? JSON.parse(s) : DEMO_SUPPLIERS;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const s = localStorage.getItem('sp_customers');
    return s ? JSON.parse(s) : DEMO_CUSTOMERS;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const s = localStorage.getItem('sp_products');
    return s ? JSON.parse(s) : DEMO_PRODUCTS;
  });

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('ALL');

  // Balances de stock calculées initiales
  const [balances, setBalances] = useState<StockBalance[]>(() => {
    const s = localStorage.getItem('sp_balances');
    if (s) return JSON.parse(s);

    const initial: StockBalance[] = [];
    DEMO_PRODUCTS.forEach(p => {
      // Dépôt Radès : stock confortable
      const radesQty = p.minThreshold * 4;
      initial.push({
        id: `${p.id}_WH-TUNIS`,
        productId: p.id,
        warehouseId: 'WH-TUNIS',
        physicalQuantity: radesQty,
        reservedQuantity: 0,
        availableQuantity: radesQty,
        location: `Allée A - Travée ${p.sku.slice(-2)}`,
        updatedAt: '2026-01-15T08:00:00Z'
      });

      // Dépôt Sfax : stock faible pour simuler des alertes réalistes
      const sfaxQty = Math.floor(p.minThreshold * 0.7);
      initial.push({
        id: `${p.id}_WH-SFAX`,
        productId: p.id,
        warehouseId: 'WH-SFAX',
        physicalQuantity: sfaxQty,
        reservedQuantity: 0,
        availableQuantity: sfaxQty,
        location: `Zone Sud - Rack ${p.sku.slice(-2)}`,
        updatedAt: '2026-01-15T08:00:00Z'
      });
    });
    return initial;
  });

  // Mouvements initiaux réalistes
  const [movements, setMovements] = useState<StockMovement[]>(() => {
    const s = localStorage.getItem('sp_movements');
    if (s) return JSON.parse(s);

    return [
      {
        id: 'MOV-INIT-01',
        movementNumber: 'REC-2026-10001',
        type: 'ENTRY_SUPPLIER',
        date: '2026-01-10T09:30:00Z',
        targetWarehouseId: 'WH-TUNIS',
        documentRef: 'BL-CHAK-8841',
        partnerId: 'SUP-01',
        partnerName: 'Chakira Cable Industrie Tunisie',
        items: [
          {
            productId: 'PROD-01',
            productName: 'Câble Armé U1000 R2V 3x2.5mm² (Touret)',
            sku: 'CAB-U1000-3X2',
            quantity: 500,
            unitCost: 4.850,
            unit: 'mètre'
          },
          {
            productId: 'PROD-02',
            productName: 'Disjoncteur Modulaire Acti9 16A Courbe C',
            sku: 'DISJ-SCH-16A',
            quantity: 80,
            unitCost: 18.200,
            unit: 'pièce'
          }
        ],
        totalValue: 3881.000,
        notes: 'Réception conforme bon de commande BC-2026-012',
        userId: 'USR-MAG',
        userName: 'Lotfi Zaher',
        createdAt: '2026-01-10T09:30:00Z'
      },
      {
        id: 'MOV-INIT-02',
        movementNumber: 'SRT-2026-10002',
        type: 'EXIT_SALE',
        date: '2026-01-12T14:15:00Z',
        sourceWarehouseId: 'WH-TUNIS',
        documentRef: 'BL-EXP-0045',
        partnerId: 'CLI-01',
        partnerName: 'STEG — Direction des Marchés & Travaux',
        items: [
          {
            productId: 'PROD-01',
            productName: 'Câble Armé U1000 R2V 3x2.5mm² (Touret)',
            sku: 'CAB-U1000-3X2',
            quantity: 120,
            unitCost: 4.850,
            unit: 'mètre'
          }
        ],
        totalValue: 582.000,
        notes: 'Livraison chantier Ben Arous poste transformateur',
        userId: 'USR-MAG',
        userName: 'Lotfi Zaher',
        createdAt: '2026-01-12T14:15:00Z'
      }
    ];
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const s = localStorage.getItem('sp_purchase_orders');
    if (s) return JSON.parse(s);

    return [
      {
        id: 'PO-2026-001',
        orderNumber: 'BC-2026-001',
        supplierId: 'SUP-02',
        supplierName: 'Méditerranée Plastiques & Emballages',
        warehouseId: 'WH-TUNIS',
        warehouseName: 'Dépôt Central Radès',
        expectedDate: '2026-11-05',
        items: [
          {
            productId: 'PROD-08',
            productName: 'Carton Double Cannelure 600x400x400mm',
            sku: 'CART-DBL-6040',
            quantityOrdered: 300,
            quantityProcessed: 0,
            unitPrice: 3.200,
            total: 960.000
          },
          {
            productId: 'PROD-09',
            productName: 'Film Étirable Manuel Transparent 23µm Bobine',
            sku: 'FILM-ETIR-23MIC',
            quantityOrdered: 100,
            quantityProcessed: 0,
            unitPrice: 16.500,
            total: 1650.000
          }
        ],
        status: 'confirmed',
        totalAmount: 2610.000,
        notes: 'Réapprovisionnement trimestriel emballage',
        createdAt: '2026-01-14T11:00:00Z',
        updatedAt: '2026-01-14T11:00:00Z'
      }
    ];
  });

  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(() => {
    const s = localStorage.getItem('sp_sales_orders');
    if (s) return JSON.parse(s);

    return [
      {
        id: 'SO-2026-001',
        orderNumber: 'CMD-2026-001',
        customerId: 'CLI-02',
        customerName: 'Société Industrielle et Mécanique du Sud',
        warehouseId: 'WH-SFAX',
        warehouseName: 'Dépôt Régional Sfax Sud',
        deliveryDate: '2026-10-30',
        items: [
          {
            productId: 'PROD-06',
            productName: 'Roulement à Billes SKF 6204-2RSH',
            sku: 'ROUL-SKF-6204',
            quantityOrdered: 10,
            quantityProcessed: 0,
            unitPrice: 22.000,
            total: 220.000
          }
        ],
        status: 'draft',
        totalAmount: 220.000,
        notes: 'Commande urgente pour ligne de production Sfax',
        createdAt: '2026-01-16T15:20:00Z',
        updatedAt: '2026-01-16T15:20:00Z'
      }
    ];
  });

  const [inventorySessions, setInventorySessions] = useState<InventorySession[]>(() => {
    const s = localStorage.getItem('sp_inventories');
    return s ? JSON.parse(s) : [];
  });

  const [transfers, setTransfers] = useState<StockTransfer[]>(() => {
    const s = localStorage.getItem('sp_transfers');
    return s ? JSON.parse(s) : [];
  });

  const [posTickets, setPosTickets] = useState<POSSaleTicket[]>(() => {
    const s = localStorage.getItem('sp_pos_tickets');
    return s ? JSON.parse(s) : [];
  });

  const [commercialDocuments, setCommercialDocuments] = useState<CommercialDocument[]>(() => {
    const s = localStorage.getItem('sp_commercial_documents');
    return s ? JSON.parse(s) : DEMO_COMMERCIAL_DOCUMENTS;
  });

  const [readAlertIds, setReadAlertIds] = useState<string[]>(() => {
    const s = localStorage.getItem('sp_read_alerts');
    return s ? JSON.parse(s) : [];
  });

  // Persistance automatique
  useEffect(() => {
    localStorage.setItem('sp_settings', JSON.stringify(settings));
    localStorage.setItem('sp_warehouses', JSON.stringify(warehouses));
    localStorage.setItem('sp_categories', JSON.stringify(categories));
    localStorage.setItem('sp_suppliers', JSON.stringify(suppliers));
    localStorage.setItem('sp_customers', JSON.stringify(customers));
    localStorage.setItem('sp_products', JSON.stringify(products));
    localStorage.setItem('sp_balances', JSON.stringify(balances));
    localStorage.setItem('sp_movements', JSON.stringify(movements));
    localStorage.setItem('sp_purchase_orders', JSON.stringify(purchaseOrders));
    localStorage.setItem('sp_sales_orders', JSON.stringify(salesOrders));
    localStorage.setItem('sp_inventories', JSON.stringify(inventorySessions));
    localStorage.setItem('sp_transfers', JSON.stringify(transfers));
    localStorage.setItem('sp_pos_tickets', JSON.stringify(posTickets));
    localStorage.setItem('sp_commercial_documents', JSON.stringify(commercialDocuments));
    localStorage.setItem('sp_read_alerts', JSON.stringify(readAlertIds));
  }, [
    settings, warehouses, categories, suppliers, customers,
    products, balances, movements, purchaseOrders, salesOrders,
    inventorySessions, transfers, posTickets, commercialDocuments, readAlertIds
  ]);

  // Recalcul temps réel des alertes de stock
  const alerts: StockAlert[] = [];
  products.filter(p => !p.isArchived).forEach(product => {
    const totalAvail = balances
      .filter(b => b.productId === product.id)
      .reduce((acc, b) => acc + b.availableQuantity, 0);

    const alertIdRupture = `RUPT-${product.id}`;
    const alertIdLow = `LOW-${product.id}`;

    if (totalAvail <= 0) {
      alerts.push({
        id: alertIdRupture,
        title: `Rupture totale : ${product.sku}`,
        message: `${product.name} n'a plus aucune unité disponible en stock.`,
        severity: 'danger',
        productId: product.id,
        date: new Date().toISOString(),
        read: readAlertIds.includes(alertIdRupture)
      });
    } else if (totalAvail <= product.minThreshold) {
      alerts.push({
        id: alertIdLow,
        title: `Stock faible : ${product.sku}`,
        message: `Stock actuel (${totalAvail} ${product.unit}) inférieur ou égal au seuil d'alerte (${product.minThreshold}).`,
        severity: 'low',
        productId: product.id,
        date: new Date().toISOString(),
        read: readAlertIds.includes(alertIdLow)
      });
    }
  });

  // Alertes commandes en retard
  purchaseOrders.filter(po => po.status === 'confirmed').forEach(po => {
    if (po.expectedDate && new Date(po.expectedDate) < new Date()) {
      const alertId = `PO-LATE-${po.id}`;
      alerts.push({
        id: alertId,
        title: `Commande Fournisseur en retard : ${po.orderNumber}`,
        message: `Livraison prévue le ${po.expectedDate} par ${po.supplierName} non encore réceptionnée.`,
        severity: 'danger',
        date: new Date().toISOString(),
        read: readAlertIds.includes(alertId)
      });
    }
  });

  // Opérations Produits
  const addProduct = (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Vérification unicité SKU
    const existing = products.find(p => p.sku.trim().toUpperCase() === data.sku.trim().toUpperCase());
    if (existing) {
      return { success: false, error: `La référence SKU "${data.sku}" existe déjà dans le catalogue.` };
    }

    if (data.purchasePrice < 0 || data.sellingPrice < 0) {
      return { success: false, error: 'Les prix doivent être supérieurs ou égaux à 0.' };
    }

    const newProd: Product = {
      ...data,
      id: `PROD-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Initialiser des balances à 0 pour chaque entrepôt
    const newBalances = [...balances];
    warehouses.forEach(wh => {
      newBalances.push({
        id: `${newProd.id}_${wh.id}`,
        productId: newProd.id,
        warehouseId: wh.id,
        physicalQuantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        updatedAt: new Date().toISOString()
      });
    });

    setProducts(prev => [newProd, ...prev]);
    setBalances(newBalances);
    return { success: true };
  };

  const updateProduct = (id: string, data: Partial<Product>) => {
    if (data.sku) {
      const conflict = products.find(p => p.id !== id && p.sku.trim().toUpperCase() === data.sku!.trim().toUpperCase());
      if (conflict) {
        return { success: false, error: `La référence SKU "${data.sku}" est déjà utilisée par un autre article.` };
      }
    }

    setProducts(prev => prev.map(p => p.id === id ? {
      ...p,
      ...data,
      updatedAt: new Date().toISOString()
    } : p));

    return { success: true };
  };

  const deleteProduct = (id: string, force: boolean = false) => {
    const prod = products.find(p => p.id === id);
    if (!prod) {
      return { success: false, error: 'Article introuvable dans le catalogue.' };
    }

    // Vérifier si le produit a du stock physique résiduel
    const totalPhysical = balances.filter(b => b.productId === id).reduce((acc, b) => acc + b.physicalQuantity, 0);
    if (totalPhysical > 0 && !force) {
      return { 
        success: false, 
        error: `Impossible de supprimer l'article ${prod.sku} : il reste ${totalPhysical} ${prod.unit} en stock physique. Veuillez solder le stock ou confirmer la suppression forcée.` 
      };
    }

    // Suppression du produit et de ses soldes de stock associés
    setProducts(prev => prev.filter(p => p.id !== id));
    setBalances(prev => prev.filter(b => b.productId !== id));
    setReadAlertIds(prev => prev.filter(aId => !aId.includes(id)));
    return { success: true };
  };

  const archiveProduct = (id: string) => {
    // Vérifier si le produit a du stock physique résiduel
    const totalPhysical = balances.filter(b => b.productId === id).reduce((acc, b) => acc + b.physicalQuantity, 0);
    if (totalPhysical > 0) {
      return { success: false, error: `Impossible d'archiver un produit possédant encore ${totalPhysical} unités en stock physique. Veuillez solder le stock au préalable.` };
    }

    setProducts(prev => prev.map(p => p.id === id ? { ...p, isArchived: true, updatedAt: new Date().toISOString() } : p));
    return { success: true };
  };

  const unarchiveProduct = (id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, isArchived: false, updatedAt: new Date().toISOString() } : p));
    return { success: true };
  };

  // Catégories
  const addCategory = (cat: Omit<Category, 'id' | 'createdAt'>) => {
    const newCat: Category = {
      ...cat,
      id: `CAT-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString()
    };
    setCategories(prev => [...prev, newCat]);
  };

  const updateCategory = (id: string, cat: Partial<Category>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...cat } : c));
  };

  // Entrepôts
  const addWarehouse = (wh: Omit<Warehouse, 'id' | 'createdAt'>) => {
    const newWh: Warehouse = {
      ...wh,
      id: `WH-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString()
    };
    setWarehouses(prev => [...prev, newWh]);

    // Initialiser les balances pour tous les produits existants dans ce nouvel entrepôt
    const newBalances = [...balances];
    products.forEach(p => {
      newBalances.push({
        id: `${p.id}_${newWh.id}`,
        productId: p.id,
        warehouseId: newWh.id,
        physicalQuantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        updatedAt: new Date().toISOString()
      });
    });
    setBalances(newBalances);
  };

  const updateWarehouse = (id: string, wh: Partial<Warehouse>) => {
    setWarehouses(prev => prev.map(w => w.id === id ? { ...w, ...wh } : w));
  };

  // Fournisseurs
  const addSupplier = (sup: Omit<Supplier, 'id' | 'createdAt'>) => {
    setSuppliers(prev => [...prev, {
      ...sup,
      id: `SUP-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString()
    }]);
  };

  const updateSupplier = (id: string, sup: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...sup } : s));
  };

  // Clients
  const addCustomer = (cust: Omit<Customer, 'id' | 'createdAt'>) => {
    setCustomers(prev => [...prev, {
      ...cust,
      id: `CLI-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString()
    }]);
  };

  const updateCustomer = (id: string, cust: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...cust } : c));
  };

  // Stock In
  const executeStockIn = (params: any): TransactionResult => {
    const res = StockEngine.processStockEntry(balances, products, movements, params);
    if (res.result.success) {
      setBalances(res.updatedBalances);
      setProducts(res.updatedProducts);
      setMovements(res.updatedMovements);
    }
    return res.result;
  };

  // Stock Out
  const executeStockOut = (params: any): TransactionResult => {
    const res = StockEngine.processStockExit(balances, products, movements, params);
    if (res.result.success) {
      setBalances(res.updatedBalances);
      setMovements(res.updatedMovements);
    }
    return res.result;
  };

  // Transferts
  const executeTransfer = (params: any): TransactionResult => {
    const res = StockEngine.processDirectTransfer(balances, movements, params);
    if (res.result.success) {
      setBalances(res.updatedBalances);
      setMovements(res.updatedMovements);

      // Ajouter également à l'historique des transferts
      const transferRecord: StockTransfer = {
        id: `TRF-${Date.now()}`,
        transferNumber: res.result.movementNumber!,
        sourceWarehouseId: params.sourceWarehouseId,
        targetWarehouseId: params.targetWarehouseId,
        items: params.items,
        status: 'completed',
        userId: params.userId,
        userName: params.userName,
        notes: params.notes,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      };
      setTransfers(prev => [transferRecord, ...prev]);
    }
    return res.result;
  };

  // Commandes Fournisseurs
  const createPurchaseOrder = (order: Omit<PurchaseOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => {
    const newPO: PurchaseOrder = {
      ...order,
      id: `PO-${Date.now()}`,
      orderNumber: generateSequence('BC'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setPurchaseOrders(prev => [newPO, ...prev]);
  };

  const receivePurchaseOrder = (
    orderId: string, 
    itemsReceived: { productId: string; quantity: number }[],
    userId: string,
    userName: string
  ): TransactionResult => {
    const po = purchaseOrders.find(p => p.id === orderId);
    if (!po) return { success: false, error: 'Bon de commande introuvable.' };

    const movementItems: MovementItem[] = [];
    const updatedItems = po.items.map(it => {
      const received = itemsReceived.find(r => r.productId === it.productId);
      const qtyToAdd = received ? Number(received.quantity) : 0;
      if (qtyToAdd > 0) {
        movementItems.push({
          productId: it.productId,
          productName: it.productName,
          sku: it.sku,
          quantity: qtyToAdd,
          unitCost: it.unitPrice,
          unit: 'pièce'
        });
      }
      return {
        ...it,
        quantityProcessed: it.quantityProcessed + qtyToAdd
      };
    });

    if (movementItems.length === 0) {
      return { success: false, error: 'Aucune quantité saisie pour la réception.' };
    }

    // Exécuter l'entrée de stock
    const inRes = executeStockIn({
      type: 'ENTRY_SUPPLIER',
      warehouseId: po.warehouseId,
      items: movementItems,
      documentRef: po.orderNumber,
      partnerId: po.supplierId,
      partnerName: po.supplierName,
      notes: `Réception bon de commande ${po.orderNumber}`,
      userId,
      userName
    });

    if (inRes.success) {
      const allReceived = updatedItems.every(i => i.quantityProcessed >= i.quantityOrdered);
      const newStatus = allReceived ? 'completed' : 'partially_received';

      setPurchaseOrders(prev => prev.map(p => p.id === orderId ? {
        ...p,
        items: updatedItems,
        status: newStatus,
        updatedAt: new Date().toISOString()
      } : p));
    }

    return inRes;
  };

  const cancelPurchaseOrder = (orderId: string) => {
    setPurchaseOrders(prev => prev.map(p => p.id === orderId ? { ...p, status: 'cancelled', updatedAt: new Date().toISOString() } : p));
  };

  // Commandes Ventes
  const createSalesOrder = (order: Omit<SalesOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => {
    const newSO: SalesOrder = {
      ...order,
      id: `SO-${Date.now()}`,
      orderNumber: generateSequence('CMD'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSalesOrders(prev => [newSO, ...prev]);
  };

  const confirmSalesOrder = (orderId: string): { success: boolean; error?: string } => {
    const so = salesOrders.find(s => s.id === orderId);
    if (!so) return { success: false, error: 'Commande introuvable.' };

    const reservationItems = so.items.map(it => ({
      productId: it.productId,
      sku: it.sku,
      quantity: it.quantityOrdered
    }));

    const res = StockEngine.reserveStock(balances, so.warehouseId, reservationItems);
    if (!res.success) {
      return { success: false, error: res.error };
    }

    setBalances(res.updatedBalances);
    setSalesOrders(prev => prev.map(s => s.id === orderId ? {
      ...s,
      status: 'confirmed',
      updatedAt: new Date().toISOString()
    } : s));

    return { success: true };
  };

  const deliverSalesOrder = (orderId: string, userId: string, userName: string): TransactionResult => {
    const so = salesOrders.find(s => s.id === orderId);
    if (!so) return { success: false, error: 'Commande introuvable.' };

    const movementItems: MovementItem[] = so.items.map(it => {
      const prod = products.find(p => p.id === it.productId);
      return {
        productId: it.productId,
        productName: it.productName,
        sku: it.sku,
        quantity: it.quantityOrdered,
        unitCost: prod?.purchasePrice || it.unitPrice,
        unit: prod?.unit || 'pièce'
      };
    });

    // 1. Libérer la réservation
    const balancesWithoutRes = StockEngine.releaseReservation(
      balances, 
      so.warehouseId, 
      so.items.map(i => ({ productId: i.productId, quantity: i.quantityOrdered }))
    );

    // 2. Déduire le stock physique via sortie
    const exitRes = StockEngine.processStockExit(balancesWithoutRes, products, movements, {
      type: 'EXIT_SALE',
      warehouseId: so.warehouseId,
      items: movementItems,
      documentRef: so.orderNumber,
      partnerId: so.customerId,
      partnerName: so.customerName,
      notes: `Livraison commande client ${so.orderNumber}`,
      userId,
      userName
    });

    if (exitRes.result.success) {
      setBalances(exitRes.updatedBalances);
      setMovements(exitRes.updatedMovements);
      setSalesOrders(prev => prev.map(s => s.id === orderId ? {
        ...s,
        status: 'delivered',
        items: s.items.map(i => ({ ...i, quantityProcessed: i.quantityOrdered })),
        updatedAt: new Date().toISOString()
      } : s));
    }

    return exitRes.result;
  };

  const cancelSalesOrder = (orderId: string) => {
    const so = salesOrders.find(s => s.id === orderId);
    if (!so) return;

    if (so.status === 'confirmed') {
      // Libérer les réservations
      const freedBalances = StockEngine.releaseReservation(
        balances, 
        so.warehouseId, 
        so.items.map(i => ({ productId: i.productId, quantity: i.quantityOrdered }))
      );
      setBalances(freedBalances);
    }

    setSalesOrders(prev => prev.map(s => s.id === orderId ? { ...s, status: 'cancelled', updatedAt: new Date().toISOString() } : s));
  };

  // Point de Vente / Caisse Enregistreuse
  const executePOSSale = (params: {
    warehouseId: string;
    customerId?: string;
    customerName: string;
    customerTaxId?: string;
    customerAddress?: string;
    items: POSSaleItem[];
    paymentMethod: 'especes' | 'carte' | 'cheque' | 'virement';
    amountReceived: number;
    vatRate?: number;
    fiscalStamp?: number;
    notes?: string;
    cashierId: string;
    cashierName: string;
  }): { success: boolean; ticket?: POSSaleTicket; error?: string } => {
    if (!params.items || params.items.length === 0) {
      return { success: false, error: 'Le panier de caisse est vide.' };
    }

    const wh = warehouses.find(w => w.id === params.warehouseId);
    if (!wh) {
      return { success: false, error: 'Entrepôt source introuvable.' };
    }

    // 1. Vérification de disponibilité stricte dans l'entrepôt
    for (const item of params.items) {
      const bal = balances.find(b => b.productId === item.productId && b.warehouseId === params.warehouseId);
      const available = bal ? bal.availableQuantity : 0;
      if (item.quantity > available) {
        return {
          success: false,
          error: `Stock insuffisant pour l'article ${item.sku}. Demandé : ${item.quantity}, Disponible dans ce dépôt : ${available}.`
        };
      }
    }

    const ticketNumber = generateSequence('TIK');
    const invoiceNumber = generateSequence('FACT');

    // 2. Transformer en MovementItems pour déstockage atomique
    const movementItems: MovementItem[] = params.items.map(it => {
      const prod = products.find(p => p.id === it.productId);
      return {
        productId: it.productId,
        productName: it.productName,
        sku: it.sku,
        quantity: it.quantity,
        unitCost: prod?.purchasePrice || it.unitPrice,
        unit: it.unit
      };
    });

    // 3. Déstockage physique via StockEngine
    const exitRes = StockEngine.processStockExit(balances, products, movements, {
      type: 'EXIT_SALE',
      warehouseId: params.warehouseId,
      items: movementItems,
      documentRef: ticketNumber,
      partnerId: params.customerId,
      partnerName: params.customerName,
      notes: `Vente Caisse ${ticketNumber} (${params.paymentMethod.toUpperCase()})`,
      userId: params.cashierId,
      userName: params.cashierName
    });

    if (!exitRes.result.success) {
      return { success: false, error: exitRes.result.error };
    }

    // 4. Calculs financiers
    const subtotalHT = params.items.reduce((sum, it) => sum + it.total, 0);
    const vatRate = params.vatRate !== undefined ? params.vatRate : (settings.defaultVatRate || 19);
    const vatAmount = subtotalHT * (vatRate / 100);
    const fiscalStamp = params.fiscalStamp !== undefined ? params.fiscalStamp : (settings.fiscalStamp || 1.000);
    const totalTTC = subtotalHT + vatAmount + fiscalStamp;
    const changeReturned = Math.max(0, params.amountReceived - totalTTC);

    // 5. Création et archivage du ticket de caisse
    const newTicket: POSSaleTicket = {
      id: `TIK-${Date.now()}`,
      ticketNumber,
      invoiceNumber,
      date: new Date().toISOString(),
      customerId: params.customerId,
      customerName: params.customerName,
      customerTaxId: params.customerTaxId,
      customerAddress: params.customerAddress,
      warehouseId: params.warehouseId,
      warehouseName: wh.name,
      items: params.items,
      subtotalHT,
      vatRate,
      vatAmount,
      fiscalStamp,
      totalTTC,
      paymentMethod: params.paymentMethod,
      amountReceived: params.amountReceived,
      changeReturned,
      cashierId: params.cashierId,
      cashierName: params.cashierName,
      notes: params.notes,
      createdAt: new Date().toISOString()
    };

    setBalances(exitRes.updatedBalances);
    setMovements(exitRes.updatedMovements);
    setPosTickets(prev => [newTicket, ...prev]);

    return { success: true, ticket: newTicket };
  };

  // Inventaires
  const createInventorySession = (warehouseId: string, productIds?: string[]): string => {
    const targetProducts = productIds && productIds.length > 0
      ? products.filter(p => productIds.includes(p.id) && !p.isArchived)
      : products.filter(p => !p.isArchived);

    const ref = generateSequence('INV');
    const items = targetProducts.map(p => {
      const b = balances.find(bal => bal.productId === p.id && bal.warehouseId === warehouseId);
      const theo = b ? b.physicalQuantity : 0;
      return {
        productId: p.id,
        sku: p.sku,
        name: p.name,
        theoreticalQty: theo,
        countedQty: theo, // Valeur par défaut
        variance: 0,
        unitCost: p.purchasePrice
      };
    });

    const session: InventorySession = {
      id: `INV-${Date.now()}`,
      reference: ref,
      warehouseId,
      status: 'draft',
      items,
      createdAt: new Date().toISOString()
    };

    setInventorySessions(prev => [session, ...prev]);
    return session.id;
  };

  const validateInventorySession = (
    sessionId: string,
    countedItems: { productId: string; countedQty: number }[],
    userId: string,
    userName: string
  ): TransactionResult => {
    const session = inventorySessions.find(s => s.id === sessionId);
    if (!session) return { success: false, error: 'Session introuvable.' };

    const itemsToProcess = session.items.map(it => {
      const counted = countedItems.find(c => c.productId === it.productId);
      const countedQty = counted !== undefined ? Number(counted.countedQty) : it.countedQty;
      const prod = products.find(p => p.id === it.productId);
      return {
        productId: it.productId,
        sku: it.sku,
        name: it.name,
        unitCost: it.unitCost,
        theoreticalQty: it.theoreticalQty,
        countedQty,
        unit: prod?.unit || 'pièce'
      };
    });

    const res = StockEngine.processInventoryValidation(balances, movements, {
      warehouseId: session.warehouseId,
      reference: session.reference,
      items: itemsToProcess,
      userId,
      userName
    });

    if (res.result.success) {
      setBalances(res.updatedBalances);
      setMovements(res.updatedMovements);
      setInventorySessions(prev => prev.map(s => s.id === sessionId ? {
        ...s,
        status: 'validated',
        validatedAt: new Date().toISOString(),
        validatedBy: userName,
        items: itemsToProcess.map(it => ({
          ...it,
          variance: it.countedQty - it.theoreticalQty
        }))
      } : s));
    }

    return res.result;
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const injectDemoData = () => {
    localStorage.clear();
    setProducts(DEMO_PRODUCTS);
    setCategories(DEMO_CATEGORIES);
    setWarehouses(DEMO_WAREHOUSES);
    setSuppliers(DEMO_SUPPLIERS);
    setCustomers(DEMO_CUSTOMERS);
    setSettings(DEFAULT_SETTINGS);
    window.location.reload();
  };

  const resetDatabase = () => {
    localStorage.clear();
    setProducts([]);
    setBalances([]);
    setMovements([]);
    setPurchaseOrders([]);
    setSalesOrders([]);
    setInventorySessions([]);
    setTransfers([]);
    window.location.reload();
  };

  const markAlertRead = (id: string) => {
    setReadAlertIds(prev => prev.includes(id) ? prev : [...prev, id]);
  };

  return (
    <StockContext.Provider value={{
      products,
      categories,
      warehouses,
      balances,
      movements,
      suppliers,
      customers,
      purchaseOrders,
      salesOrders,
      inventorySessions,
      transfers,
      posTickets,
      settings,
      alerts,
      selectedWarehouseId,
      setSelectedWarehouseId,
      addProduct,
      updateProduct,
      archiveProduct,
      unarchiveProduct,
      addCategory,
      updateCategory,
      addWarehouse,
      updateWarehouse,
      addSupplier,
      updateSupplier,
      addCustomer,
      updateCustomer,
      executeStockIn,
      executeStockOut,
      executeTransfer,
      executePOSSale,
      createPurchaseOrder,
      receivePurchaseOrder,
      cancelPurchaseOrder,
      createSalesOrder,
      confirmSalesOrder,
      deliverSalesOrder,
      cancelSalesOrder,
      createInventorySession,
      validateInventorySession,
      updateSettings,
      injectDemoData,
      resetDatabase,
      markAlertRead
    }}>
      {children}
    </StockContext.Provider>
  );
};

export const useStock = () => useContext(StockContext);
