"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

// 动态导入 quagga2 以避免 SSR 问题
import type { QuaggaJSStatic } from "@ericblade/quagga2";

let Quagga: QuaggaJSStatic | null = null;

const productSchema = z.object({
  name: z.string().min(1, "商品名称不能为空"),
  barcode: z.string().min(1, "条形码不能为空"),
  sellingPrice: z.number().min(0, "销售价格必须大于等于0"),
  purchasePrice: z.number().min(0, "进价必须大于等于0"),
  quantity: z.number().min(0, "库存必须大于等于0"),
});

export default function ProductForm() {
  const [isScanning, setIsScanning] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isQuaggaReady, setIsQuaggaReady] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const { addProduct } = useProducts();

  // 初始化 Quagga2
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("@ericblade/quagga2").then((module) => {
        Quagga = module.default;
        setIsQuaggaReady(true);
      });
    }
  }, []);

  // 检测客户端渲染
  useEffect(() => {
    setIsClient(true);
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  // 获取最佳摄像头
  const getBestCamera = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      let bestCamera = videoDevices.find(
        (device) =>
          device.label.toLowerCase().includes("back") ||
          device.label.toLowerCase().includes("rear") ||
          device.label.toLowerCase().includes("environment")
      );

      if (!bestCamera && videoDevices.length > 0) {
        bestCamera = videoDevices[0];
      }

      return bestCamera;
    } catch (error) {
      console.error("获取摄像头失败:", error);
      return null;
    }
  };

  const startScanning = async () => {
    if (!isQuaggaReady || !Quagga) {
      console.error("Quagga2 尚未准备好");
      return;
    }

    console.log("开始扫码");
    setIsScanning(true);

    setTimeout(async () => {
      if (!scannerRef.current) {
        console.error("Scanner ref is null after DOM update");
        setIsScanning(false);
        return;
      }

      try {
        const bestCamera = await getBestCamera();
        if (!bestCamera) {
          console.error("没有可用的摄像头");
          toast.error("没有可用的摄像头");
          setIsScanning(false);
          return;
        }

        const isMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          );
        const isIPhone = /iPhone/i.test(navigator.userAgent);

        const constraints = {
          video: {
            deviceId: bestCamera.deviceId,
            facingMode: "environment",
            width: isIPhone
              ? { min: 320, ideal: 480, max: 720 }
              : { min: 480, ideal: 720, max: 1280 },
            height: isIPhone
              ? { min: 240, ideal: 360, max: 540 }
              : { min: 360, ideal: 540, max: 720 },
            frameRate: isIPhone ? 15 : isMobile ? 20 : 30,
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setVideoStream(stream);

        const videoElement = document.createElement("video");
        videoElement.style.width = "100%";
        videoElement.style.height = "100%";
        videoElement.style.objectFit = "cover";
        videoElement.style.borderRadius = "8px";
        videoElement.srcObject = stream;

        const container = document.getElementById("barcode-reader");
        if (container) {
          container.innerHTML = "";
          container.appendChild(videoElement);
        }

        await videoElement.play();

        const config = {
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: videoElement,
            constraints: constraints.video,
          },
          decoder: {
            readers: [
              "code_128_reader",
              "ean_reader",
              "ean_8_reader",
              "code_39_reader",
              "code_39_vin_reader",
              "codabar_reader",
              "upc_reader",
              "upc_e_reader",
              "i2of5_reader",
              "2of5_reader",
              "code_93_reader",
            ],
          },
          locate: true,
          locator: {
            patchSize: isMobile ? "large" : "medium",
            halfSample: false,
          },
          numOfWorkers: navigator.hardwareConcurrency || 4,
          frequency: isIPhone ? 5 : isMobile ? 10 : 15,
          debug: {
            drawBoundingBox: false,
            showFrequency: false,
            drawScanline: false,
            showPattern: false,
          },
        };

        if (!Quagga) {
          console.error("Quagga2 未初始化");
          setIsScanning(false);
          return;
        }

        Quagga.init(config, (err: Error | null) => {
          if (err) {
            console.error("Quagga2 初始化失败:", err);
            toast.error("扫码功能初始化失败，请检查摄像头权限");
            setIsScanning(false);
            return;
          }
          console.log("Quagga2 初始化成功");
          if (Quagga) {
            Quagga.start();
          }
        });

        Quagga.onDetected((result) => {
          if (!result.codeResult || !result.codeResult.code) {
            return;
          }

          console.log("ProductForm扫描成功:", result.codeResult.code);

          if (isIPhone) {
            console.log("iPhone条形码识别成功，结果:", result.codeResult.code);
            if (navigator.vibrate) {
              navigator.vibrate(200);
            }
          }

          setValue("barcode", result.codeResult.code);
          toast.success("条形码扫描成功！");

          // 停止扫描
          if (Quagga) {
            Quagga.stop();
          }
          setIsScanning(false);

          if (videoStream) {
            videoStream.getTracks().forEach((track) => track.stop());
            setVideoStream(null);
          }

          console.log("扫描成功后立即停止");
        });
      } catch (error) {
        console.error("扫码初始化失败:", error);
        toast.error("扫码功能初始化失败，请检查摄像头权限");
        setIsScanning(false);
      }
    }, 200);
  };

  const stopScanning = () => {
    console.log("停止扫码");
    setIsScanning(false);

    if (Quagga) {
      Quagga.stop();
    }

    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
  };

  // 组件卸载时强制释放摄像头
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
      if (Quagga) {
        Quagga.stop();
      }
    };
  }, [videoStream]);

  const onSubmit = (data: ProductFormData) => {
    addProduct(data);
    toast.success("商品添加成功！");
    reset();
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>添加商品</CardTitle>
          <CardDescription>填写商品信息并添加到库存</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">商品名称</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="输入商品名称"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="barcode">条形码</Label>
                <div className="flex space-x-2">
                  <Input
                    id="barcode"
                    {...register("barcode")}
                    placeholder="输入或扫描条形码"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (isScanning) {
                        stopScanning();
                      } else {
                        startScanning();
                      }
                    }}
                    disabled={!isQuaggaReady}
                  >
                    {!isQuaggaReady
                      ? "加载中..."
                      : isScanning
                      ? "停止扫描"
                      : "扫描"}
                  </Button>
                </div>
                {errors.barcode && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.barcode.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="sellingPrice">销售价格</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="0.01"
                  {...register("sellingPrice", { valueAsNumber: true })}
                  placeholder="输入销售价格"
                />
                {errors.sellingPrice && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.sellingPrice.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="purchasePrice">进价</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  {...register("purchasePrice", { valueAsNumber: true })}
                  placeholder="输入进价"
                />
                {errors.purchasePrice && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.purchasePrice.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="quantity">库存数量</Label>
                <Input
                  id="quantity"
                  type="number"
                  {...register("quantity", { valueAsNumber: true })}
                  placeholder="输入库存数量"
                />
                {errors.quantity && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.quantity.message}
                  </p>
                )}
              </div>
            </div>

            {/* 扫码区域 */}
            {isClient && isScanning && (
              <div className="mt-4">
                <div
                  id="barcode-reader"
                  ref={scannerRef}
                  className="border rounded-lg"
                  style={{
                    width: "100%",
                    height: "300px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                ></div>
                <div className="mt-2 text-sm text-gray-600">
                  <p>请将条形码放在扫描框中央，保持清晰和稳定</p>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full">
              添加商品
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
