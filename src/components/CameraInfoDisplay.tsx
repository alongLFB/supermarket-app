"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CameraInfo {
  deviceId: string;
  label: string;
  kind: string;
  capabilities?: MediaTrackCapabilities;
  settings?: MediaTrackSettings;
}

export default function CameraInfoDisplay() {
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testStreams, setTestStreams] = useState<{
    [key: string]: MediaStream;
  }>({});

  // 获取摄像头列表
  const getCameras = async () => {
    try {
      setIsLoading(true);

      // 先请求权限
      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      tempStream.getTracks().forEach((track) => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      console.log("检测到的摄像头设备:", videoDevices);

      const cameraInfos: CameraInfo[] = await Promise.all(
        videoDevices.map(async (device) => {
          let capabilities;
          let settings;

          try {
            // 尝试获取每个摄像头的详细信息
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: device.deviceId },
            });

            const track = stream.getVideoTracks()[0];
            if (track) {
              capabilities = track.getCapabilities();
              settings = track.getSettings();
            }

            stream.getTracks().forEach((track) => track.stop());
          } catch (error) {
            console.log(`获取摄像头 ${device.deviceId} 信息失败:`, error);
          }

          return {
            deviceId: device.deviceId,
            label:
              device.label || `摄像头 ${device.deviceId.substring(0, 8)}...`,
            kind: device.kind,
            capabilities,
            settings,
          };
        })
      );

      setCameras(cameraInfos);
      toast.success(`发现 ${cameraInfos.length} 个摄像头`);
    } catch (error) {
      console.error("获取摄像头列表失败:", error);
      toast.error("无法获取摄像头列表");
    } finally {
      setIsLoading(false);
    }
  };

  // 测试摄像头
  const testCamera = async (deviceId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId },
      });

      setTestStreams((prev) => ({
        ...prev,
        [deviceId]: stream,
      }));

      toast.success("摄像头测试成功");
    } catch (error) {
      console.error("摄像头测试失败:", error);
      toast.error("摄像头测试失败");
    }
  };

  // 停止测试
  const stopTest = (deviceId: string) => {
    const stream = testStreams[deviceId];
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setTestStreams((prev) => {
        const newStreams = { ...prev };
        delete newStreams[deviceId];
        return newStreams;
      });
    }
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      Object.values(testStreams).forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });
    };
  }, [testStreams]);

  // 获取摄像头类型
  const getCameraType = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (
      lowerLabel.includes("back") ||
      lowerLabel.includes("rear") ||
      lowerLabel.includes("environment")
    ) {
      return "后置";
    } else if (
      lowerLabel.includes("front") ||
      lowerLabel.includes("user") ||
      lowerLabel.includes("facing")
    ) {
      return "前置";
    }
    return "未知";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>📷 摄像头信息</span>
          <Button onClick={getCameras} disabled={isLoading} size="sm">
            {isLoading ? "🔄 获取中..." : "🔍 检测摄像头"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {cameras.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>点击&quot;检测摄像头&quot;按钮获取摄像头信息</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cameras.map((camera, index) => (
              <div
                key={camera.deviceId}
                className="border rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">摄像头 {index + 1}</span>
                    <Badge variant="secondary">
                      {getCameraType(camera.label)}
                    </Badge>
                  </div>
                  <div className="flex space-x-2">
                    {testStreams[camera.deviceId] ? (
                      <Button
                        onClick={() => stopTest(camera.deviceId)}
                        variant="destructive"
                        size="sm"
                      >
                        停止测试
                      </Button>
                    ) : (
                      <Button
                        onClick={() => testCamera(camera.deviceId)}
                        variant="outline"
                        size="sm"
                      >
                        测试
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700">基本信息</p>
                    <p>📷 名称: {camera.label}</p>
                    <p>🆔 ID: {camera.deviceId.substring(0, 20)}...</p>
                    <p>📱 类型: {getCameraType(camera.label)}</p>
                  </div>

                  <div>
                    <p className="font-medium text-gray-700">技术参数</p>
                    {camera.capabilities && (
                      <>
                        <p>
                          📐 分辨率: {camera.capabilities.width?.max || "N/A"} x{" "}
                          {camera.capabilities.height?.max || "N/A"}
                        </p>
                        <p>
                          🎬 帧率: {camera.capabilities.frameRate?.max || "N/A"}{" "}
                          fps
                        </p>
                        <p>
                          🔍 对焦:{" "}
                          {(
                            camera.capabilities as MediaTrackCapabilities & {
                              focusMode?: string[];
                            }
                          ).focusMode
                            ? "支持"
                            : "不支持"}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {camera.capabilities && (
                  <div className="mt-3 p-2 bg-white rounded text-xs">
                    <p className="font-medium mb-1">🛠️ 完整能力:</p>
                    <pre className="text-gray-600 overflow-x-auto">
                      {JSON.stringify(camera.capabilities, null, 2)}
                    </pre>
                  </div>
                )}

                {testStreams[camera.deviceId] && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-2">📹 实时预览:</p>
                    <video
                      ref={(video) => {
                        if (video && testStreams[camera.deviceId]) {
                          video.srcObject = testStreams[camera.deviceId];
                          video.play();
                        }
                      }}
                      className="w-full max-w-md h-48 object-cover rounded border"
                      autoPlay
                      muted
                      playsInline
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
