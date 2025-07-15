// Quagga2 类型定义
declare module "@ericblade/quagga2" {
  export interface QuaggaJSConfigObject {
    inputStream: {
      name: string;
      type: string;
      target: HTMLVideoElement;
      constraints: MediaStreamConstraints["video"];
    };
    decoder: {
      readers: string[];
    };
    locate: boolean;
    locator: {
      patchSize: string;
      halfSample: boolean;
    };
    numOfWorkers: number;
    frequency: number;
    debug: {
      drawBoundingBox: boolean;
      showFrequency: boolean;
      drawScanline: boolean;
      showPattern: boolean;
    };
  }

  export interface QuaggaJSResultObject {
    codeResult: {
      code: string | null;
    };
  }

  export interface QuaggaJSStatic {
    init: (
      config: QuaggaJSConfigObject,
      callback: (err: Error | null) => void
    ) => void;
    start: () => void;
    stop: () => void;
    onDetected: (callback: (result: QuaggaJSResultObject) => void) => void;
    onProcessed: (callback: (result: QuaggaJSResultObject) => void) => void;
  }

  const Quagga: QuaggaJSStatic;
  export default Quagga;
}
