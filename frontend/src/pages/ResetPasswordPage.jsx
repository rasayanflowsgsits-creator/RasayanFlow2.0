import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import useAuthStore from '../store/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const resetPassword = useAuthStore((state) => state.resetPassword);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setMessage('');

    if (!token) {
      setError('Invalid or missing password reset link.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetPassword({
        token,
        newPassword,
      });

      setMessage(
        response?.message ||
          'Password reset successfully. Please log in with your new password.'
      );

      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        navigate('/login', {
          state: {
            message: 'Password reset successfully. Please log in with your new password.',
          },
        });
      }, 2000);
    } catch (err) {
      setError(err.message || 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='relative grid min-h-screen place-items-center overflow-hidden bg-[#eef1e6] px-4 dark:bg-[#141811]'>
      <div
        className='absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50 dark:opacity-50'
        style={{ backgroundImage: "url('/team/Sgsits.avif')" }}
        aria-hidden='true'
      />

      <div className='relative w-full max-w-md rounded-3xl border border-[#d9e1ca]/80 bg-[#fffef8]/90 p-8 shadow-soft backdrop-blur-sm dark:border-[#414a33] dark:bg-[#20251a]/88'>
        <div className='mb-6'>
          <Link
            to='/login'
            className='mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#71805a] hover:text-[#556b2f] dark:text-[#c5d0b5]'
          >
            <ArrowLeft size={15} />
            Back to Login
          </Link>

          <h1 className='text-2xl font-black text-[#3c4e23] dark:text-[#eef4e8]'>
            Reset Password
          </h1>

          <p className='mt-1 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5]'>
            Enter your new password below.
          </p>
        </div>

        <form className='space-y-4' onSubmit={handleSubmit}>
          <Input
            label='New Password'
            type='password'
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder='Enter new password'
            minLength={6}
            required
            disabled={isSubmitting}
          />

          <Input
            label='Confirm New Password'
            type='password'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder='Confirm new password'
            minLength={6}
            required
            disabled={isSubmitting}
          />

          {message && (
            <div className='flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'>
              <CheckCircle size={16} className='mt-0.5 shrink-0' />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className='flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300'>
              <AlertCircle size={16} className='mt-0.5 shrink-0' />
              <span>{error}</span>
            </div>
          )}

          <Button
            type='submit'
            className='w-full flex items-center justify-center gap-2 font-black'
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin' />
                <span>Resetting...</span>
              </>
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>

        <p className='mt-6 text-center text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5]'>
          Remember your password?{' '}
          <Link
            to='/login'
            className='font-extrabold text-[#556b2f] hover:text-[#6f7d45]'
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}