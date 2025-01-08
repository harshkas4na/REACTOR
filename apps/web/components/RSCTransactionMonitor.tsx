import { InputForm } from "@/components/input-form"
import { TransactionFlowVisualizer } from "@/components/transaction-flow-visualizer"
import { NavigationHeader } from "./navigation-header"

export default function Home() {
  return (
    <div className="space-y-8">
      <NavigationHeader/>
      <InputForm />
      <TransactionFlowVisualizer />
    </div>
  )
}

