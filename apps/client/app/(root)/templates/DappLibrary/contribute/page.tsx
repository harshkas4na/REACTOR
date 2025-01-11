import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ContributePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Contribute Template</CardTitle>
            <CardDescription>
              Share your DApp automation implementation with the community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-8">
              <BasicDetails />
              <ImplementationDetails />
              <CodeSubmission />
              <SecurityConsiderations />
              <PerformanceMetrics />
              <AuthorInformation />
              <div className="flex justify-end gap-4">
                <Button variant="outline">Save Draft</Button>
                <Button>Submit for Review</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const BasicDetails = () => (
  <div className="space-y-4">
    <h2 className="text-lg font-semibold">Basic Details</h2>
    <div className="space-y-2">
      <Label htmlFor="title">Template Title</Label>
      <Input id="title" placeholder="Enter a descriptive title for your template" />
    </div>
    <div className="space-y-2">
      <Label htmlFor="description">Description</Label>
      <Textarea id="description" placeholder="Provide a brief description of what your template does" />
    </div>
    <div className="space-y-2">
      <Label htmlFor="architecture-type">Architecture Type</Label>
      <Select>
        <SelectTrigger id="architecture-type">
          <SelectValue placeholder="Select architecture type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem  value="liveData">Live Data</SelectItem>
          <SelectItem value="crossDapp">Cross-DApp</SelectItem>
          <SelectItem value="crossChain">Cross-Chain</SelectItem>
          <SelectItem value="external">External Integration</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
)

const ImplementationDetails = () => (
  <div className="space-y-4">
    <h2 className="text-lg font-semibold">Implementation Details</h2>
    <div className="space-y-2">
      <Label htmlFor="target-dapps">Target DApps</Label>
      <Input id="target-dapps" placeholder="e.g., Uniswap, Aave, Compound" />
    </div>
    <div className="space-y-2">
      <Label htmlFor="chains">Supported Chains</Label>
      <Input id="chains" placeholder="e.g., Ethereum, Polygon, Arbitrum" />
    </div>
    {/* Add more implementation details fields as needed */}
  </div>
)

const CodeSubmission = () => (
  <div className="space-y-4">
    <h2 className="text-lg font-semibold">Code Submission</h2>
    <div className="space-y-2">
      <Label htmlFor="code">Template Code</Label>
      <Textarea id="code" placeholder="Paste your template code here" className="font-mono" rows={10} />
    </div>
    {/* Add options for file upload or GitHub repo link if needed */}
  </div>
)

const SecurityConsiderations = () => (
  <div className="space-y-4">
    <h2 className="text-lg font-semibold">Security Considerations</h2>
    <div className="space-y-2">
      <Label htmlFor="security-measures">Security Measures</Label>
      <Textarea id="security-measures" placeholder="Describe the security measures implemented in your template" />
    </div>
    {/* Add more security-related fields as needed */}
  </div>
)

const PerformanceMetrics = () => (
  <div className="space-y-4">
    <h2 className="text-lg font-semibold">Performance Metrics</h2>
    <div className="space-y-2">
      <Label htmlFor="gas-cost">Estimated Gas Cost</Label>
      <Input id="gas-cost" placeholder="e.g., 0.005 ETH" />
    </div>
    <div className="space-y-2">
      <Label htmlFor="success-rate">Expected Success Rate</Label>
      <Input id="success-rate" placeholder="e.g., 98%" />
    </div>
    {/* Add more performance-related fields as needed */}
  </div>
)

const AuthorInformation = () => (
  <div className="space-y-4">
    <h2 className="text-lg font-semibold">Author Information</h2>
    <div className="space-y-2">
      <Label htmlFor="author-name">Your Name</Label>
      <Input id="author-name" placeholder="Enter your name or pseudonym" />
    </div>
    <div className="space-y-2">
      <Label htmlFor="author-contact">Contact Information (optional)</Label>
      <Input id="author-contact" placeholder="Email or other contact method" />
    </div>
  </div>
)