"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductProvider } from "@/contexts/ProductContext";
import ProductForm from "@/components/ProductForm";
import ProductList from "@/components/ProductList";
import ProductSearch from "@/components/ProductSearch";
import ScanTest from "@/components/ScanTest";
import { Toaster } from "@/components/ui/sonner";

export default function Home() {
  return (
    <ProductProvider>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          虎存超市管理系统
        </h1>

        <Tabs defaultValue="add" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="add">商品入库</TabsTrigger>
            <TabsTrigger value="list">商品列表</TabsTrigger>
            <TabsTrigger value="search">商品查询</TabsTrigger>
            <TabsTrigger value="test">扫码测试</TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="mt-6">
            <ProductForm />
          </TabsContent>

          <TabsContent value="list" className="mt-6">
            <ProductList />
          </TabsContent>

          <TabsContent value="search" className="mt-6">
            <ProductSearch />
          </TabsContent>

          <TabsContent value="test" className="mt-6">
            <ScanTest />
          </TabsContent>
        </Tabs>

        <Toaster />
      </main>
    </ProductProvider>
  );
}
