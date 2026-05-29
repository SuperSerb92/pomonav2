import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import logoGreen from '@/assets/logo-green.png'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { toast } from '@/hooks/useToast'

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  farmName: z.string().min(2, 'Farm name is required'),
  farmNo: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
  })

  const onSubmit = async (data: FormData) => {
    try {
      await signUp(data.email, data.password, data.farmName, data.firstName, data.lastName, data.farmNo)
      toast({ title: 'Account created!', description: 'Check your email to confirm your account.', variant: 'success' as never })
      navigate('/login')
    } catch (err) {
      toast({ title: 'Registration failed', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pomona-lavender-50 via-violet-100/50 to-purple-200/40 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src={logoGreen} alt="Pomona" className="h-16 w-16 rounded-2xl shadow-lg shadow-pomona-lavender/40" />
          <div className="text-center">
            <h1 className="text-2xl font-bold">Create your farm account</h1>
            <p className="text-sm text-muted-foreground">Start managing your farm for free</p>
          </div>
        </div>

        <Card className="shadow-xl border border-pomona-lavender-200/60">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Register</CardTitle>
            <CardDescription>Fill in your details to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name *</Label>
                  <Input id="firstName" placeholder="John" {...register('firstName')} />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name *</Label>
                  <Input id="lastName" placeholder="Doe" {...register('lastName')} />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmName">Farm name *</Label>
                <Input id="farmName" placeholder="Green Valley Farm" {...register('farmName')} />
                {errors.farmName && <p className="text-xs text-destructive">{errors.farmName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmNo">Farm registration number</Label>
                <Input id="farmNo" placeholder="e.g. 12345678" {...register('farmNo')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full bg-pomona-green hover:bg-pomona-green/90" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account…' : 'Create account'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-pomona-green hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
