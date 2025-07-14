"use client";

import { useState, useRef, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ScanTest() {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<string>("");
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);

  const startScanning = () => {
    console.log("开始扫码测试");

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
          "test-scanner",
          {
            fps: 10,
            // 动态计算的扫描区域：宽度接近屏幕宽度，高度按比例
            qrbox: { width: scannerWidth, height: scannerHeight },
            aspectRatio: 1.0,
            // 优化扫描配置
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
            // 默认使用后置摄像头
            videoConstraints: {
              facingMode: "environment",
            },
            // 只扫描一维码（条形码），不扫描二维码
            formatsToSupport: [
              // 常见的一维码格式
              5, // CODE_128
              9, // EAN_13
              10, // EAN_8
            ],
          },
          false
        );

        html5QrCodeScanner.render(
          (decodedText) => {
            console.log("扫描成功:", decodedText);
            setResult(decodedText);
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
    console.log("停止扫码测试");
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

  // 组件卸载时强制释放摄像头
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
        <CardTitle>扫码测试</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={() => {
            console.log("测试按钮点击, isScanning:", isScanning);
            if (isScanning) {
              stopScanning();
            } else {
              startScanning();
            }
          }}
          variant={isScanning ? "destructive" : "default"}
        >
          {isScanning ? "停止扫描" : "开始扫码"}
        </Button>

        {isScanning && (
          <div className="border rounded-lg p-4">
            <div id="test-scanner" ref={scannerRef}></div>
          </div>
        )}

        {result && (
          <div className="border rounded-lg p-4">
            <p>
              <strong>扫描结果:</strong> {result}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
