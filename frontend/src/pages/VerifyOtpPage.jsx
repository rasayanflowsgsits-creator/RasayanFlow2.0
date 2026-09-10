import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import useAuthStore from '../store/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Phone number is carried over from ForgotPasswordPage via router state.
  const [phoneNumber, setPhoneNumber] = useState(location.state?.phoneNumber || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const verifyResetOtp = useAuthStore((state) => state.verifyResetOtp);
  const requestPasswordResetOtp = useAuthStore((state) => state.requestPasswordResetOtp);

  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');

    if (!phoneNumber) {
      setError('Phone number is missing. Please start again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await verifyResetOtp({ phoneNumber, otp });

      // As soon as the OTP is verified, go straight to the reset-password
      // page, carrying the short-lived reset token issued by the backend.
      navigate(`/reset-password/${data.resetToken}`);
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!phoneNumber) {
      setError('Phone number is missing. Please start again.');
      return;
    }

    setError('');
    setResendMessage('');
    setIsResending(true);

    try {
      await requestPasswordResetOtp(phoneNumber);
      setResendMessage('A new OTP has been sent.');
    } catch (err) {
      setError(err.message || 'Unable to resend OTP.');
    } finally {
      setIsResending(false);
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
            to='/forgot-password'
            className='mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#71805a] hover:text-[#556b2f] dark:text-[#c5d0b5]'
          >
            <ArrowLeft size={15} />
            Back
          </Link>

          <h1 className='text-2xl font-black text-[#3c4e23] dark:text-[#eef4e8]'>
            Enter OTP
          </h1>

          <p className='mt-1 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5]'>
            We've sent a one-time password to your phone number. Enter it
            below to continue.
          </p>
        </div>

        <form className='space-y-4' onSubmit={handleSubmit}>
          <Input
            label='Phone Number'
            type='tel'
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder='Enter your registered phone number'
            required
            disabled={isSubmitting}
          />

          <Input
            label='OTP'
            type='text'
            inputMode='numeric'
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder='Enter the 6-digit OTP'
            maxLength={6}
            required
            disabled={isSubmitting}
          />

          {resendMessage && !error && (
            <div className='flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'>
              <span>{resendMessage}</span>
            </div>
          )}

          {error && (
            <div className='flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300'>
              <AlertCircle size={16} />
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
                <span>Verifying...</span>
              </>
            ) : (
              'Verify OTP'
            )}
          </Button>
        </form>

        <p className='mt-6 text-center text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5]'>
          Didn't get an OTP?{' '}
          <button
            type='button'
            onClick={handleResend}
            disabled={isResending}
            className='font-extrabold text-[#556b2f] hover:text-[#6f7d45] disabled:opacity-60'
          >
            {isResending ? 'Resending...' : 'Resend OTP'}
          </button>
        </p>
      </div>
    </div>
  );
}
