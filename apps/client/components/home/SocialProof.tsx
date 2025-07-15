import { Shield, Zap, Layers, Globe } from 'lucide-react'

const stats = [
  { name: 'Positions Automated', value: '1,320+', icon: Shield },
  { name: 'Total Value Automated', value: '$396M+', icon: Zap },
  { name: 'Protocols Integrated', value: '8', icon: Layers },
  { name: 'Networks Supported', value: '4', icon: Globe },
]

export default function SocialProof() {
  return (
    <section className='relative' aria-labelledby="social-proof-heading">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <div className="grid grid-cols-1 items-center gap-y-16 gap-x-8 lg:grid-cols-2">
            <div>
              <h2
                id="social-proof-heading"
                className="text-4xl font-bold tracking-tight sm:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary"
              >
                Trusted by the Best in DeFi.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Our battle-tested infrastructure automates millions in value across the most popular protocols and networks, giving you peace of mind.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {stats.map((stat) => (
                <div
                  key={stat.name}
                  className="flex flex-col-reverse gap-y-2 border-l-4 border-primary/50 pl-6"
                >
                  <dt className="text-base leading-7 text-muted-foreground">{stat.name}</dt>
                  <dd className="text-4xl font-semibold tracking-tight text-foreground">{stat.value}</dd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}