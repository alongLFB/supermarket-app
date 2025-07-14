"use client";

import { useRef, useState } from "react";
import { useProducts } from "@/contexts/ProductContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function ProductList() {
  const {
    products,
    clearAllProducts,
    exportProducts,
    importProducts,
    isLoaded,
  } = useProducts();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPurchasePrice, setShowPurchasePrice] = useState(false);

  const togglePurchasePrice = () => {
    setShowPurchasePrice(!showPurchasePrice);
  };

  // 如果数据还没加载完成，显示加载状态
  if (!isLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>商品列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">加载中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleClearAll = () => {
    if (confirm("确定要清空所有商品数据吗？此操作不可恢复。")) {
      clearAllProducts();
      toast.success("所有商品数据已清空");
    }
  };

  const handleExport = () => {
    if (products.length === 0) {
      toast.error("没有数据可导出");
      return;
    }
    exportProducts();
    toast.success("数据导出成功");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const success = await importProducts(file);
      if (success) {
        toast.success("数据导入成功");
      } else {
        toast.error("数据导入失败或没有新数据");
      }
      // 清空文件选择
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>商品列表</CardTitle>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleImportClick}>
            导入数据
          </Button>
          {products.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={handleExport}>
                导出数据
              </Button>
              <Button variant="destructive" size="sm" onClick={handleClearAll}>
                清空所有
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          style={{ display: "none" }}
        />

        {products.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">暂无商品数据，请先添加商品</p>
            <p className="text-sm text-gray-400">
              💡 提示：数据会自动保存到浏览器本地存储，您也可以导出备份到文件
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              共 {products.length} 件商品 (数据已自动保存到本地存储)
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>产品条形码</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      进货价
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={togglePurchasePrice}
                        className="h-6 w-6 p-0"
                      >
                        {showPurchasePrice ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableHead>
                  <TableHead>售价</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>添加时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {product.barcode}
                    </TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      {showPurchasePrice ? (
                        `¥${product.purchasePrice.toFixed(2)}`
                      ) : (
                        <span className="text-gray-400">***</span>
                      )}
                    </TableCell>
                    <TableCell>¥{product.sellingPrice.toFixed(2)}</TableCell>
                    <TableCell>{product.quantity}</TableCell>
                    <TableCell>{product.createdAt.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
