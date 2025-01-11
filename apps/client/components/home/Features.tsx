import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"

const FEATURES = [
  {
    title: "Smart Contract Templates",
    description: "Access a library of pre-built, customizable smart contract templates for various use cases."
  },
  {
    title: "Automated Triggers",
    description: "Set up event-based actions for your contracts to respond to on-chain and off-chain events."
  },
  {
    title: "Multi-Chain Deployment",
    description: "Deploy your reactive smart contracts across multiple blockchain networks with ease."
  },
  {
    title: "Real-Time Monitoring",
    description: "Monitor your deployed contracts and automate responses to specific blockchain events."
  },
  {
    title: "Secure Execution",
    description: "Ensure the security of your automated smart contracts with built-in safety checks and best practices."
  },
  {
    title: "Integration Hub",
    description: "Connect your smart contracts to external services and APIs for enhanced functionality."
  },
  {
    title: "Collaborative Workspace",
    description: "Work together with team members on complex smart contract automations in real-time."
  },
  {
    title: "Audit Trail",
    description: "Maintain a comprehensive audit trail of all automated actions and contract interactions."
  }
]

const Features = () => {
  return (
    <section className="py-24 bg-gray-100 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-center mb-12 text-gray-900 dark:text-white">Our Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105 bg-white dark:bg-gray-700 h-full">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-primary">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features