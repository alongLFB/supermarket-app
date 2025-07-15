import Quagga2Test from "@/components/Quagga2Test";
import CameraInfoDisplay from "@/components/CameraInfoDisplay";

export default function TestPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Quagga2 扫码测试</h1>
      <Quagga2Test />
      <CameraInfoDisplay />
    </div>
  );
}
