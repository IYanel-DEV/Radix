'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiError, apiPost } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await apiPost('/api/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent to your email');
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-white/5 bg-[#0B0A0F]/80 backdrop-blur-xl p-8 shadow-2xl"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white neon-text">Reset password</h2>
        <p className="text-sm text-slate-400 mt-1">
          {sent ? 'Check your email for the reset link' : "Enter your email and we'll send you a reset link"}
        </p>
      </div>

      {sent ? (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-radix-500/10">
            <Mail className="h-6 w-6 text-radix-400" />
          </div>
          <p className="text-sm text-slate-400 mb-6">
            If an account exists with that email, you will receive a password reset link shortly.
          </p>
          <Link href="/login">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to login
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
          <p className="text-center">
            <Link href="/login" className="text-sm text-radix-400 hover:text-radix-300 transition-colors">
              <ArrowLeft className="h-4 w-4 inline mr-1" />
              Back to login
            </Link>
          </p>
        </form>
      )}
    </motion.div>
  );
}
