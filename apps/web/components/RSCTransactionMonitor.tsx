import { InputForm } from "@/components/input-form"
import { TransactionFlowVisualizer } from "@/components/transaction-flow-visualizer"

export default function Home() {
  return (
    <div className="space-y-8">
      <InputForm />
      <TransactionFlowVisualizer />
    </div>
  )
}

