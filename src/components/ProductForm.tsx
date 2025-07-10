"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useProducts } from "@/contexts/ProductContext";
import { ProductFormData } from "@/types/product";
import { toast } from "sonner";

const productSchema = z.object({
  barcode: z.string().min(1, "产品条形码不能为空"),
  name: z.string().min(1, "产品名称不能为空"),
  purchasePrice: z.number().min(0, "进货价必须为正数"),
  sellingPrice: z.number().min(0, "售价必须为正数"),
  quantity: z.number().int().min(1, "数量必须为正整数"),
});

export default function ProductForm() {
  const { addProduct } = useProducts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const startScanning = () => {
    if (!scannerRef.current) return;

    setIsScanning(true);

    const html5QrCodeScanner = new Html5QrcodeScanner(
      "barcode-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    html5QrCodeScanner.render(
      (decodedText) => {
        setValue("barcode", decodedText);
        stopScanning();
        toast.success("条形码扫描成功！");
      },
      (errorMessage) => {
        console.log("Scanning error:", errorMessage);
      }
    );

    setScanner(html5QrCodeScanner);
  };

  const stopScanning = () => {
    if (scanner) {
      scanner.clear();
      setScanner(null);
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
  }, [scanner]);

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      addProduct(data);
      reset();
      toast.success("产品添加成功！");
    } catch {
      toast.error("添加产品失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>商品入库</CardTitle>
        <CardDescription>添加新商品到库存中</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="barcode">产品条形码</Label>
            <div className="flex space-x-2">
              <Input
                id="barcode"
                placeholder="请输入产品条形码"
                className="flex-1"
                {...register("barcode")}
              />
              <Button
                type="button"
                onClick={isScanning ? stopScanning : startScanning}
                variant={isScanning ? "destructive" : "outline"}
              >
                {isScanning ? "停止扫描" : "扫码"}
              </Button>
            </div>
            {errors.barcode && (
              <p className="text-sm text-red-500">{errors.barcode.message}</p>
            )}
          </div>

          {isScanning && (
            <div className="border rounded-lg p-4">
              <div id="barcode-reader" ref={scannerRef}></div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">名称</Label>
            <Input
              id="name"
              placeholder="请输入产品名称"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchasePrice">进货价</Label>
            <Input
              id="purchasePrice"
              type="number"
              step="0.01"
              placeholder="请输入进货价"
              {...register("purchasePrice", { valueAsNumber: true })}
            />
            {errors.purchasePrice && (
              <p className="text-sm text-red-500">
                {errors.purchasePrice.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sellingPrice">售价</Label>
            <Input
              id="sellingPrice"
              type="number"
              step="0.01"
              placeholder="请输入售价"
              {...register("sellingPrice", { valueAsNumber: true })}
            />
            {errors.sellingPrice && (
              <p className="text-sm text-red-500">
                {errors.sellingPrice.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">数量</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="请输入数量"
              {...register("quantity", { valueAsNumber: true })}
            />
            {errors.quantity && (
              <p className="text-sm text-red-500">{errors.quantity.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "添加中..." : "添加产品"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
