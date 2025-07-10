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

export default function ProductSearch() {
  const { getProductByBarcode } = useProducts();
  const [barcode, setBarcode] = useState("");
  const [searchResult, setSearchResult] = useState<Product | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);

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
    if (!scannerRef.current) return;

    setIsScanning(true);

    const html5QrCodeScanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    html5QrCodeScanner.render(
      (decodedText) => {
        setBarcode(decodedText);
        handleSearch(decodedText);
        stopScanning();
      },
      (errorMessage) => {
        console.log("Scanning error:", errorMessage);
      }
    );

    setScanner(html5QrCodeScanner);
  };

  const stopScanning = () => {
    if (scanner) {
      scanner.clear();
      setScanner(null);
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.clear();
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
        <div className="flex space-x-2">
          <div className="flex-1">
            <Label htmlFor="search-barcode">条形码</Label>
            <Input
              id="search-barcode"
              placeholder="输入条形码或扫描"
              value={barcode}
              onChange={(e) => handleInputChange(e.target.value)}
            />
          </div>
          <div className="flex flex-col justify-end">
            <Button
              onClick={isScanning ? stopScanning : startScanning}
              variant={isScanning ? "destructive" : "default"}
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
            <p className="text-center text-gray-500">请输入条形码进行查询</p>
          ) : searchResult ? (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{searchResult.name}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">进货价</p>
                  <p className="font-medium">
                    ¥{searchResult.purchasePrice.toFixed(2)}
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
      </CardContent>
    </Card>
  );
}
