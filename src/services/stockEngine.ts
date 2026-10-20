import { MovementItem, MovementType, StockBalance, Product, StockMovement } from '../types';
import { generateSequence } from '../utils/formatters';

export interface TransactionResult {
  success: boolean;
  movementId?: string;
  movementNumber?: string;
  error?: string;
}

export class StockEngine {
  /**
   * Enregistre une entrée de stock avec recalcul du Coût Moyen Pondéré (CMP)
   */
  static processStockEntry(
    balances: StockBalance[],
    products: Product[],
    movements: StockMovement[],
    params: {
      type: MovementType;
      warehouseId: string;
      items: MovementItem[];
      documentRef?: string;
      partnerId?: string;
      partnerName?: string;
      notes?: string;
      userId: string;
      userName: string;
    }
  ): {
    updatedBalances: StockBalance[];
    updatedProducts: Product[];
    updatedMovements: StockMovement[];
    result: TransactionResult;
  } {
    const updatedBalances = [...balances];
    const updatedProducts = [...products];
    const movementNumber = generateSequence('REC');
    let totalValue = 0;

    for (const item of params.items) {
      if (item.quantity <= 0) {
        return {
          updatedBalances: balances,
          updatedProducts: products,
          updatedMovements: movements,
          result: { success: false, error: `Quantité invalide (${item.quantity}) pour le produit ${item.sku}.` }
        };
      }

      const prodIdx = updatedProducts.findIndex(p => p.id === item.productId);
      if (prodIdx === -1) {
        return {
          updatedBalances: balances,
          updatedProducts: products,
          updatedMovements: movements,
          result: { success: false, error: `Produit introuvable : ${item.sku}.` }
        };
      }

      if (updatedProducts[prodIdx].isArchived) {
        return {
          updatedBalances: balances,
          updatedProducts: products,
          updatedMovements: movements,
          result: { success: false, error: `Le produit ${item.sku} est archivé et ne peut faire l'objet de mouvements.` }
        };
      }

      // Mise à jour de la balance
      const balanceId = `${item.productId}_${params.warehouseId}`;
      const balanceIdx = updatedBalances.findIndex(b => b.id === balanceId);
      
      const currentPhysical = balanceIdx >= 0 ? updatedBalances[balanceIdx].physicalQuantity : 0;
      const currentReserved = balanceIdx >= 0 ? updatedBalances[balanceIdx].reservedQuantity : 0;

      const newPhysical = currentPhysical + item.quantity;
      const newAvailable = newPhysical - currentReserved;

      const updatedBalance: StockBalance = {
        id: balanceId,
        productId: item.productId,
        warehouseId: params.warehouseId,
        physicalQuantity: newPhysical,
        reservedQuantity: currentReserved,
        availableQuantity: newAvailable,
        updatedAt: new Date().toISOString()
      };

      if (balanceIdx >= 0) {
        updatedBalances[balanceIdx] = updatedBalance;
      } else {
        updatedBalances.push(updatedBalance);
      }

      // Calcul du CMP (Coût Moyen Pondéré)
      const currentCmp = updatedProducts[prodIdx].purchasePrice || 0;
      const newCmp = (currentPhysical + item.quantity > 0)
        ? ((currentPhysical * currentCmp) + (item.quantity * item.unitCost)) / (currentPhysical + item.quantity)
        : item.unitCost;

      updatedProducts[prodIdx] = {
        ...updatedProducts[prodIdx],
        purchasePrice: Number(newCmp.toFixed(3)),
        updatedAt: new Date().toISOString()
      };

      totalValue += (item.quantity * item.unitCost);
    }

    // Création du mouvement
    const newMovement: StockMovement = {
      id: `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      movementNumber,
      type: params.type,
      date: new Date().toISOString(),
      targetWarehouseId: params.warehouseId,
      documentRef: params.documentRef || '',
      partnerId: params.partnerId || '',
      partnerName: params.partnerName || '',
      items: params.items,
      totalValue: Number(totalValue.toFixed(3)),
      notes: params.notes || '',
      userId: params.userId,
      userName: params.userName,
      createdAt: new Date().toISOString()
    };

    return {
      updatedBalances,
      updatedProducts,
      updatedMovements: [newMovement, ...movements],
      result: { success: true, movementId: newMovement.id, movementNumber }
    };
  }

  /**
   * Enregistre une sortie de stock avec barrière stricte contre le stock négatif
   */
  static processStockExit(
    balances: StockBalance[],
    products: Product[],
    movements: StockMovement[],
    params: {
      type: MovementType;
      warehouseId: string;
      items: MovementItem[];
      documentRef?: string;
      partnerId?: string;
      partnerName?: string;
      notes?: string;
      userId: string;
      userName: string;
    }
  ): {
    updatedBalances: StockBalance[];
    updatedMovements: StockMovement[];
    result: TransactionResult;
  } {
    const updatedBalances = [...balances];
    const movementNumber = generateSequence('SRT');
    let totalValue = 0;

    for (const item of params.items) {
      if (item.quantity <= 0) {
        return {
          updatedBalances: balances,
          updatedMovements: movements,
          result: { success: false, error: `La quantité à sortir pour ${item.sku} doit être positive.` }
        };
      }

      const balanceId = `${item.productId}_${params.warehouseId}`;
      const balanceIdx = updatedBalances.findIndex(b => b.id === balanceId);

      if (balanceIdx === -1) {
        return {
          updatedBalances: balances,
          updatedMovements: movements,
          result: { success: false, error: `Aucun stock existant pour le produit ${item.sku} dans cet entrepôt.` }
        };
      }

      const currentBalance = updatedBalances[balanceIdx];
      
      // RÈGLE MÉTIER CRITIQUE : Jamais de stock disponible négatif
      if (item.quantity > currentBalance.availableQuantity) {
        return {
          updatedBalances: balances,
          updatedMovements: movements,
          result: {
            success: false,
            error: `Sortie refusée pour ${item.sku}. Quantité demandée: ${item.quantity}, Stock disponible: ${currentBalance.availableQuantity} (Stock physique: ${currentBalance.physicalQuantity}, Réservé: ${currentBalance.reservedQuantity}).`
          }
        };
      }

      const newPhysical = currentBalance.physicalQuantity - item.quantity;
      const newAvailable = newPhysical - currentBalance.reservedQuantity;

      updatedBalances[balanceIdx] = {
        ...currentBalance,
        physicalQuantity: newPhysical,
        availableQuantity: newAvailable,
        updatedAt: new Date().toISOString()
      };

      totalValue += (item.quantity * item.unitCost);
    }

    const newMovement: StockMovement = {
      id: `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      movementNumber,
      type: params.type,
      date: new Date().toISOString(),
      sourceWarehouseId: params.warehouseId,
      documentRef: params.documentRef || '',
      partnerId: params.partnerId || '',
      partnerName: params.partnerName || '',
      items: params.items,
      totalValue: Number(totalValue.toFixed(3)),
      notes: params.notes || '',
      userId: params.userId,
      userName: params.userName,
      createdAt: new Date().toISOString()
    };

    return {
      updatedBalances,
      updatedMovements: [newMovement, ...movements],
      result: { success: true, movementId: newMovement.id, movementNumber }
    };
  }

  /**
   * Transfert direct entre entrepôts
   */
  static processDirectTransfer(
    balances: StockBalance[],
    movements: StockMovement[],
    params: {
      sourceWarehouseId: string;
      targetWarehouseId: string;
      items: MovementItem[];
      notes?: string;
      userId: string;
      userName: string;
    }
  ): {
    updatedBalances: StockBalance[];
    updatedMovements: StockMovement[];
    result: TransactionResult;
  } {
    if (params.sourceWarehouseId === params.targetWarehouseId) {
      return {
        updatedBalances: balances,
        updatedMovements: movements,
        result: { success: false, error: 'Les entrepôts source et destination doivent être strictement différents.' }
      };
    }

    const updatedBalances = [...balances];
    const transferNumber = generateSequence('TRF');

    // 1. Vérifier la disponibilité de tous les articles à la source
    for (const item of params.items) {
      const srcBalanceId = `${item.productId}_${params.sourceWarehouseId}`;
      const srcBalance = updatedBalances.find(b => b.id === srcBalanceId);
      const available = srcBalance ? srcBalance.availableQuantity : 0;

      if (item.quantity > available) {
        return {
          updatedBalances: balances,
          updatedMovements: movements,
          result: {
            success: false,
            error: `Transfert impossible pour ${item.sku}. Quantité demandée: ${item.quantity}, Disponible à la source: ${available}.`
          }
        };
      }
    }

    // 2. Déduire de la source et ajouter à la destination
    let totalValue = 0;
    for (const item of params.items) {
      const srcBalanceId = `${item.productId}_${params.sourceWarehouseId}`;
      const tgtBalanceId = `${item.productId}_${params.targetWarehouseId}`;

      const srcIdx = updatedBalances.findIndex(b => b.id === srcBalanceId);
      const tgtIdx = updatedBalances.findIndex(b => b.id === tgtBalanceId);

      // Déduire source
      const srcBal = updatedBalances[srcIdx];
      const newSrcPhysical = srcBal.physicalQuantity - item.quantity;
      updatedBalances[srcIdx] = {
        ...srcBal,
        physicalQuantity: newSrcPhysical,
        availableQuantity: newSrcPhysical - srcBal.reservedQuantity,
        updatedAt: new Date().toISOString()
      };

      // Ajouter destination
      if (tgtIdx >= 0) {
        const tgtBal = updatedBalances[tgtIdx];
        const newTgtPhysical = tgtBal.physicalQuantity + item.quantity;
        updatedBalances[tgtIdx] = {
          ...tgtBal,
          physicalQuantity: newTgtPhysical,
          availableQuantity: newTgtPhysical - tgtBal.reservedQuantity,
          updatedAt: new Date().toISOString()
        };
      } else {
        updatedBalances.push({
          id: tgtBalanceId,
          productId: item.productId,
          warehouseId: params.targetWarehouseId,
          physicalQuantity: item.quantity,
          reservedQuantity: 0,
          availableQuantity: item.quantity,
          updatedAt: new Date().toISOString()
        });
      }

      totalValue += (item.quantity * item.unitCost);
    }

    // 3. Créer les mouvements miroirs
    const movOut: StockMovement = {
      id: `MOV-OUT-${Date.now()}`,
      movementNumber: `${transferNumber}-OUT`,
      type: 'TRANSFER_OUT',
      date: new Date().toISOString(),
      sourceWarehouseId: params.sourceWarehouseId,
      targetWarehouseId: params.targetWarehouseId,
      documentRef: transferNumber,
      items: params.items,
      totalValue: Number(totalValue.toFixed(3)),
      notes: `Transfert vers entrepôt destination. ${params.notes || ''}`.trim(),
      userId: params.userId,
      userName: params.userName,
      createdAt: new Date().toISOString()
    };

    const movIn: StockMovement = {
      id: `MOV-IN-${Date.now()}`,
      movementNumber: `${transferNumber}-IN`,
      type: 'TRANSFER_IN',
      date: new Date().toISOString(),
      sourceWarehouseId: params.sourceWarehouseId,
      targetWarehouseId: params.targetWarehouseId,
      documentRef: transferNumber,
      items: params.items,
      totalValue: Number(totalValue.toFixed(3)),
      notes: `Réception transfert depuis entrepôt source. ${params.notes || ''}`.trim(),
      userId: params.userId,
      userName: params.userName,
      createdAt: new Date().toISOString()
    };

    return {
      updatedBalances,
      updatedMovements: [movOut, movIn, ...movements],
      result: { success: true, movementNumber: transferNumber }
    };
  }

  /**
   * Validation d'inventaire physique et génération des écritures d'ajustement
   */
  static processInventoryValidation(
    balances: StockBalance[],
    movements: StockMovement[],
    params: {
      warehouseId: string;
      reference: string;
      items: {
        productId: string;
        sku: string;
        name: string;
        unitCost: number;
        theoreticalQty: number;
        countedQty: number;
        unit: any;
      }[];
      userId: string;
      userName: string;
    }
  ): {
    updatedBalances: StockBalance[];
    updatedMovements: StockMovement[];
    result: TransactionResult;
  } {
    const updatedBalances = [...balances];
    const newMovements: StockMovement[] = [];
    let adjustmentsCount = 0;

    for (const item of params.items) {
      const variance = item.countedQty - item.theoreticalQty;
      if (variance === 0) continue; // Pas d'écart

      adjustmentsCount++;
      const balanceId = `${item.productId}_${params.warehouseId}`;
      const balanceIdx = updatedBalances.findIndex(b => b.id === balanceId);

      const reserved = balanceIdx >= 0 ? updatedBalances[balanceIdx].reservedQuantity : 0;
      const newPhysical = item.countedQty;
      const newAvailable = newPhysical - reserved;

      if (newAvailable < 0) {
        return {
          updatedBalances: balances,
          updatedMovements: movements,
          result: {
            success: false,
            error: `L'ajustement pour ${item.sku} rendrait le disponible négatif compte tenu des ${reserved} réservations en cours.`
          }
        };
      }

      if (balanceIdx >= 0) {
        updatedBalances[balanceIdx] = {
          ...updatedBalances[balanceIdx],
          physicalQuantity: newPhysical,
          availableQuantity: newAvailable,
          updatedAt: new Date().toISOString()
        };
      } else {
        updatedBalances.push({
          id: balanceId,
          productId: item.productId,
          warehouseId: params.warehouseId,
          physicalQuantity: newPhysical,
          reservedQuantity: 0,
          availableQuantity: newAvailable,
          updatedAt: new Date().toISOString()
        });
      }

      // Mouvement d'ajustement traçable
      const isPositive = variance > 0;
      const mov: StockMovement = {
        id: `MOV-ADJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        movementNumber: generateSequence('AJUST'),
        type: isPositive ? 'ENTRY_ADJUSTMENT' : 'EXIT_LOSS',
        date: new Date().toISOString(),
        sourceWarehouseId: !isPositive ? params.warehouseId : undefined,
        targetWarehouseId: isPositive ? params.warehouseId : undefined,
        documentRef: params.reference,
        items: [{
          productId: item.productId,
          productName: item.name,
          sku: item.sku,
          quantity: Math.abs(variance),
          unitCost: item.unitCost,
          unit: item.unit || 'pièce'
        }],
        totalValue: Number((Math.abs(variance) * item.unitCost).toFixed(3)),
        notes: `Régularisation inventaire ${params.reference} (Écart: ${variance > 0 ? '+' : ''}${variance})`,
        userId: params.userId,
        userName: params.userName,
        createdAt: new Date().toISOString()
      };

      newMovements.push(mov);
    }

    return {
      updatedBalances,
      updatedMovements: [...newMovements, ...movements],
      result: { success: true, movementNumber: params.reference }
    };
  }

  /**
   * Réservation de stock pour une commande client confirmée
   */
  static reserveStock(
    balances: StockBalance[],
    warehouseId: string,
    items: { productId: string; sku: string; quantity: number }[]
  ): { updatedBalances: StockBalance[]; success: boolean; error?: string } {
    const updated = [...balances];

    // Vérifier la disponibilité
    for (const item of items) {
      const balanceId = `${item.productId}_${warehouseId}`;
      const bal = updated.find(b => b.id === balanceId);
      const avail = bal ? bal.availableQuantity : 0;
      if (item.quantity > avail) {
        return {
          updatedBalances: balances,
          success: false,
          error: `Stock disponible insuffisant pour réserver ${item.sku}. Requis: ${item.quantity}, Disponible: ${avail}.`
        };
      }
    }

    // Effectuer la réservation
    for (const item of items) {
      const balanceId = `${item.productId}_${warehouseId}`;
      const idx = updated.findIndex(b => b.id === balanceId);
      const bal = updated[idx];
      const newReserved = bal.reservedQuantity + item.quantity;
      updated[idx] = {
        ...bal,
        reservedQuantity: newReserved,
        availableQuantity: bal.physicalQuantity - newReserved,
        updatedAt: new Date().toISOString()
      };
    }

    return { updatedBalances: updated, success: true };
  }

  /**
   * Libération des réservations d'une commande client annulée
   */
  static releaseReservation(
    balances: StockBalance[],
    warehouseId: string,
    items: { productId: string; quantity: number }[]
  ): StockBalance[] {
    const updated = [...balances];
    for (const item of items) {
      const balanceId = `${item.productId}_${warehouseId}`;
      const idx = updated.findIndex(b => b.id === balanceId);
      if (idx >= 0) {
        const bal = updated[idx];
        const newReserved = Math.max(0, bal.reservedQuantity - item.quantity);
        updated[idx] = {
          ...bal,
          reservedQuantity: newReserved,
          availableQuantity: bal.physicalQuantity - newReserved,
          updatedAt: new Date().toISOString()
        };
      }
    }
    return updated;
  }
}
