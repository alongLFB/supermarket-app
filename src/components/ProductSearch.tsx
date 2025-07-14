"use client";

import { useState, useRef, useEffect } from "react";
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
import { Product } from "@/types/product";
import { Eye, EyeOff } from "lucide-react";

export default function ProductSearch() {
  const { getProductByBarcode, isLoaded } = useProducts();
  const [barcode, setBarcode] = useState("");
  const [searchResult, setSearchResult] = useState<Product | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [showPurchasePrice, setShowPurchasePrice] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);

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
        // 动态计算扫描区域尺寸
        const screenWidth = window.innerWidth;
        const scannerWidth = Math.min(screenWidth * 0.85, 400); // 屏幕宽度的85%，最大400px
        const scannerHeight = Math.round(scannerWidth * 0.6); // 宽高比 5:3 (适合条形码)

        const html5QrCodeScanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 8, // 降低帧率，提高稳定性
            // 动态计算的扫描区域：宽度接近屏幕宽度，高度按比例
            qrbox: { width: scannerWidth, height: scannerHeight },
            aspectRatio: 1.0,
            // 优化扫描配置
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
            // 针对 iPhone 的优化配置
            videoConstraints: {
              facingMode: "environment",
              width: { ideal: 1280 }, // 设置理想的分辨率
              height: { ideal: 720 },
            },
            // 移除 formatsToSupport 配置，使用默认支持所有格式
            // 这样可以避免格式枚举值的兼容性问题
          },
          false
        );

        html5QrCodeScanner.render(
          (decodedText) => {
            console.log("扫描成功:", decodedText);
            setBarcode(decodedText);
            handleSearch(decodedText);
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

            {isScanning && (
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
