"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { Product, ProductFormData } from "@/types/product";

interface ProductContextType {
  products: Product[];
  addProduct: (productData: ProductFormData) => void;
  getProductByBarcode: (barcode: string) => Product | undefined;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function useProducts() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
}

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);

  const addProduct = useCallback((productData: ProductFormData) => {
    const newProduct: Product = {
      id: Date.now().toString(),
      ...productData,
      createdAt: new Date(),
    };
    setProducts((prev) => [...prev, newProduct]);
  }, []);

  const getProductByBarcode = useCallback(
    (barcode: string) => {
      return products.find((product) => product.barcode === barcode);
    },
    [products]
  );

  return (
    <ProductContext.Provider
      value={{ products, addProduct, getProductByBarcode }}
    >
      {children}
    </ProductContext.Provider>
  );
}
