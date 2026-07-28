import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useAppStore from '../store/appStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';

const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || '';

export default function RegisterPage() {
  const [form, setForm] = useState({ 
    name: '', email: '', password: '', 
    course: 'B.Pharm', year: '', semester: '', group: '', labId: '', rollNumber: '' 
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);
  const { labs, fetchLabs } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchLabs();
  }, [fetchLabs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Find labName if labId is selected
      let labName = '';
      if (form.labId) {
        const selectedLab = labs.find(l => l.id === form.labId);
        if (selectedLab) labName = selectedLab.name;
      }

      const payload = {
        ...form,
        labName,
        // If super admin email, we don't care about these fields, but backend handles it
      };

      const user = await register(payload);
      const message =
        user.role === 'super-admin'
          ? 'Super admin account created. Please sign in.'
          : 'Account created. You can now sign in.';
      setSuccess(message);
      setTimeout(() => {
        navigate('/login', { state: { message } });
      }, 900);
    } catch (err) {
      setError(err.message || 'Unable to create account.');
    }
  };

  const isBPharm = form.course === 'B.Pharm';

  // Filter labs based on selected year and semester (if B.Pharm)
  const availableLabs = labs.filter(lab => 
    lab.courseType === form.course && 
    lab.year === form.year && 
    lab.semester === form.semester
  );

  return (
    <div className='grid min-h-screen place-items-center bg-[#f6f7ef] px-4 py-8 dark:bg-[#1a1d16] overflow-y-auto'>
      <div className='w-full max-w-lg rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-8 shadow-soft dark:border-[#414a33] dark:bg-[#20251a]'>
        <h1 className='text-2xl font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>Create account</h1>
        <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>Students can sign up here.</p>
        
        <form className='mt-6 space-y-4' onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <Input label='Full Name' value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
            <Input label='Email' type='email' value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} required />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input label='Password' type='password' value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} required minLength={6} />
            <Input label='Roll Number' value={form.rollNumber} onChange={(e) => setForm((s) => ({ ...s, rollNumber: e.target.value }))} required />
          </div>

          <div className="pt-4 border-t border-[#d9e1ca] dark:border-[#414a33]">
            <h3 className="text-sm font-medium text-[#3c4e23] dark:text-[#eef4e8] mb-3">Academic Details</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Select 
                label='Course' 
                value={form.course} 
                onChange={(e) => setForm((s) => ({ ...s, course: e.target.value, year: '', semester: '', labId: '' }))} 
                required
              >
                <option value='B.Pharm'>B.Pharm</option>
                <option value='M.Pharm'>M.Pharm</option>
                <option value='PhD'>PhD</option>
              </Select>

              <Select 
                label='Year' 
                value={form.year} 
                onChange={(e) => setForm((s) => ({ ...s, year: e.target.value, labId: '' }))} 
                required
              >
                <option value=''>Select Year</option>
                {isBPharm ? (
                  <>
                    <option value='1st Year'>1st Year</option>
                    <option value='2nd Year'>2nd Year</option>
                    <option value='3rd Year'>3rd Year</option>
                    <option value='4th Year'>4th Year</option>
                  </>
                ) : (
                  <>
                    <option value='1st Year'>1st Year</option>
                    <option value='2nd Year'>2nd Year</option>
                  </>
                )}
              </Select>
            </div>

            {isBPharm && (
              <div className="grid grid-cols-2 gap-4">
                <Select 
                  label='Semester' 
                  value={form.semester} 
                  onChange={(e) => setForm((s) => ({ ...s, semester: e.target.value, labId: '' }))} 
                  required
                >
                  <option value=''>Select Semester</option>
                  <option value='Sem 1'>Semester 1</option>
                  <option value='Sem 2'>Semester 2</option>
                  <option value='Sem 3'>Semester 3</option>
                  <option value='Sem 4'>Semester 4</option>
                  <option value='Sem 5'>Semester 5</option>
                  <option value='Sem 6'>Semester 6</option>
                  <option value='Sem 7'>Semester 7</option>
                  <option value='Sem 8'>Semester 8</option>
                </Select>

                <Select 
                  label='Group' 
                  value={form.group} 
                  onChange={(e) => setForm((s) => ({ ...s, group: e.target.value }))} 
                  required
                >
                  <option value=''>Select Group</option>
                  <option value='A'>Group A</option>
                  <option value='B'>Group B</option>
                  <option value='C'>Group C</option>
                  <option value='D'>Group D</option>
                </Select>

                <div className="col-span-2">
                  <Select 
                    label='Select Lab' 
                    value={form.labId} 
                    onChange={(e) => setForm((s) => ({ ...s, labId: e.target.value }))} 
                    required={isBPharm}
                  >
                    <option value=''>-- Select Lab --</option>
                    {availableLabs.map(lab => (
                      <option key={lab.id} value={lab.id}>{lab.name}</option>
                    ))}
                  </Select>
                  {form.year && form.semester && availableLabs.length === 0 && (
                     <p className="text-xs text-red-500 mt-1">No labs found for this year and semester.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className='flex items-center gap-2 rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300'>
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {success && (
            <div className='rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'>
              {success}
            </div>
          )}
          
          <Button type='submit' className='w-full mt-6' disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </Button>
        </form>
        <p className='mt-4 text-center text-sm text-[#71805a] dark:text-[#c5d0b5]'>
          Already have an account?{' '}
          <Link to='/login' className='font-medium text-[#556b2f] hover:text-[#6f7d45]'>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
