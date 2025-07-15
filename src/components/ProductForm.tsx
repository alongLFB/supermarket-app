"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Html5Qrcode } from "html5-qrcode";
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
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);

  // 检测客户端渲染
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 检测移动设备
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      const checkMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      setIsMobile(checkMobile);
    }
  }, []);

  // 获取最佳摄像头
  const getBestCamera = async () => {
    try {
      const cameras = await Html5Qrcode.getCameras();
      console.log("可用摄像头:", cameras);

      // 优先匹配名称包含 back 的摄像头（不区分大小写）
      let bestCamera = cameras.find(
        (camera) =>
          camera.label.toLowerCase().includes("back") ||
          camera.label.toLowerCase().includes("rear")
      );

      // 如果没有找到后摄像头，使用第一个摄像头
      if (!bestCamera && cameras.length > 0) {
        bestCamera = cameras[0];
      }

      console.log("选择的摄像头:", bestCamera);
      return bestCamera;
    } catch (error) {
      console.error("获取摄像头失败:", error);
      return null;
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const startScanning = async () => {
    console.log("开始扫码，scannerRef.current:", scannerRef.current);

    setIsScanning(true);

    // 等待DOM更新后再初始化扫描器
    setTimeout(async () => {
      if (!scannerRef.current) {
        console.error("Scanner ref is null after DOM update");
        setIsScanning(false);
        return;
      }

      try {
        // 获取最佳摄像头
        const bestCamera = await getBestCamera();
        if (!bestCamera) {
          console.error("没有可用的摄像头");
          toast.error("没有可用的摄像头");
          setIsScanning(false);
          return;
        }

        // 动态计算扫描区域尺寸
        const screenWidth = window.innerWidth;
        let scannerWidth, scannerHeight;

        if (isMobile) {
          // 移动设备：使用更大的扫描区域，特别适合一维码
          scannerWidth = Math.min(screenWidth * 0.95, 400); // 95% 屏幕宽度
          scannerHeight = Math.round(scannerWidth * 0.4); // 更适合一维码的比例 (2.5:1)
        } else {
          // 桌面设备：保持原有设置
          scannerWidth = Math.min(screenWidth * 0.85, 300);
          scannerHeight = Math.round(scannerWidth * 0.6);
        }

        const html5QrCode = new Html5Qrcode("barcode-reader");

        // 移动设备优化配置
        const config = {
          fps: 15,
          qrbox: { width: scannerWidth, height: scannerHeight },
          aspectRatio: isMobile ? 2.5 : 1.0,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          ...(isMobile && {
            videoConstraints: {
              facingMode: "environment",
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 },
              focusMode: "continuous",
              zoom: 1.0,
            },
          }),
        };

        await html5QrCode.start(
          bestCamera.id,
          config,
          (decodedText: string) => {
            console.log("扫描成功:", decodedText);
            setValue("barcode", decodedText);
            toast.success("条形码扫描成功！");
            // 立即停止扫描器，避免继续扫描
            try {
              html5QrCode.stop();
              setScanner(null);
              setIsScanning(false);
              console.log("扫描成功后立即停止");
            } catch (error) {
              console.error("扫描成功后停止失败:", error);
            }
          },
          (errorMessage: string) => {
            // 只在扫描状态下记录错误，避免清理过程中的错误
            if (isScanning) {
              // 只记录严重错误，忽略常见的解析错误
              if (
                !errorMessage.includes("NotFoundException") &&
                !errorMessage.includes("No MultiFormat Readers") &&
                !errorMessage.includes("No code found")
              ) {
                console.log("Scanning error:", errorMessage);
              }
            }
          }
        );

        setScanner(html5QrCode);
      } catch (error) {
        console.error("扫码初始化失败:", error);
        toast.error("扫码功能初始化失败，请检查摄像头权限");
        setIsScanning(false);
      }
    }, 200);
  };

  const stopScanning = () => {
    console.log("停止扫码");
    setIsScanning(false); // 先设置状态，停止错误日志

    if (scanner) {
      try {
        // 停止扫描器
        scanner.stop();
        setScanner(null);
        console.log("扫描器停止成功");
      } catch (error) {
        console.error("停止扫描器失败:", error);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (scanner) {
        try {
          scanner.stop();
        } catch {
          // 忽略错误
        }
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

          {isClient && isScanning && (
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
