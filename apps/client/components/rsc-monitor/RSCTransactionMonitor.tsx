import { InputForm } from "./input-form"
import { TransactionFlowVisualizer } from "./transaction-flow-visualizer"
import { NavigationHeader } from "./navigation-header"

export default function RSCTransactionMonitor() {
  return (
    <div className="space-y-8">
      <NavigationHeader/>
      <InputForm />
      <TransactionFlowVisualizer />
    </div>
  )
}

