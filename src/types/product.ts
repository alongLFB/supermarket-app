export interface Product {
  id: string;
  barcode: string;
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  createdAt: Date;
}

export interface ProductFormData {
  barcode: string;
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
}
