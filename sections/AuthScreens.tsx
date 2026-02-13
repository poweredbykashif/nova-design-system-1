
import React, { useState } from 'react';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { Checkbox } from '../components/Selection';
import { supabase } from '../lib/supabase';
import { addToast } from '../components/Toast';

interface AuthProps {
  onToggle: () => void;
  onSuccess: () => void;
}

export const SignInScreen: React.FC<AuthProps> = ({ onToggle, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        console.error('Sign In Error:', error);
        throw error;
      }

      addToast({
        type: 'success',
        title: 'Welcome Back',
        message: 'You have successfully signed in.',
      });
      onSuccess();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Sign In Failed',
        message: error.message || 'Check your credentials and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-xl bg-surface-card bg-surface-overlay/20 border border-surface-border p-10 rounded-3xl shadow-2xl mx-auto animate-in fade-in zoom-in-95 duration-500 overflow-hidden group">
      {/* Diagonal Metallic Shine Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] pointer-events-none z-10" />

      {/* Center-weighted Shadow Depth Falloff */}
      <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4/5 h-12 [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] pointer-events-none z-0">
        <div className="w-full h-full shadow-[0_12px_32px_-8px_rgba(0,0,0,0.9)] opacity-80" />
      </div>

      <div className="relative z-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-gray-400">Enter your credentials to access your dashboard.</p>
        </div>

        <form className="space-y-6" onSubmit={handleSignIn}>
          <Input
            label="Email Address"
            variant="metallic"
            type="email"
            placeholder="name@company.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div>
            <div className="flex justify-between items-center mb-1 pr-1">
              <label className="text-sm font-medium text-gray-400 ml-1">Password</label>
              <a href="#" className="text-xs text-brand-primary hover:underline">Forgot password?</a>
            </div>
            <Input
              type="password"
              variant="metallic"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Checkbox
            label="Keep me Signed In"
            variant="recessed"
            checked={keepSignedIn}
            onChange={setKeepSignedIn}
          />

          <Button
            variant="metallic"
            className="w-full py-4 text-base"
            type="submit"
            loading={loading}
          >
            Sign In
          </Button>
        </form>

        <div className="mt-8 pt-8 border-t border-surface-border text-center">
          <p className="text-sm text-gray-500">
            New to the platform? <button onClick={onToggle} className="text-brand-primary font-bold hover:underline bg-transparent border-none p-0">Create an account</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export const SignUpScreen: React.FC<AuthProps> = ({ onToggle, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      addToast({
        type: 'error',
        title: 'Passwords Mismatch',
        message: 'Please make sure your passwords match.',
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          }
        }
      });

      if (error) {
        console.error('Sign Up Error:', error);
        throw error;
      }

      if (data.session) {
        addToast({
          type: 'success',
          title: 'Account Created',
          message: 'Welcome to CodesLogic! Let\'s set up your profile.',
        });
        onSuccess();
      } else {
        try {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim(),
          });
          if (signInError) throw signInError;
          onSuccess();
        } catch (signInErr) {
          addToast({
            type: 'info',
            title: 'Verification Needed',
            message: 'Your account was created, but please sign in manually to continue.',
          });
          onToggle();
        }
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Sign Up Failed',
        message: error.message || 'An error occurred during sign up.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-xl bg-surface-card bg-surface-overlay/20 border border-surface-border p-10 rounded-3xl shadow-2xl mx-auto animate-in fade-in zoom-in-95 duration-500 overflow-hidden group">
      {/* Diagonal Metallic Shine Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] pointer-events-none z-10" />

      {/* Center-weighted Shadow Depth Falloff */}
      <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4/5 h-12 [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] pointer-events-none z-0">
        <div className="w-full h-full shadow-[0_12px_32px_-8px_rgba(0,0,0,0.9)] opacity-80" />
      </div>

      <div className="relative z-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">Join CodesLogic</h2>
        </div>

        <form className="space-y-6" onSubmit={handleSignUp}>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              variant="metallic"
              placeholder="Alex"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Last Name"
              variant="metallic"
              placeholder="Rivier"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <Input
            label="Work Email"
            variant="metallic"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Create Password"
            variant="metallic"
            type="password"
            placeholder="Min 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm Password"
            variant="metallic"
            type="password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            success={confirmPassword !== '' && confirmPassword === password}
            helperText={confirmPassword !== '' && confirmPassword === password ? 'Password matched' : undefined}
            required
          />

          <p className="text-[11px] text-gray-500 leading-relaxed text-center px-4">
            By signing up, you agree to our <a href="#" className="text-white hover:underline">Terms of Service</a> and <a href="#" className="text-white hover:underline">Privacy Policy</a>.
          </p>

          <Button
            variant="metallic"
            className="w-full py-4 text-base"
            type="submit"
            loading={loading}
          >
            Create Account
          </Button>
        </form>

        <div className="mt-8 pt-8 border-t border-surface-border text-center">
          <p className="text-sm text-gray-500">
            Already have an account? <button onClick={onToggle} className="text-brand-primary font-bold hover:underline bg-transparent border-none p-0">Sign In</button>
          </p>
        </div>
      </div>
    </div>
  );
};
