"use client";

import { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ScanTest() {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<string>("");
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [scannerDimensions, setScannerDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
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

  const startScanning = async () => {
    console.log("开始扫码测试");

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

        // 检测是否为移动设备
        const isMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          );

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

        const html5QrCode = new Html5Qrcode("test-scanner");

        // 移动设备优化配置
        const config = {
          fps: 15,
          qrbox: { width: scannerWidth, height: scannerHeight },
          aspectRatio: isMobile ? 2.5 : 1.0, // 移动设备使用更宽的比例
          // 确保扫描框可见
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          // 移动设备特殊配置
          ...(isMobile && {
            videoConstraints: {
              facingMode: "environment", // 强制使用后摄像头
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 },
              focusMode: "continuous", // 连续对焦
              zoom: 1.0, // 不缩放
            },
            // 移动设备专用设置
            experimentalFeatures: {
              // useBarCodeDetectorIfSupported: true, // 使用原生条码检测器
            },
          }),
        };

        console.log("扫描配置:", config);
        console.log("扫描框尺寸:", {
          width: scannerWidth,
          height: scannerHeight,
        });

        // 保存扫描器尺寸用于调试显示
        setScannerDimensions({ width: scannerWidth, height: scannerHeight });

        await html5QrCode.start(
          bestCamera.id,
          config,
          (decodedText) => {
            console.log("扫描成功:", decodedText);
            console.log("扫描结果类型:", typeof decodedText);
            setResult(decodedText);

            // 移动设备上立即停止扫描，避免重复扫描
            if (isMobile) {
              try {
                html5QrCode.stop();
                setScanner(null);
                setIsScanning(false);
                console.log("移动设备扫描成功后立即停止");
              } catch (error) {
                console.error("移动设备停止扫描失败:", error);
              }
            } else {
              // 桌面设备保持原有逻辑
              html5QrCode
                .stop()
                .then(() => {
                  console.log("扫描成功后立即停止完成");
                })
                .catch((error) => {
                  console.error("扫描成功后停止失败:", error);
                });
              setScanner(null);
              setIsScanning(false);
            }
          },
          (errorMessage) => {
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
    }, 200); // 增加延迟时间
  };

  const stopScanning = () => {
    console.log("停止扫码测试");
    setIsScanning(false); // 先设置状态，停止错误日志
    setScannerDimensions(null); // 清除扫描器尺寸信息

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

  // 组件卸载时强制释放摄像头
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
        <CardTitle className="flex items-center justify-between">
          <span>扫码测试</span>
          <div className="text-sm font-normal text-gray-500">
            <div>isMobile: {isMobile ? "✅" : "❌"}</div>
            {scannerDimensions && (
              <div>
                📏 {scannerDimensions.width}×{scannerDimensions.height}
              </div>
            )}
            {isClient && (
              <div
                className="text-xs truncate max-w-xs"
                title={navigator.userAgent}
              >
                UA: {navigator.userAgent.substring(0, 50)}...
              </div>
            )}
          </div>
        </CardTitle>
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

        {isClient && isScanning && (
          <div className="border rounded-lg p-4">
            <div
              id="test-scanner"
              ref={scannerRef}
              style={{
                position: "relative",
                width: "100%",
                height: isMobile ? "60vh" : "400px", // 移动设备使用视口高度，桌面使用固定高度
                minHeight: "300px", // 最小高度保证
                maxHeight: isMobile ? "70vh" : "500px", // 最大高度限制
                overflow: "hidden", // 避免内容溢出
              }}
            ></div>
            {isMobile && (
              <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded">
                <p className="font-medium text-blue-800 mb-2">
                  📱 移动设备扫码提示：
                </p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>请将条形码放在扫描框中央</li>
                  <li>保持手机稳定，距离条码15-25cm</li>
                  <li>确保条形码完整显示在扫描框内</li>
                  <li>避免反光和阴影</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="border rounded-lg p-4">
            <p>
              <strong>扫描结果:</strong> {result}
            </p>
          </div>
        )}

        {/* 添加全局样式确保视频元素在不同设备上表现一致 */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
            #test-scanner video {
              width: 100% !important;
              height: 100% !important;
              object-fit: cover !important;
              border-radius: 8px;
            }
            
            #test-scanner canvas {
              position: absolute !important;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              border: 2px solid #ef4444 !important;
              border-radius: 4px !important;
              box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3) !important;
              z-index: 10 !important;
            }
            
            /* 移动设备特殊样式 */
            @media (max-width: 768px) {
              #test-scanner canvas {
                border: 3px solid #ef4444 !important;
                border-radius: 8px !important;
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.4) !important;
              }
            }
          `,
          }}
        />
      </CardContent>
    </Card>
  );
}
