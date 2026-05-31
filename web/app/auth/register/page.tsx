'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Zap, Users, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const schema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  accountType: z.enum(['player', 'venue']),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { accountType: 'player' },
  });

  const accountType = watch('accountType');

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { username: data.username, account_type: data.accountType },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        username: data.username,
        account_type: data.accountType,
      });
    }

    toast.success('Account created! Welcome to MatchD.');
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading font-bold text-2xl text-text">MatchD</span>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8">
          <h1 className="font-heading font-bold text-2xl text-text mb-2">Create account</h1>
          <p className="text-text-muted text-sm mb-6">Join MatchD to find and create matches</p>

          {/* Account type selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setValue('accountType', 'player')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                ${accountType === 'player' ? 'border-brand bg-brand/10' : 'border-border hover:border-text-muted'}`}
            >
              <Users className={`w-6 h-6 ${accountType === 'player' ? 'text-brand' : 'text-text-muted'}`} />
              <span className={`text-sm font-medium ${accountType === 'player' ? 'text-brand' : 'text-text-muted'}`}>
                Player
              </span>
            </button>
            <button
              type="button"
              onClick={() => setValue('accountType', 'venue')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                ${accountType === 'venue' ? 'border-brand bg-brand/10' : 'border-border hover:border-text-muted'}`}
            >
              <Building2 className={`w-6 h-6 ${accountType === 'venue' ? 'text-brand' : 'text-text-muted'}`} />
              <span className={`text-sm font-medium ${accountType === 'venue' ? 'text-brand' : 'text-text-muted'}`}>
                Venue
              </span>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <Input
              label="Username"
              placeholder="your_username"
              error={errors.username?.message}
              {...register('username')}
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-brand hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
