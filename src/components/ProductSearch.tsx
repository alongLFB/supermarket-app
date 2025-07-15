"use client";

import { useState, useRef, useEffect } from "react";
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
import { Product } from "@/types/product";
import { Eye, EyeOff } from "lucide-react";

// 动态导入 quagga2 以避免 SSR 问题
import type { QuaggaJSStatic } from "@ericblade/quagga2";

let Quagga: QuaggaJSStatic | null = null;

export default function ProductSearch() {
  const { getProductByBarcode, isLoaded } = useProducts();
  const [barcode, setBarcode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [searchResult, setSearchResult] = useState<Product | null>(null);
  const [showPurchasePrice, setShowPurchasePrice] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isQuaggaReady, setIsQuaggaReady] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);

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

        const container = document.getElementById("search-barcode-reader");
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

          console.log("ProductSearch扫描成功:", result.codeResult.code);

          if (isIPhone) {
            console.log("iPhone条形码识别成功，结果:", result.codeResult.code);
            if (navigator.vibrate) {
              navigator.vibrate(200);
            }
          }

          setBarcode(result.codeResult.code);

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

  const handleSearch = () => {
    if (!barcode.trim()) {
      setSearchResult(null);
      return;
    }

    if (!isLoaded) {
      console.log("产品数据尚未加载");
      return;
    }

    const product = getProductByBarcode(barcode.trim());
    setSearchResult(product || null);
  };

  const handleClear = () => {
    setBarcode("");
    setSearchResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>商品查询</CardTitle>
          <CardDescription>通过条形码查找商品信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="search-barcode">条形码</Label>
            <div className="flex space-x-2">
              <Input
                id="search-barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="输入或扫描条形码"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
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
              <Button onClick={handleSearch} disabled={!isLoaded}>
                搜索
              </Button>
              <Button variant="outline" onClick={handleClear}>
                清空
              </Button>
            </div>
          </div>

          {/* 扫码区域 */}
          {isClient && isScanning && (
            <div className="mt-4">
              <div
                id="search-barcode-reader"
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

          {/* 搜索结果 */}
          {searchResult ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">商品信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">商品名称</Label>
                    <p className="text-sm">{searchResult.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">条形码</Label>
                    <p className="text-sm font-mono">{searchResult.barcode}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">销售价格</Label>
                    <p className="text-sm">
                      ¥{searchResult.sellingPrice.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium flex items-center">
                      进价
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPurchasePrice(!showPurchasePrice)}
                        className="ml-1 h-6 w-6 p-0"
                      >
                        {showPurchasePrice ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </Label>
                    <p className="text-sm">
                      {showPurchasePrice
                        ? `¥${searchResult.purchasePrice.toFixed(2)}`
                        : "••••"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">库存数量</Label>
                    <p className="text-sm">{searchResult.quantity}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">毛利率</Label>
                    <p className="text-sm">
                      {showPurchasePrice
                        ? `${(
                            ((searchResult.sellingPrice -
                              searchResult.purchasePrice) /
                              searchResult.sellingPrice) *
                            100
                          ).toFixed(1)}%`
                        : "••••"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : barcode && isLoaded ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">
                  未找到条形码为 &quot;{barcode}&quot; 的商品
                </p>
              </CardContent>
            </Card>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
