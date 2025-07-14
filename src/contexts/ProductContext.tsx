"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { Product, ProductFormData } from "@/types/product";

interface ProductContextType {
  products: Product[];
  addProduct: (productData: ProductFormData) => void;
  getProductByBarcode: (barcode: string) => Product | undefined;
  clearAllProducts: () => void;
  exportProducts: () => void;
  importProducts: (file: File) => Promise<boolean>;
  isLoaded: boolean;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const STORAGE_KEY = "supermarket_products";

// 从 localStorage 加载数据
const loadProductsFromStorage = (): Product[] => {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const products: Array<
        Omit<Product, "createdAt"> & { createdAt: string }
      > = JSON.parse(stored);
      // 将日期字符串转回 Date 对象
      return products.map((product) => ({
        ...product,
        createdAt: new Date(product.createdAt),
      }));
    }
  } catch (error) {
    console.error("加载商品数据失败:", error);
  }
  return [];
};

// 保存数据到 localStorage
const saveProductsToStorage = (products: Product[]) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch (error) {
    console.error("保存商品数据失败:", error);
  }
};

export function useProducts() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
}

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 组件挂载时从 localStorage 加载数据
  useEffect(() => {
    const savedProducts = loadProductsFromStorage();
    setProducts(savedProducts);
    setIsLoaded(true);
  }, []);

  // 当商品列表变化时保存到 localStorage（只在加载完成后）
  useEffect(() => {
    if (
      isLoaded &&
      (products.length > 0 || localStorage.getItem(STORAGE_KEY))
    ) {
      saveProductsToStorage(products);
    }
  }, [products, isLoaded]);

  const addProduct = useCallback((productData: ProductFormData) => {
    const newProduct: Product = {
      id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

  const clearAllProducts = useCallback(() => {
    setProducts([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // 导出产品数据到 JSON 文件
  const exportProducts = useCallback(() => {
    try {
      const dataStr = JSON.stringify(products, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `supermarket_products_${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("导出数据失败:", error);
    }
  }, [products]);

  // 从 JSON 文件导入产品数据
  const importProducts = useCallback(
    async (file: File): Promise<boolean> => {
      try {
        const text = await file.text();
        const importedProducts: Array<
          Omit<Product, "createdAt"> & { createdAt: string }
        > = JSON.parse(text);

        // 验证数据格式
        if (!Array.isArray(importedProducts)) {
          throw new Error("导入的数据格式不正确");
        }

        // 转换日期格式并合并数据
        const validProducts: Product[] = importedProducts.map((product) => ({
          ...product,
          createdAt: new Date(product.createdAt),
        }));

        // 检查是否有重复的条形码
        const existingBarcodes = new Set(products.map((p) => p.barcode));
        const newProducts = validProducts.filter(
          (p) => !existingBarcodes.has(p.barcode)
        );

        if (newProducts.length === 0) {
          return false; // 没有新产品添加
        }

        setProducts((prev) => [...prev, ...newProducts]);
        return true;
      } catch (error) {
        console.error("导入数据失败:", error);
        return false;
      }
    },
    [products]
  );

  return (
    <ProductContext.Provider
      value={{
        products,
        addProduct,
        getProductByBarcode,
        clearAllProducts,
        exportProducts,
        importProducts,
        isLoaded,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}
