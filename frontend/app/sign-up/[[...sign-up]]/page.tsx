import { SignUp } from '@clerk/nextjs'

type PageProps = {
  params: Promise<{ [key: string]: string[] }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function SignUpPage({ params, searchParams }: PageProps) {
  await params
  if (searchParams) await searchParams

  return (
    <div className="min-h-screen bg-gradient-to-br from-vedya-purple/10 via-white to-vedya-pink/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-vedya-purple to-vedya-pink rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">V</span>
          </div>
          <h1 className="text-2xl font-bold gradient-text mb-2">Join VEDYA</h1>
          <p className="text-gray-600">Create your account and start learning with AI</p>
        </div>
        
        <SignUp 
          appearance={{
            elements: {
              formButtonPrimary: "bg-gradient-to-r from-vedya-purple to-vedya-pink hover:from-vedya-purple/90 hover:to-vedya-pink/90",
              card: "shadow-xl border-0",
              headerTitle: "hidden",
              headerSubtitle: "hidden"
            }
          }}
        />
      </div>
    </div>
  )
}
