'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Gem, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useCompany } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const { data: company } = useCompany();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const companyName = company?.companyName ?? 'AURA GEM ERP';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      router.push('/dashboard');
    } catch (e: any) {
      toast.error(e?.message ?? 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[hsl(219,52%,11%)] p-12 lg:flex">
        <div className="absolute -left-32 -top-32 h-96 w-96 animate-float rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-[28rem] w-[28rem] animate-float rounded-full bg-indigo-500/15 blur-3xl [animation-delay:-3.5s]" />
        {/* faint blueprint grid for depth */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,180,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,180,255,0.05) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse 90% 70% at 50% 40%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 40%, black, transparent)',
          }}
        />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-700 shadow-xl shadow-blue-900/50">
            <Gem className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-wide text-white">{companyName}</div>
            <div className="text-[11px] font-medium uppercase tracking-widest text-blue-200/60">
              Gemstone Resource Planning
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative"
        >
          <h1 className="max-w-lg text-4xl font-semibold leading-tight text-white">
            Every stone. Every stage.
            <br />
            <span className="bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">
              Fully traceable.
            </span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-blue-100/70">
            From the mines of Ratnapura to buyers around the world — manage purchasing, splitting, heat
            treatment, cutting, certification, export and profit in one premium platform.
          </p>
        </motion.div>

        <div className="relative text-xs text-blue-200/40">
          © {new Date().getFullYear()} {companyName} · Powered by AURA GEM ERP
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-background p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-700">
                <Gem className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold">{companyName}</span>
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your workspace to continue.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@company.lk" className="pl-9" {...register('email')} />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" className="pl-9" {...register('password')} />
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Access is provisioned by your administrator.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
