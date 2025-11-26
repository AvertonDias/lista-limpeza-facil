"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Loader from '@/components/Loader';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard'); 
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return <Loader />;
}
