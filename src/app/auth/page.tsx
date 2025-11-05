'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, onAuthStateChanged, sendPasswordResetEmail    } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { ToastContainer, toast } from 'react-toastify';
import { auth } from '@/lib/firebaseConfig';


export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [saving, setSaving] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [errorMsg, setErrorMsg] = useState('');
    const router = useRouter();

    useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/'); // Redirect to home if already logged in
      }
    });

    return () => unsubscribe();
  }, [router]);
  const handleLogin = async () => {
  if (!loginEmail || !loginPassword) {
    toast.error('Please fill in all fields');
    return;
  }

  setLoggingIn(true);
  try {
    const auth = getAuth();

    const userCredential = await toast.promise(
      signInWithEmailAndPassword(auth, loginEmail, loginPassword),
      {
        pending: 'Logging in...',
        success: 'Logged in successfully!',
        error: 'Login unsuccessful',
      }
    );

    const user = userCredential.user;
    console.log('Logged in user:', user);
    router.push('/');
  } catch (error) {
    setErrorMsg((error as any).message);
  } finally {
    setLoggingIn(false);
  }
};

  const handleSignup = async () => {
  setErrorMsg('');

  if (!signupEmail || !signupPassword || !signupConfirmPassword || !signupName) {
    toast.error('Please fill in all fields');
    return;
  }

  if (signupPassword !== signupConfirmPassword) {
    toast.error('Passwords do not match.');
    return;
  }

  setSaving(true);

  try {
    const auth = getAuth();

    const userCredential = await toast.promise(
      createUserWithEmailAndPassword(auth, signupEmail, signupPassword),
      {
        pending: 'Creating account...',
        success: 'Account created!',
        error: 'Account creation failed',
      }
    );

    const user = userCredential.user;

    await updateProfile(user, {
      displayName: signupName,
    });

    // Optional: Success toast after profile update
    toast.success('Profile updated!');
    router.push('/');
  } catch (error: any) {
    setErrorMsg(error.message);
    toast.error(error.message);
  } finally {
    setSaving(false);
  }
};

  const handleForgotPassword = async () => {
  if (!loginEmail.trim()) {
    toast.error("Please enter your email address.");
    return;
  }

  try {
    await toast.promise(
      sendPasswordResetEmail(auth, loginEmail.trim()),
      {
        pending: "Sending password reset email...",
        success: "Password reset email sent!",
        error: "Failed to send reset email",
      }
    );
  } catch (error: any) {
    toast.error(error.message || "An unexpected error occurred.");
  }
};

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-500">
        {/* Logo */}
        <div className="flex justify-center mt-6">
          <Image src="/main-logo.png" alt="Logo" width={100} height={100} className="rounded-full" />
        </div>

        {/* Slide Container */}
        <div className="relative h-[420px] overflow-hidden">
          <div
            className={`absolute inset-0 transform transition-transform duration-500 ${
              isLogin ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* Login Form */}
            <div className="p-6 w-full absolute">
              <h2 className="text-2xl font-bold text-center mb-4">Log In</h2>
              <input type="email" placeholder="Email" className="input" value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}/>
              <input type="password" placeholder="Password" className="input" value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}/>
              <button className="btn bg-sky-500 hover:bg-sky-700" onClick={handleLogin} disabled={loggingIn}>{loggingIn ? 'Logging In...' : 'Log In'}</button>
              {errorMsg && <p className="text-red-600 mt-2 text-sm">{errorMsg}</p>}
              <p
  className="text-sm text-blue-500 hover:underline text-center mt-2 cursor-pointer"
  onClick={handleForgotPassword}
>
  Forgot Password?
</p>
              <p
                className="text-blue-600 text-center mt-4 cursor-pointer"
                onClick={() => setIsLogin(false)}
              >
                or Sign Up
              </p>
            </div>
          </div>

          <div
            className={`absolute inset-0 transform transition-transform duration-500 ${
              isLogin ? 'translate-x-full' : 'translate-x-0'
            }`}
          >
            {/* Signup Form */}
            <div className="p-6 w-full absolute">
              <h2 className="text-2xl font-bold text-center mb-4">Sign Up</h2>
              <input type="text" placeholder="Name" className="input" value={signupName} onChange={(e) => setSignupName(e.target.value)} />
              <input type="email" placeholder="Email" className="input" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)}/>
              <input type="password" placeholder="Password" className="input" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)}/>
              <input
                type="password"
                placeholder="Confirm Password"
                className="input"
                value={signupConfirmPassword}
                onChange={(e) => setSignupConfirmPassword(e.target.value)}
              />
              <button className="btn bg-sky-500 hover:bg-sky-700" onClick={handleSignup} disabled={saving}>{saving ? 'Signing Up...': 'Sign Up'}</button>
              <p
                className="text-blue-600 text-center mt-4 cursor-pointer"
                onClick={() => setIsLogin(true)}
              >
                or Log In
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Styles (optional extract to globals.css) */}
      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.75rem;
          margin-top: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 0.5rem;
          display: block;
        }
        .btn {
          width: 100%;
        //   background-color: #3b82f6;
          color: white;
          padding: 0.75rem;
          margin-top: 1rem;
          border-radius: 0.5rem;
        }
      `}</style>
    </div>
  );
}
