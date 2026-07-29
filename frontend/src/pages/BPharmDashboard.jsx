import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import { Beaker, Clock, FileCheck2, ChevronRight } from 'lucide-react';

export default function BPharmDashboard() {
  const { 
    myLabs, fetchMyLabs,
    studentRequests, fetchMyStudentRequests
  } = useAppStore();
  
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyStudentRequests();
    if (user?.onboardingComplete) {
      fetchMyLabs(user.course, user.year, user.semester);
    }
  }, [fetchMyStudentRequests, fetchMyLabs, user?.onboardingComplete, user?.course, user?.year, user?.semester]);

  const pendingCount = studentRequests.filter(r => r.overallStatus === 'Pending').length;
  const approvedCount = studentRequests.filter(r => r.overallStatus === 'Approved').length;

  return (
    <div className='space-y-6 pb-10 animate-in fade-in'>
      <div>
        <h2 className='text-2xl font-bold text-[#37412a] dark:text-[#e4e9d8]'>Student Dashboard</h2>
        <p className='text-sm text-[#71805a] dark:text-[#a5b48b]'>
          {user.course} • Year {user.year} • Sem {user.semester} {user.group !== 'No Group' && `• ${user.group}`}
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <Card title='My Subjects' subtitle='Available labs'>
          <div className='flex items-center gap-3'>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f6ee] dark:bg-[#20251a]">
              <Beaker size={24} className='text-[#5c6e46] dark:text-[#a5b48b]' />
            </div>
            <p className='text-3xl font-bold text-[#37412a] dark:text-[#e4e9d8]'>{myLabs.length}</p>
          </div>
        </Card>
        <Card title='Pending Requests' subtitle='Awaiting Lab Admin approval'>
          <div className='flex items-center gap-3'>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30">
              <Clock size={24} className='text-amber-600 dark:text-amber-500' />
            </div>
            <p className='text-3xl font-bold text-[#37412a] dark:text-[#e4e9d8]'>{pendingCount}</p>
          </div>
        </Card>
        <Card title='Approved Requests' subtitle='Ready for experiment'>
          <div className='flex items-center gap-3'>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30">
              <FileCheck2 size={24} className='text-emerald-600 dark:text-emerald-500' />
            </div>
            <p className='text-3xl font-bold text-[#37412a] dark:text-[#e4e9d8]'>{approvedCount}</p>
          </div>
        </Card>
      </div>

      <Card 
        title='My Subjects & Labs' 
        subtitle='Select a lab to view experiments and request chemicals'
      >
        {myLabs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {myLabs.map((lab) => {
              const labId = lab._id || lab.id;
              return (
                <div 
                  key={labId} 
                  onClick={() => navigate(`/labs/${labId}`)}
                  className="group flex cursor-pointer items-center justify-between rounded-2xl border border-[#d9e1ca] bg-white p-5 hover:border-[#87996c] hover:shadow-md dark:border-[#414a33] dark:bg-[#20251a] dark:hover:border-[#5c6e46] transition-all"
                >
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#f4f6ee] text-[#5c6e46] dark:bg-[#2a3121] dark:text-[#c5d0b5]">
                      <Beaker className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#37412a] dark:text-[#e4e9d8]">{lab.labName}</h4>
                      <p className="text-xs text-[#71805a] dark:text-[#a5b48b]">{lab.labCode} • {lab.department || lab.courseType}</p>
                    </div>
                  </div>
                </div>
                <button className="rounded-full bg-[#f4f6ee] p-2 text-[#5c6e46] group-hover:bg-[#5c6e46] group-hover:text-white dark:bg-[#2a3121] dark:text-[#c5d0b5] transition-colors">
                  <ChevronRight className="h-5 w-5" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d9e1ca] bg-[#fdfdf7] py-16 text-center dark:border-[#414a33] dark:bg-[#1a1d16]">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f6ee] dark:bg-[#20251a]">
              <Beaker size={28} className="text-[#87996c]" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-[#37412a] dark:text-[#e4e9d8]">No Labs Found</h3>
            <p className="max-w-sm text-sm text-[#71805a] dark:text-[#a5b48b]">
              We couldn't find any active labs for your course, year, and semester.
            </p>
          </div>
        )}
      </Card>

      <Card title='My Requests' subtitle='Track your chemical request history'>
        <Table
          headers={[
            { key: 'labName', label: 'Lab' },
            { key: 'subject', label: 'Subject' },
            { key: 'experimentNo', label: 'Exp No' },
            { key: 'experimentName', label: 'Experiment Name' },
            { key: 'requestedAt', label: 'Requested At', render: (row) => new Date(row.requestedAt).toLocaleString() },
            { 
              key: 'overallStatus', 
              label: 'Status',
              render: (row) => (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  row.overallStatus === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' :
                  row.overallStatus === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' :
                  row.overallStatus === 'Partial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' :
                  'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                }`}>
                  {row.overallStatus}
                </span>
              )
            }
          ]}
          rows={studentRequests}
        />
      </Card>
    </div>
  );
}
