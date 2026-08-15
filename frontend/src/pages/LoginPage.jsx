import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, Award, GraduationCap } from 'lucide-react';
import useAuthStore from '../store/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewSubmitting, setIsPreviewSubmitting] = useState(false);
  const [isPreviewPhDSubmitting, setIsPreviewPhDSubmitting] = useState(false);
  
  const { login, user } = useAuthStore((state) => ({ login: state.login, user: state.user }));
  const navigate = useNavigate();
  const location = useLocation();
  const message = location.state?.message || '';
  const campusImageUrl = '/team/Sgsits.avif';

  if (user) {
    return <Navigate to='/' replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const userFound = await login(form);
      if (userFound.role === 'super-admin') navigate('/');
      else if (userFound.role === 'lab-admin') navigate('/inventory');
      else if (userFound.role === 'store_admin') navigate('/store/dashboard');
      else navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
      setIsSubmitting(false);
    }
  };

  const previewStudentDashboard = () => {
    setIsPreviewSubmitting(true);
    setTimeout(() => {
      try {
        const authStore = useAuthStore.getState();
        authStore.loginAsPreviewStudent();
        navigate('/');
      } catch (err) {
        setError('Preview student failed: ' + (err.message || 'Unknown error'));
        setIsPreviewSubmitting(false);
      }
    }, 250);
  };

  const previewPhDStudentDashboard = () => {
    setIsPreviewPhDSubmitting(true);
    setTimeout(() => {
      try {
        const authStore = useAuthStore.getState();
        authStore.loginAsPreviewPhDStudent();
        navigate('/');
      } catch (err) {
        setError('Preview PhD failed: ' + (err.message || 'Unknown error'));
        setIsPreviewPhDSubmitting(false);
      }
    }, 250);
  };

  const isLoading = isSubmitting || isPreviewSubmitting || isPreviewPhDSubmitting;

  return (
    <div className='relative grid min-h-screen place-items-center overflow-hidden bg-[#eef1e6] px-4 dark:bg-[#141811]'>
      <div
        className='absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50 dark:opacity-50'
        style={{ backgroundImage: `url(${campusImageUrl})` }}
        aria-hidden='true'
      />
      <div className='relative w-full max-w-md rounded-3xl border border-[#d9e1ca]/80 bg-[#fffef8]/90 p-8 shadow-soft backdrop-blur-sm dark:border-[#414a33] dark:bg-[#20251a]/88 space-y-4'>
        <div>
          <h1 className='text-2xl font-black text-[#3c4e23] dark:text-[#eef4e8]'>Welcome back</h1>
          <p className='text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5]'>Log in to your RasayanFlow account</p>
        </div>

        <form className='space-y-3.5' onSubmit={handleSubmit}>
          <Input 
            label='Email' 
            type='email' 
            value={form.email} 
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} 
            required 
            disabled={isLoading}
          />
          <Input 
            label='Password' 
            type='password' 
            value={form.password} 
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} 
            required 
            disabled={isLoading}
          />
          {message && (
            <div className='rounded-lg bg-emerald-50 p-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'>
              {message}
            </div>
          )}
          {error && (
            <div className='flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300 animate-in fade-in'>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <Button type='submit' className='w-full flex items-center justify-center gap-2 font-black' disabled={isLoading}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              'Sign in'
            )}
          </Button>

          {/* Quick Preview Buttons: B.Pharm vs PhD Scholar */}
          <div className="pt-2 border-t border-[#e4eed3] dark:border-[#38432a] space-y-2">
            <div className="text-[11px] font-black text-[#5c6e46] uppercase tracking-wider text-center">Instant Demo Previews</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button 
                type='button' 
                variant='outline' 
                className='w-full flex items-center justify-center gap-1.5 text-xs font-extrabold border-[#cfd8bd] text-[#5c6e46] hover:bg-[#f4f6ee]' 
                onClick={previewStudentDashboard}
                disabled={isLoading}
              >
                {isPreviewSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <GraduationCap size={14} /> Preview Student
                  </>
                )}
              </Button>

              <Button 
                type='button' 
                variant='outline' 
                className='w-full flex items-center justify-center gap-1.5 text-xs font-black bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800' 
                onClick={previewPhDStudentDashboard}
                disabled={isLoading}
              >
                {isPreviewPhDSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Award size={14} /> Preview PhD Scholar
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        <p className='text-center text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5]'>
          Need an account?{' '}
          <Link to='/register' className='font-extrabold text-[#556b2f] hover:text-[#6f7d45]'>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
