"use client";

import { useProducts } from "@/contexts/ProductContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProductList() {
  const { products } = useProducts();

  return (
    <Card>
      <CardHeader>
        <CardTitle>商品列表</CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            暂无商品数据，请先添加商品
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>产品条形码</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>进货价</TableHead>
                <TableHead>售价</TableHead>
                <TableHead>数量</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    {product.barcode}
                  </TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>¥{product.purchasePrice.toFixed(2)}</TableCell>
                  <TableCell>¥{product.sellingPrice.toFixed(2)}</TableCell>
                  <TableCell>{product.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
