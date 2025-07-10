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
    console.log("开始扫码，scannerRef.current:", scannerRef.current);

    setIsScanning(true);

    // 等待DOM更新后再初始化扫描器
    setTimeout(() => {
      if (!scannerRef.current) {
        console.error("Scanner ref is null after DOM update");
        setIsScanning(false);
        return;
      }

      try {
        const html5QrCodeScanner = new Html5QrcodeScanner(
          "barcode-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            // 优化扫描配置
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
          },
          false
        );

        html5QrCodeScanner.render(
          (decodedText) => {
            console.log("扫描成功:", decodedText);
            setValue("barcode", decodedText);
            toast.success("条形码扫描成功！");
            // 立即停止扫描器，避免继续扫描
            html5QrCodeScanner
              .clear()
              .then(() => {
                console.log("扫描成功后立即清理完成");
              })
              .catch((error) => {
                console.error("扫描成功后清理失败:", error);
              });
            setScanner(null);
            setIsScanning(false);
          },
          (errorMessage) => {
            // 只在扫描状态下记录错误，避免清理过程中的错误
            if (isScanning) {
              // 只记录严重错误，忽略常见的解析错误
              if (
                !errorMessage.includes("NotFoundException") &&
                !errorMessage.includes("No MultiFormat Readers")
              ) {
                console.log("Scanning error:", errorMessage);
              }
            }
          }
        );

        setScanner(html5QrCodeScanner);
      } catch (error) {
        console.error("扫码初始化失败:", error);
        toast.error("扫码功能初始化失败，请检查摄像头权限");
        setIsScanning(false);
      }
    }, 200); // 增加延迟时间
  };

  const stopScanning = () => {
    console.log("停止扫码");
    setIsScanning(false); // 先设置状态，停止错误日志

    if (scanner) {
      try {
        // 异步清理扫描器
        scanner
          .clear()
          .then(() => {
            console.log("扫描器清理成功");
          })
          .catch((error) => {
            console.error("清理扫描器失败:", error);
          });
        setScanner(null);
      } catch (error) {
        console.error("清理扫描器失败:", error);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.clear().catch(() => {
          // 忽略错误
        });
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
                onClick={() => {
                  console.log("扫码按钮点击, isScanning:", isScanning);
                  if (isScanning) {
                    stopScanning();
                  } else {
                    startScanning();
                  }
                }}
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
