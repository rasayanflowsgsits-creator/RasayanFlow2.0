import React, { useState, useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import useAppStore from '../../store/appStore';
import { BookOpen, Calendar, Beaker, ChevronRight, CheckCircle2, User as UserIcon, Loader2, LogOut } from 'lucide-react';

export default function StudentOnboardingModal() {
  const { user, updateUser, logout } = useAuthStore();
  const { setupStudentProfile, fetchMatchingLabs } = useAppStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [labs, setLabs] = useState([]);
  
  const [formData, setFormData] = useState({
    rollNumber: user?.rollNumber || '',
    course: 'B.Pharm',
    year: '1',
    semester: '1',
    group: 'No Group',
    labId: ''
  });

  // Calculate semantic semesters based on year
  const getSemesterOptions = () => {
    const y = parseInt(formData.year);
    if (formData.course === 'B.Pharm') {
      return [y * 2 - 1, y * 2];
    } else if (formData.course === 'M.Pharm') {
      return [y * 2 - 1, y * 2];
    }
    return [1];
  };

  useEffect(() => {
    // Reset semester when year changes to default valid sem
    const validSems = getSemesterOptions();
    if (!validSems.includes(parseInt(formData.semester))) {
      setFormData(prev => ({ ...prev, semester: validSems[0].toString() }));
    }
  }, [formData.year, formData.course]);

  const handleNextStep1 = () => {
    if (!formData.rollNumber) return alert('Please enter your Roll Number');
    setStep(2);
  };

  const handleNextStep2 = async () => {
    if (!formData.year || (formData.course !== 'PhD' && !formData.semester)) {
      return alert('Please complete all fields');
    }
    setLoading(true);
    try {
      const updatedProfile = await setupStudentProfile(formData);
      updateUser(updatedProfile);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (user?.onboardingComplete) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#23281d]/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-[#d9e1ca] bg-[#fffef8] shadow-2xl dark:border-[#414a33] dark:bg-[#1a1d16]">
        
        {/* Header */}
        <div className="relative bg-[#fdfdf7] p-8 text-center border-b border-[#e8ece1] dark:bg-[#20251a] dark:border-[#3c452f]">
          <button 
            onClick={logout}
            className="absolute right-4 top-4 flex items-center gap-1.5 rounded-lg border border-[#d9e1ca] bg-white px-3 py-1.5 text-xs font-semibold text-[#71805a] hover:bg-rose-50 hover:text-rose-600 dark:border-[#414a33] dark:bg-[#28301f] dark:text-[#a5b48b] dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
            title="Exit to Login"
          >
            <LogOut size={14} /> Exit to Login
          </button>
          <h2 className="text-2xl font-bold text-[#37412a] dark:text-[#e4e9d8]">Complete Your Profile</h2>
          <p className="mt-2 text-sm text-[#71805a] dark:text-[#a5b48b]">
            Tell us about your current academic status
          </p>
        </div>

        {/* Steps Progress */}
        <div className="flex items-center justify-center gap-2 p-6 bg-white dark:bg-[#1a1d16]">
          {[1, 2].map(i => (
            <React.Fragment key={i}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors
                ${step === i ? 'bg-[#5c6e46] text-white ring-4 ring-[#e8ece1] dark:ring-[#3c452f]' 
                : step > i ? 'bg-[#87996c] text-white' : 'bg-[#f4f6ee] text-[#a5b48b] dark:bg-[#20251a] dark:text-[#5e6b47]'}`}
              >
                {step > i ? <CheckCircle2 className="h-5 w-5" /> : i}
              </div>
              {i < 2 && <div className={`h-1 w-12 rounded-full transition-colors ${step > i ? 'bg-[#87996c]' : 'bg-[#e8ece1] dark:bg-[#3c452f]'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="p-8 pt-0">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#4a5538] dark:text-[#c5d0b5]">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#87996c]" />
                  <input type="text" value={user?.name || ''} disabled 
                    className="w-full rounded-xl border border-[#d9e1ca] bg-[#f4f6ee] py-3 pl-10 pr-4 text-[#71805a] outline-none dark:border-[#414a33] dark:bg-[#2a3121] dark:text-[#a5b48b]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#4a5538] dark:text-[#c5d0b5]">Roll Number *</label>
                <input type="text" placeholder="e.g. 0832PH211001" 
                  value={formData.rollNumber} onChange={e => setFormData({...formData, rollNumber: e.target.value})}
                  className="w-full rounded-xl border border-[#d9e1ca] bg-white py-3 px-4 text-[#37412a] outline-none focus:border-[#5c6e46] focus:ring-1 focus:ring-[#5c6e46] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#4a5538] dark:text-[#c5d0b5]">Course *</label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#87996c]" />
                  <select 
                    value={formData.course} onChange={e => setFormData({...formData, course: e.target.value})}
                    className="w-full appearance-none rounded-xl border border-[#d9e1ca] bg-white py-3 pl-10 pr-4 text-[#37412a] outline-none focus:border-[#5c6e46] focus:ring-1 focus:ring-[#5c6e46] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]"
                  >
                    <option value="B.Pharm">B.Pharm</option>
                    <option value="M.Pharm">M.Pharm</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>
              </div>
              <button onClick={handleNextStep1} className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#5c6e46] py-3 font-semibold text-white hover:bg-[#4a5538] transition-colors">
                Continue <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#4a5538] dark:text-[#c5d0b5]">Year</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#87996c]" />
                    <select 
                      value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})}
                      className="w-full appearance-none rounded-xl border border-[#d9e1ca] bg-white py-3 pl-10 pr-4 text-[#37412a] outline-none focus:border-[#5c6e46] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]"
                    >
                      {formData.course === 'B.Pharm' && [1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                      {formData.course === 'M.Pharm' && [1, 2].map(y => <option key={y} value={y}>Year {y}</option>)}
                      {formData.course === 'PhD' && [1, 2, '3+'].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                </div>
                
                {formData.course !== 'PhD' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#4a5538] dark:text-[#c5d0b5]">Semester</label>
                    <select 
                      value={formData.semester} onChange={e => setFormData({...formData, semester: e.target.value})}
                      className="w-full appearance-none rounded-xl border border-[#d9e1ca] bg-white py-3 px-4 text-[#37412a] outline-none focus:border-[#5c6e46] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]"
                    >
                      {getSemesterOptions().map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(1)} disabled={loading} className="w-1/3 rounded-xl border border-[#d9e1ca] bg-transparent py-3 font-semibold text-[#5c6e46] hover:bg-[#f4f6ee] dark:border-[#414a33] dark:text-[#c5d0b5] dark:hover:bg-[#2a3121] transition-colors disabled:opacity-50">
                  Back
                </button>
                <button onClick={handleNextStep2} disabled={loading} className="w-2/3 flex items-center justify-center gap-2 rounded-xl bg-[#5c6e46] py-3 font-semibold text-white hover:bg-[#4a5538] transition-colors disabled:opacity-50">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Complete Profile <CheckCircle2 className="h-5 w-5" /></>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
