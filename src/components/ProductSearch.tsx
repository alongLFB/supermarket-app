"use client";

import { useState, useRef, useEffect } from "react";
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
import { Product } from "@/types/product";
import { Eye, EyeOff } from "lucide-react";

export default function ProductSearch() {
  const { getProductByBarcode, isLoaded } = useProducts();
  const [barcode, setBarcode] = useState("");
  const [searchResult, setSearchResult] = useState<Product | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [showPurchasePrice, setShowPurchasePrice] = useState(false);
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

  const togglePurchasePrice = () => {
    setShowPurchasePrice(!showPurchasePrice);
  };

  const handleSearch = (searchBarcode: string) => {
    if (!searchBarcode.trim()) {
      setSearchResult(null);
      return;
    }

    const product = getProductByBarcode(searchBarcode);
    setSearchResult(product || null);
  };

  const handleInputChange = (value: string) => {
    setBarcode(value);
    handleSearch(value);
  };

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

        const html5QrCode = new Html5Qrcode("qr-reader");

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
            setBarcode(decodedText);
            handleSearch(decodedText);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>商品查询</CardTitle>
        <CardDescription>通过条形码查找商品信息</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isLoaded ? (
          <div className="text-center py-8">
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="search-barcode">条形码</Label>
              <div className="flex space-x-2">
                <Input
                  id="search-barcode"
                  placeholder="输入条形码或扫描"
                  className="flex-1"
                  value={barcode}
                  onChange={(e) => handleInputChange(e.target.value)}
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
            </div>

            {isClient && isScanning && (
              <div className="border rounded-lg p-4">
                <div id="qr-reader" ref={scannerRef}></div>
              </div>
            )}

            {/* 搜索结果展示 */}
            <div className="border rounded-lg p-4">
              {!barcode ? (
                <p className="text-center text-gray-500">
                  请输入条形码进行查询
                </p>
              ) : searchResult ? (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{searchResult.name}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
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
                      <p className="font-medium">
                        {showPurchasePrice ? (
                          `¥${searchResult.purchasePrice.toFixed(2)}`
                        ) : (
                          <span className="text-gray-400">***</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">售价</p>
                      <p className="font-medium">
                        ¥{searchResult.sellingPrice.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">库存</p>
                      <p className="font-medium">{searchResult.quantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">条形码</p>
                      <p className="font-medium">{searchResult.barcode}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-red-500">未找到对应的商品</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
