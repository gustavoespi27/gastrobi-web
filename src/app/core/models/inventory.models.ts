export type StockUrgency = 'critical' | 'warning' | 'low';

export interface StockAlert {
  ingredientId: number;
  name: string;
  unit: string;
  stock: number;
  parLevel: number;
  leadTimeDays: number;
  urgency: StockUrgency;
}

export interface CreatePurchaseOrderRequest {
  branchId: string;
  ingredientId: number;
  quantity: number;
}

export interface PurchaseOrder {
  id: number;
  code: string;
  status: 'draft' | 'sent' | 'received' | 'cancelled';
  createdAt: string;
}
