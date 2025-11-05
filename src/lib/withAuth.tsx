'use client';

import { useEffect, useState, ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';

export function withAuth<T extends { user?: User }>(WrappedComponent: ComponentType<T>) {
  return function WithAuthWrapper(props: Omit<T, 'user'>) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (!firebaseUser) {
          router.replace('/auth');
        } else {
          setUser(firebaseUser);
        }
        setCheckingAuth(false);
      });

      return () => unsubscribe();
    }, [router]);

    if (checkingAuth) {
      return (
        <div className="h-screen flex justify-center items-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
        </div>
      );
    }

    // Pass the user as prop
    return <WrappedComponent {...(props as T)} user={user!} />;
  };
}
