// 'use client'

// import { useState } from 'react'
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// import AutomationType from './steps/AutomationType'
// import ProtocolSelection from './steps/ProtocolSelection'
// import ContractConfiguration from './steps/ContractConfiguration'
// import EventFunctionMapping from './steps/EventFunctionMapping'
// import ParameterConfiguration from './steps/ParameterConfiguration'
// import LogicConfiguration from './steps/LogicConfiguration'
// import DeploymentOptions from './steps/DeploymentOptions'
// import { useAutomationStore } from '@/lib/stores/automationStore'

// const steps = [
//   { id: 'type', title: 'Automation Type' },
//   { id: 'protocols', title: 'Protocol Selection' },
//   { id: 'contracts', title: 'Contract Configuration' },
//   { id: 'mapping', title: 'Event/Function Mapping' },
//   { id: 'parameters', title: 'Parameter Configuration' },
//   { id: 'logic', title: 'Logic Configuration' },
//   { id: 'deployment', title: 'Deployment Options' },
// ]

// export default function AutomationCreator() {
//   const [currentStep, setCurrentStep] = useState('type')
//   const { automationConfig } = useAutomationStore()

//   const handleStepComplete = (nextStep: string) => {
//     setCurrentStep(nextStep)
//   }

//   return (
//     <div className="space-y-6">
//       <h1 className="text-3xl font-bold tracking-tight">Create Automation</h1>
//       <Card>
//         <CardHeader>
//           <CardTitle>Automation Setup</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <Tabs value={currentStep} onValueChange={setCurrentStep}>
//             <TabsList className="grid w-full grid-cols-7">
//               {steps.map((step) => (
//                 <TabsTrigger key={step.id} value={step.id} disabled={!automationConfig.type}>
//                   {step.title}
//                 </TabsTrigger>
//               ))}
//             </TabsList>
//             <TabsContent value="type">
//               <AutomationType onComplete={() => handleStepComplete('protocols')} />
//             </TabsContent>
//             <TabsContent value="protocols">
//               <ProtocolSelection onComplete={() => handleStepComplete('contracts')} />
//             </TabsContent>
//             <TabsContent value="contracts">
//               <ContractConfiguration onComplete={() => handleStepComplete('mapping')} />
//             </TabsContent>
//             <TabsContent value="mapping">
//               <EventFunctionMapping onComplete={() => handleStepComplete('parameters')} />
//             </TabsContent>
//             <TabsContent value="parameters">
//               <ParameterConfiguration onComplete={() => handleStepComplete('logic')} />
//             </TabsContent>
//             <TabsContent value="logic">
//               <LogicConfiguration onComplete={() => handleStepComplete('deployment')} />
//             </TabsContent>
//             <TabsContent value="deployment">
//               <DeploymentOptions />
//             </TabsContent>
//           </Tabs>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }

