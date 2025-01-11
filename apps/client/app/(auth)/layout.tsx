export default function RootLayout({ children }:Readonly<{children: React.ReactNode;}>) {
  return (
    <main className=" mx-[36%] my-[4%]">
      {children}
    </main>
  )
}