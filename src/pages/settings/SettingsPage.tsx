import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Settings, MapPin, User } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProfile } from '@/hooks/useProfile'
import { toast } from '@/hooks/useToast'
import { useSubscription } from '@/context/SubscriptionContext'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

const farmSchema = z.object({
  farm_name: z.string().min(2, 'Farm name is required'),
  farm_no: z.string().optional(),
  ggn: z.string().optional(),
  origin: z.string().optional(),
  farm_lat: z.coerce.number().min(-90).max(90).optional().nullable(),
  farm_lng: z.coerce.number().min(-180).max(180).optional().nullable(),
})
type FarmFormData = z.infer<typeof farmSchema>

const accountSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
})
type AccountFormData = z.infer<typeof accountSchema>

export default function SettingsPage() {
  const { profile, isLoading, updateProfile } = useProfile()
  const { subscription } = useSubscription()
  const { user } = useAuth()

  const farmForm = useForm<FarmFormData>({ resolver: zodResolver(farmSchema) as never })
  const accountForm = useForm<AccountFormData>({ resolver: zodResolver(accountSchema) as never })

  useEffect(() => {
    if (!profile) return
    farmForm.reset({
      farm_name: profile.farm_name,
      farm_no: profile.farm_no ?? '',
      ggn: profile.ggn ?? '',
      origin: profile.origin ?? '',
      farm_lat: profile.farm_lat,
      farm_lng: profile.farm_lng,
    })
    accountForm.reset({
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
    })
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const onFarmSubmit = async (data: FarmFormData) => {
    try {
      await updateProfile.mutateAsync(data)
      toast({ title: 'Farm profile saved' })
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' })
    }
  }

  const onAccountSubmit = async (data: AccountFormData) => {
    try {
      await updateProfile.mutateAsync(data)
      toast({ title: 'Account saved' })
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' })
    }
  }

  const handleManageBilling = async () => {
    if (!subscription?.stripe_customer_id) return
    const { data, error } = await supabase.functions.invoke('create-portal-session')
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    window.location.href = data.url
  }

  return (
    <PageContainer className="max-w-2xl">
      <PageHeader title="Settings" description="Manage your farm profile and billing" />

      <div className="space-y-6">
        {/* Farm Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-pomona-green" /> Farm Profile
            </CardTitle>
            <CardDescription>Your farm details used across the app</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={farmForm.handleSubmit(onFarmSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Farm name *</Label>
                  <Input {...farmForm.register('farm_name')} placeholder="Green Valley Farm" disabled={isLoading} />
                  {farmForm.formState.errors.farm_name && <p className="text-xs text-destructive">{farmForm.formState.errors.farm_name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Farm registration number</Label>
                  <Input {...farmForm.register('farm_no')} placeholder="e.g. 12345678" disabled={isLoading} />
                </div>
                <div className="space-y-1.5">
                  <Label>GGN (GlobalG.A.P. Number)</Label>
                  <Input {...farmForm.register('ggn')} placeholder="e.g. 4049928500015" disabled={isLoading} />
                </div>
                <div className="space-y-1.5">
                  <Label>Origin (country)</Label>
                  <Input {...farmForm.register('origin')} placeholder="e.g. Serbia" disabled={isLoading} />
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-pomona-green" />
                  <span className="text-sm font-medium">Farm Location</span>
                  <span className="text-xs text-muted-foreground">(used for Map & Weather)</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Latitude</Label>
                    <Input {...farmForm.register('farm_lat')} type="number" step="0.000001" placeholder="e.g. 44.786" />
                    {farmForm.formState.errors.farm_lat && <p className="text-xs text-destructive">{farmForm.formState.errors.farm_lat.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Longitude</Label>
                    <Input {...farmForm.register('farm_lng')} type="number" step="0.000001" placeholder="e.g. 20.448" />
                    {farmForm.formState.errors.farm_lng && <p className="text-xs text-destructive">{farmForm.formState.errors.farm_lng.message}</p>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Find your coordinates on <a href="https://www.openstreetmap.org" target="_blank" rel="noreferrer" className="text-pomona-green underline">openstreetmap.org</a>
                </p>
              </div>

              <Button type="submit" className="bg-pomona-green hover:bg-pomona-green/90" disabled={farmForm.formState.isSubmitting || !farmForm.formState.isDirty}>
                {farmForm.formState.isSubmitting ? 'Saving…' : 'Save changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-pomona-green" /> Account
            </CardTitle>
            <CardDescription>Your personal information and billing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>First name</Label>
                  <Input {...accountForm.register('first_name')} placeholder="Jane" disabled={isLoading} />
                </div>
                <div className="space-y-1.5">
                  <Label>Last name</Label>
                  <Input {...accountForm.register('last_name')} placeholder="Smith" disabled={isLoading} />
                </div>
              </div>
              <Button type="submit" className="bg-pomona-green hover:bg-pomona-green/90" disabled={accountForm.formState.isSubmitting || !accountForm.formState.isDirty}>
                {accountForm.formState.isSubmitting ? 'Saving…' : 'Save changes'}
              </Button>
            </form>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              {subscription?.stripe_customer_id && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Billing</p>
                    <p className="text-sm text-muted-foreground capitalize">{subscription.tier} plan · {subscription.status}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleManageBilling}>Manage billing</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
