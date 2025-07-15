"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// 动态导入 quagga2 以避免 SSR 问题
import type { QuaggaJSStatic } from "@ericblade/quagga2";

let Quagga: QuaggaJSStatic | null = null;

export default function Quagga2Test() {
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isQuaggaReady, setIsQuaggaReady] = useState(false);
  const [scannerDimensions, setScannerDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [canFocus, setCanFocus] = useState(false);
  const [isFocusing, setIsFocusing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    camera?: string;
    resolution?: string;
    fps?: number;
    readerTypes?: string[];
  }>({});

  // 摄像头选择相关状态
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    []
  );
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isLoadingCameras, setIsLoadingCameras] = useState(false);

  const scannerRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // 初始化 Quagga2
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("@ericblade/quagga2").then((module) => {
        Quagga = module.default;
        setIsQuaggaReady(true);
        console.log("Quagga2 已准备就绪");
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

  // 获取所有可用摄像头
  const getAllCameras = useCallback(async () => {
    try {
      setIsLoadingCameras(true);

      // 先请求摄像头权限以获取完整的设备信息
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      console.log("所有可用摄像头:", videoDevices);
      setAvailableCameras(videoDevices);

      // 如果没有选择过摄像头，自动选择最佳摄像头
      if (!selectedCameraId && videoDevices.length > 0) {
        const bestCamera = getBestCameraFromList(videoDevices);
        setSelectedCameraId(bestCamera.deviceId);
      }

      return videoDevices;
    } catch (error) {
      console.error("获取摄像头列表失败:", error);
      toast.error("无法获取摄像头列表");
      return [];
    } finally {
      setIsLoadingCameras(false);
    }
  }, [selectedCameraId]);

  // 从摄像头列表中获取最佳摄像头
  const getBestCameraFromList = (cameras: MediaDeviceInfo[]) => {
    // 优先匹配名称包含 back 的摄像头
    let bestCamera = cameras.find(
      (device) =>
        device.label.toLowerCase().includes("back") ||
        device.label.toLowerCase().includes("rear") ||
        device.label.toLowerCase().includes("environment")
    );

    // 如果没有找到后摄像头，使用第一个摄像头
    if (!bestCamera && cameras.length > 0) {
      bestCamera = cameras[0];
    }

    return bestCamera || cameras[0];
  };

  // 在组件加载时获取摄像头列表
  useEffect(() => {
    if (isClient && isQuaggaReady) {
      getAllCameras();
    }
  }, [isClient, isQuaggaReady, getAllCameras]);

  // 获取选择的摄像头
  const getSelectedCamera = async () => {
    try {
      // 如果没有可用摄像头列表，先获取
      if (availableCameras.length === 0) {
        await getAllCameras();
      }

      // 如果有选择的摄像头ID，使用选择的摄像头
      if (selectedCameraId) {
        const selectedCamera = availableCameras.find(
          (camera) => camera.deviceId === selectedCameraId
        );
        if (selectedCamera) {
          console.log("使用选择的摄像头:", selectedCamera);
          return selectedCamera;
        }
      }

      // 如果没有选择或找不到选择的摄像头，使用最佳摄像头
      const bestCamera = getBestCameraFromList(availableCameras);
      console.log("使用最佳摄像头:", bestCamera);
      return bestCamera;
    } catch (error) {
      console.error("获取摄像头失败:", error);
      return null;
    }
  };

  const startScanning = async () => {
    if (!isQuaggaReady || !Quagga) {
      toast.error("Quagga2 尚未准备好");
      return;
    }

    console.log("开始 Quagga2 扫码测试");
    setIsScanning(true);
    setResults([]);

    // 等待DOM更新后再初始化扫描器
    setTimeout(async () => {
      if (!scannerRef.current) {
        console.error("Scanner ref is null");
        setIsScanning(false);
        return;
      }

      try {
        // 获取选择的摄像头
        const selectedCamera = await getSelectedCamera();
        if (!selectedCamera) {
          toast.error("没有可用的摄像头");
          setIsScanning(false);
          return;
        }

        // 检测设备类型
        const isIPhone = /iPhone/i.test(navigator.userAgent);

        // 动态计算扫描区域尺寸
        const screenWidth = window.innerWidth;
        let scannerWidth, scannerHeight;

        if (isMobile) {
          scannerWidth = Math.min(screenWidth * 0.9, 350);
          scannerHeight = isIPhone
            ? Math.round(scannerWidth * 0.3)
            : Math.round(scannerWidth * 0.35);
        } else {
          scannerWidth = Math.min(screenWidth * 0.8, 400);
          scannerHeight = Math.round(scannerWidth * 0.5);
        }

        setScannerDimensions({ width: scannerWidth, height: scannerHeight });

        // 设置摄像头约束
        const constraints = {
          video: {
            deviceId: selectedCamera.deviceId,
            facingMode: "environment",
            width: 1920,
            height: 1080,
            frameRate: isIPhone ? 15 : isMobile ? 20 : 30,
            focusMode: "continuous",
            exposureMode: "continuous",
            whiteBalanceMode: "continuous",
          },
        };

        console.log("摄像头约束:", constraints);

        // 获取媒体流
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setVideoStream(stream);

        // 检查摄像头能力
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = track.getCapabilities();
          const settings = track.getSettings();
          console.log("摄像头能力:", capabilities);
          console.log("摄像头设置:", settings);

          // 更新调试信息
          setDebugInfo({
            camera: selectedCamera.label,
            resolution: `${settings.width}x${settings.height}`,
            fps: settings.frameRate,
            readerTypes: ["ean_reader"],
          });

          // 检查对焦能力
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
        const container = document.getElementById("quagga-scanner");
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
          frequency: isIPhone ? 8 : isMobile ? 12 : 20,
          debug: {
            drawBoundingBox: true,
            showFrequency: true,
            drawScanline: true,
            showPattern: false,
          },
        };

        console.log("Quagga2 配置:", config);

        // 初始化 Quagga2
        if (!Quagga) {
          console.error("Quagga2 未初始化");
          toast.error("Quagga2 未初始化");
          setIsScanning(false);
          return;
        }

        Quagga.init(config, (err: Error | null) => {
          if (err) {
            console.error("Quagga2 初始化失败:", err);
            toast.error(`初始化失败: ${err.message}`);
            setIsScanning(false);
            return;
          }
          console.log("Quagga2 初始化成功");
          if (Quagga) {
            Quagga.start();
            toast.success("扫描器已启动");
          }
        });

        // 监听扫描结果
        Quagga.onDetected((result) => {
          if (!result.codeResult || !result.codeResult.code) {
            return;
          }

          const code = result.codeResult.code;
          console.log("扫描成功:", code);

          // 避免重复添加相同的结果
          setResults((prev) => {
            if (!prev.includes(code)) {
              return [code, ...prev];
            }
            return prev;
          });

          // 设备震动反馈
          if (navigator.vibrate) {
            navigator.vibrate(200);
          }

          // 成功提示
          toast.success(`扫描成功: ${code}`);

          console.log("扫描完整结果:", result);
        });

        // 监听处理过程
        Quagga.onProcessed((result) => {
          // 可以在这里处理扫描过程中的信息
          if (result && result.codeResult && result.codeResult.code) {
            console.log("处理中的结果:", result.codeResult.code);
          }
        });
      } catch (error) {
        console.error("扫码初始化失败:", error);
        toast.error(
          `扫码初始化失败: ${
            error instanceof Error ? error.message : "未知错误"
          }`
        );
        setIsScanning(false);
      }
    }, 300);
  };

  const stopScanning = () => {
    console.log("停止 Quagga2 扫码测试");
    setIsScanning(false);
    setScannerDimensions(null);
    setDebugInfo({});

    // 停止 Quagga2
    if (Quagga) {
      Quagga.stop();
    }

    // 停止视频流
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }

    toast.info("扫描已停止");
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
    const container = document.getElementById("quagga-scanner");
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
          videoElement.pause();

          setTimeout(async () => {
            try {
              await videoElement.play();
              console.log("对焦完成");
              toast.success("对焦完成");
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

  // 清除结果
  const clearResults = () => {
    setResults([]);
    toast.info("结果已清除");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>📱 Quagga2 扫码测试</span>
            <div className="flex items-center gap-2">
              <Badge variant={isQuaggaReady ? "default" : "secondary"}>
                {isQuaggaReady ? "✅ 已准备" : "⏳ 加载中"}
              </Badge>
              <Badge variant={isScanning ? "destructive" : "outline"}>
                {isScanning ? "🔄 扫描中" : "⏸️ 已停止"}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 摄像头选择 */}
          {isClient && availableCameras.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">📷 选择摄像头</label>
              <Select
                value={selectedCameraId}
                onValueChange={setSelectedCameraId}
                disabled={isScanning}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择摄像头..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCameras.map((camera) => (
                    <SelectItem key={camera.deviceId} value={camera.deviceId}>
                      <div className="flex items-center space-x-2">
                        <span>
                          {camera.label ||
                            `摄像头 ${camera.deviceId.substring(0, 8)}...`}
                        </span>
                        {camera.label.toLowerCase().includes("back") ||
                        camera.label.toLowerCase().includes("rear") ||
                        camera.label.toLowerCase().includes("environment") ? (
                          <Badge variant="secondary" className="text-xs">
                            后置
                          </Badge>
                        ) : camera.label.toLowerCase().includes("front") ||
                          camera.label.toLowerCase().includes("user") ? (
                          <Badge variant="outline" className="text-xs">
                            前置
                          </Badge>
                        ) : null}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLoadingCameras && (
                <p className="text-sm text-gray-500">
                  🔄 正在获取摄像头列表...
                </p>
              )}
            </div>
          )}

          {/* 控制按钮 */}
          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (isScanning) {
                  stopScanning();
                } else {
                  startScanning();
                }
              }}
              variant={isScanning ? "destructive" : "default"}
              disabled={!isQuaggaReady}
              className="flex-1"
            >
              {!isQuaggaReady
                ? "加载中..."
                : isScanning
                ? "停止扫描"
                : "开始扫码"}
            </Button>

            {/* 刷新摄像头按钮 */}
            {!isScanning && (
              <Button
                onClick={getAllCameras}
                variant="outline"
                disabled={isLoadingCameras}
                size="sm"
              >
                {isLoadingCameras ? "🔄" : "📷"}
              </Button>
            )}

            {/* 对焦按钮 */}
            {isScanning && isMobile && canFocus && (
              <Button
                onClick={handleFocus}
                variant="outline"
                disabled={isFocusing}
                size="sm"
              >
                {isFocusing ? "对焦中..." : "🔍 对焦"}
              </Button>
            )}
          </div>

          {/* 扫描区域 */}
          {isClient && isScanning && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div
                id="quagga-scanner"
                ref={scannerRef}
                style={{
                  position: "relative",
                  width: "100%",
                  height: isMobile ? "50vh" : "400px",
                  minHeight: "300px",
                  maxHeight: isMobile ? "60vh" : "500px",
                  overflow: "hidden",
                  backgroundColor: "#000",
                  borderRadius: "8px",
                }}
              />

              {/* 扫描提示 */}
              <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded">
                <p className="font-medium text-blue-800 mb-2">
                  📱 Quagga2 扫码提示：
                </p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>🎯 将条形码水平放置在扫描框中央</li>
                  <li>📏 保持适当距离（15-30cm）</li>
                  <li>💡 确保光线充足，避免反光</li>
                  {isMobile && <li>👆 点击视频区域进行手动对焦</li>}
                  <li>🔄 支持多种条码格式：Code128、EAN、UPC等</li>
                </ul>
              </div>
            </div>
          )}

          {/* 调试信息 */}
          {isClient &&
            (Object.keys(debugInfo).length > 0 ||
              availableCameras.length > 0) && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <p className="font-medium mb-2">🔧 调试信息：</p>
                <div className="grid grid-cols-2 gap-2">
                  {debugInfo.camera && (
                    <div>📷 当前摄像头: {debugInfo.camera}</div>
                  )}
                  {debugInfo.resolution && (
                    <div>📐 分辨率: {debugInfo.resolution}</div>
                  )}
                  {debugInfo.fps && <div>🎬 帧率: {debugInfo.fps}fps</div>}
                  <div>📱 设备: {isMobile ? "移动设备" : "桌面设备"}</div>
                  <div>🔍 对焦: {canFocus ? "支持" : "不支持"}</div>
                  <div>📹 摄像头数量: {availableCameras.length}</div>
                  <div>
                    🌐 用户代理:{" "}
                    {isClient
                      ? navigator.userAgent.substring(0, 30) + "..."
                      : "N/A"}
                  </div>
                </div>
                {debugInfo.readerTypes && (
                  <div className="mt-2">
                    <span className="font-medium">📖 支持格式: </span>
                    <span className="text-xs">
                      {debugInfo.readerTypes.join(", ")}
                    </span>
                  </div>
                )}
                {/* 摄像头列表 */}
                {availableCameras.length > 0 && (
                  <div className="mt-2">
                    <span className="font-medium">📷 可用摄像头: </span>
                    <div className="mt-1 space-y-1">
                      {availableCameras.map((camera, index) => (
                        <div
                          key={camera.deviceId}
                          className="text-xs p-1 bg-white rounded"
                        >
                          <span
                            className={
                              selectedCameraId === camera.deviceId
                                ? "font-semibold text-blue-600"
                                : ""
                            }
                          >
                            {index + 1}.{" "}
                            {camera.label ||
                              `摄像头 ${camera.deviceId.substring(0, 8)}...`}
                          </span>
                          {selectedCameraId === camera.deviceId && (
                            <Badge variant="default" className="ml-2 text-xs">
                              使用中
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
        </CardContent>
      </Card>

      {/* 扫描结果 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>📊 扫描结果 ({results.length})</span>
            {results.length > 0 && (
              <Button onClick={clearResults} variant="outline" size="sm">
                清除结果
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              暂无扫描结果，请开始扫码...
            </p>
          ) : (
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded"
                >
                  <div>
                    <p className="font-medium text-green-800">{result}</p>
                    <p className="text-sm text-green-600">
                      第 {index + 1} 次扫描
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(result);
                      toast.success("已复制到剪贴板");
                    }}
                    variant="outline"
                    size="sm"
                  >
                    复制
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 全局样式 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          #quagga-scanner video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            border-radius: 8px;
            cursor: ${isMobile ? "pointer" : "default"};
          }
          
          /* Quagga2 canvas 样式 */
          #quagga-scanner canvas {
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
            #quagga-scanner video:active {
              transform: scale(0.98);
              transition: transform 0.1s ease;
            }
          }
        `,
        }}
      />
    </div>
  );
}
