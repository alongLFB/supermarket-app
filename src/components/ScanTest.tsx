"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// 动态导入 quagga2 以避免 SSR 问题
import type { QuaggaJSStatic } from "@ericblade/quagga2";

let Quagga: QuaggaJSStatic | null = null;

export default function ScanTest() {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<string>("");
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [scannerDimensions, setScannerDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [canFocus, setCanFocus] = useState(false);
  const [isFocusing, setIsFocusing] = useState(false);
  const [isQuaggaReady, setIsQuaggaReady] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

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
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      console.log("可用摄像头:", videoDevices);

      // 优先匹配名称包含 back 的摄像头（不区分大小写）
      let bestCamera = videoDevices.find(
        (device) =>
          device.label.toLowerCase().includes("back") ||
          device.label.toLowerCase().includes("rear") ||
          device.label.toLowerCase().includes("environment")
      );

      // 如果没有找到后摄像头，使用第一个摄像头
      if (!bestCamera && videoDevices.length > 0) {
        bestCamera = videoDevices[0];
      }

      console.log("选择的摄像头:", bestCamera);
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

        // 特别检测iPhone
        const isIPhone = /iPhone/i.test(navigator.userAgent);

        // 动态计算扫描区域尺寸 - 针对条形码优化
        const screenWidth = window.innerWidth;

        let scannerWidth, scannerHeight;

        if (isMobile) {
          // 移动设备：针对条形码优化 - 宽而窄的扫描框
          scannerWidth = Math.min(screenWidth * 0.95, 380);
          scannerHeight = isIPhone
            ? Math.round(scannerWidth * 0.25)
            : Math.round(scannerWidth * 0.3);
        } else {
          // 桌面设备：保持原有设置
          scannerWidth = Math.min(screenWidth * 0.85, 300);
          scannerHeight = Math.round(scannerWidth * 0.6);
        }

        // 保存扫描器尺寸用于调试显示
        setScannerDimensions({ width: scannerWidth, height: scannerHeight });

        // 设置摄像头约束
        const constraints = {
          video: {
            deviceId: bestCamera.deviceId,
            facingMode: "environment",
            width: 1920,
            height: 1600,
            frameRate: isIPhone ? 15 : isMobile ? 20 : 30,
            focusMode: isIPhone ? "continuous" : "single-shot",
            focusDistance: isIPhone ? 0.3 : 0.5,
            exposureMode: "continuous",
            whiteBalanceMode: "continuous",
            zoom: 1.0,
          },
        };

        console.log("扫描配置:", constraints);
        console.log("扫描框尺寸:", {
          width: scannerWidth,
          height: scannerHeight,
        });

        // 获取媒体流
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setVideoStream(stream);

        // 检查是否支持对焦功能
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = track.getCapabilities();
          console.log("摄像头能力:", capabilities);

          const extendedCapabilities =
            capabilities as MediaTrackCapabilities & {
              focusMode?: string[];
            };
          if (extendedCapabilities.focusMode) {
            setCanFocus(true);
            console.log("支持对焦模式:", extendedCapabilities.focusMode);
          }
        }

        // 创建 video 元素
        const videoElement = document.createElement("video");
        videoElement.style.width = "100%";
        videoElement.style.height = "100%";
        videoElement.style.objectFit = "cover";
        videoElement.style.borderRadius = "8px";
        videoElement.srcObject = stream;
        videoElementRef.current = videoElement;

        // 清空容器并添加 video 元素
        const container = document.getElementById("test-scanner");
        if (container) {
          container.innerHTML = "";
          container.appendChild(videoElement);

          // 添加点击事件进行对焦
          if (isMobile) {
            videoElement.addEventListener("click", (e) => {
              e.preventDefault();
              handleFocus();
            });
          }
        }

        await videoElement.play();

        // 配置 Quagga2 扫描器
        const config = {
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: videoElement,
            constraints: constraints.video,
          },
          decoder: {
            readers: ["ean_reader"],
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

        console.log("Quagga2 配置:", config);

        // 初始化 Quagga2
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

        // 监听扫描结果
        Quagga.onDetected((result) => {
          if (!result.codeResult || !result.codeResult.code) {
            return;
          }

          console.log("扫描成功:", result.codeResult.code);
          console.log("完整结果:", result);

          // 条形码识别成功的特殊处理
          if (isIPhone) {
            console.log("iPhone条形码识别成功，结果:", result.codeResult.code);
            // iPhone上给予成功反馈
            if (navigator.vibrate) {
              navigator.vibrate(200);
            }
          }

          setResult(result.codeResult.code);

          // 停止扫描
          if (Quagga) {
            Quagga.stop();
          }
          setIsScanning(false);

          // 停止视频流
          if (videoStream) {
            videoStream.getTracks().forEach((track) => track.stop());
            setVideoStream(null);
          }

          console.log("扫描成功后立即停止");
        });

        // 监听处理错误
        Quagga.onProcessed((result) => {
          // 可以在这里处理扫描过程中的信息
          if (result && result.codeResult && result.codeResult.code) {
            console.log("处理中的结果:", result.codeResult.code);
          }
        });
      } catch (error) {
        console.error("扫码初始化失败:", error);
        setIsScanning(false);
      }
    }, 200);
  };

  const stopScanning = () => {
    console.log("停止扫码测试");
    setIsScanning(false);
    setScannerDimensions(null);

    // 停止 Quagga2
    if (Quagga) {
      Quagga.stop();
    }

    // 停止视频流
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

  // 手动对焦功能
  const handleFocus = async () => {
    if (!videoStream || !videoElementRef.current) return;

    setIsFocusing(true);

    // 显示对焦指示器
    const container = document.getElementById("test-scanner");
    if (container) {
      const focusIndicator = document.createElement("div");
      focusIndicator.className = "focus-indicator";
      container.appendChild(focusIndicator);

      // 0.5秒后移除指示器
      setTimeout(() => {
        if (container.contains(focusIndicator)) {
          container.removeChild(focusIndicator);
        }
      }, 500);
    }

    try {
      const track = videoStream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities();
        console.log("尝试对焦，摄像头能力:", capabilities);

        // 简单的对焦方法：暂停和恢复视频流
        const videoElement = videoElementRef.current;
        if (videoElement) {
          // 暂停视频
          videoElement.pause();

          // 短暂延迟后恢复
          setTimeout(async () => {
            try {
              await videoElement.play();
              console.log("对焦完成");
            } catch (error) {
              console.log("恢复视频失败:", error);
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error("对焦失败:", error);
    } finally {
      setTimeout(() => {
        setIsFocusing(false);
      }, 500);
    }
  };

  // 点击视频区域进行对焦
  const handleVideoClick = (event: React.MouseEvent) => {
    if (!isMobile) return;

    event.preventDefault();
    handleFocus();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>扫码测试</span>
          <div className="text-sm font-normal text-gray-500">
            <div>isMobile: {isMobile ? "✅" : "❌"}</div>
            {isClient && (
              <div>
                iPhone: {/iPhone/i.test(navigator.userAgent) ? "✅" : "❌"}
              </div>
            )}
            {isClient && canFocus && <div>🔍 Focus: ✅</div>}
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
          className="w-full"
          disabled={!isQuaggaReady}
        >
          {!isQuaggaReady ? "加载中..." : isScanning ? "停止扫描" : "开始扫码"}
        </Button>

        {/* 对焦按钮 */}
        {isScanning && isMobile && (
          <Button
            onClick={handleFocus}
            variant="outline"
            disabled={isFocusing}
            className="w-full"
          >
            {isFocusing ? "对焦中..." : "🔍 点击对焦"}
          </Button>
        )}

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
              onClick={handleVideoClick} // 添加点击对焦功能
            ></div>
            {isMobile && (
              <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded">
                <p className="font-medium text-blue-800 mb-2">
                  📱 移动设备条形码扫描提示：
                </p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>
                    🎯 将条形码<strong>水平放置</strong>在扫描框中央
                  </li>
                  <li>
                    📏 保持手机稳定，距离条码<strong>15-25cm</strong>
                  </li>
                  <li>🔍 确保条形码完整且清晰显示在扫描框内</li>
                  <li>💡 避免强光反射和阴影，适当调整角度</li>
                  <li>
                    👆 <strong>点击视频区域或对焦按钮</strong>进行手动对焦
                  </li>
                  {/iPhone/i.test(navigator.userAgent) && (
                    <li>
                      🍎 <strong>iPhone优化</strong>：如识别慢请尝试稍微倾斜手机
                    </li>
                  )}
                  <li>🔄 如无法识别，请尝试重新开始扫描</li>
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
              cursor: ${isMobile ? "pointer" : "default"};
            }
            
            /* Quagga2 专用样式 */
            #test-scanner canvas {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: 100% !important;
              z-index: 10 !important;
              pointer-events: none !important;
            }
            
            /* 对焦指示器 */
            .focus-indicator {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 100px;
              height: 100px;
              border: 2px solid #10b981;
              border-radius: 50%;
              opacity: 0;
              pointer-events: none;
              z-index: 15;
              animation: focusAnimation 0.5s ease-in-out;
            }
            
            @keyframes focusAnimation {
              0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
              }
              50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.2);
              }
              100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1);
              }
            }
            
            /* 移动设备特殊样式 */
            @media (max-width: 768px) {
              #test-scanner video:active {
                transform: scale(0.98);
                transition: transform 0.1s ease;
              }
            }
          `,
          }}
        />
      </CardContent>
    </Card>
  );
}
