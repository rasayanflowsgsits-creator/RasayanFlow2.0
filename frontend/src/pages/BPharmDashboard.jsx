import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Beaker, 
  CheckCircle2, 
  Clock, 
  Activity, 
  Search, 
  Store, 
  Info, 
  XCircle,
  FlaskConical,
  ChevronRight
} from 'lucide-react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const BPharmDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { myLabs, fetchMyLabs, studentRequests, fetchMyStudentRequests } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchMyLabs();
    fetchMyStudentRequests();
  }, [fetchMyLabs, fetchMyStudentRequests]);

  // Derived Stats
  const stats = useMemo(() => {
    const totalRequests = studentRequests?.length || 0;
    const pending = studentRequests?.filter(req => req.overallStatus === 'Pending').length || 0;
    const approved = studentRequests?.filter(req => req.overallStatus === 'Approved').length || 0;
    const subjectsCount = myLabs?.length || 0;

    return { subjectsCount, pending, approved, totalRequests };
  }, [studentRequests, myLabs]);

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    if (!studentRequests) return [];
    
    return studentRequests.filter(req => {
      const matchesSearch = 
        req.labName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        req.experimentName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || req.overallStatus === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  }, [studentRequests, searchQuery, statusFilter]);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Approved':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800/50"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>;
      case 'Pending':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-800/50"><Clock className="w-3.5 h-3.5" /> Pending</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 rounded-full border border-rose-200 dark:border-rose-800/50"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      case 'Partial':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-800/50"><Activity className="w-3.5 h-3.5" /> Partial</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 rounded-full">{status}</span>;
    }
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[#fdfdf7] dark:bg-[#1a1d16] text-[#2c3320] dark:text-[#eef4e8] p-4 md:p-8 space-y-8 font-sans pb-24 transition-colors duration-300">
      
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#556b2f] to-[#3c4e23] text-white p-5 sm:p-8 shadow-lg">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none hidden sm:block">
          <FlaskConical className="w-48 h-48" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Welcome back, {user?.name}!</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium">
              <span className="bg-[#c8a030] text-black px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                B.Pharm Y{user?.year || 1} • Sem {user?.semester || 1}
              </span>
              {user?.group && user?.group !== 'No Group' && (
                <span className="bg-black/30 text-white px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium">
                  {user.group.startsWith('Group') ? user.group : `Group ${user.group}`}
                </span>
              )}
            </div>
          </div>
          <div className="self-start sm:self-auto">
            <p className="text-xs sm:text-sm font-medium text-[#eef4e8]/80 bg-black/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg backdrop-blur-sm">
              {currentDate}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards - 2x2 on mobile for quick scanning */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { title: "My Subjects", count: stats.subjectsCount, icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
          { title: "Pending Requests", count: stats.pending, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { title: "Approved Requests", count: stats.approved, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { title: "Total Requests", count: stats.totalRequests, icon: Activity, color: "text-[#c8a030]", bg: "bg-[#c8a030]/10" }
        ].map((stat, idx) => (
          <Card key={idx} className="p-3.5 sm:p-6 bg-white dark:bg-[#1f2419] border-[#e8eadf] dark:border-[#3c452f] hover:shadow-md transition-all">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <div className={`p-2.5 sm:p-3 rounded-xl ${stat.bg} ${stat.color} shrink-0`}>
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">{stat.title}</p>
                <h3 className="text-xl sm:text-2xl font-bold text-[#3c4e23] dark:text-[#c8a030]">{stat.count}</h3>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-[#3c4e23] dark:text-[#c8a030] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          <button 
            onClick={() => navigate('/my-borrowings')}
            className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#1f2419] border border-[#e8eadf] dark:border-[#3c452f] hover:border-[#556b2f] dark:hover:border-[#c8a030] hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#556b2f]/10 dark:bg-[#c8a030]/10 rounded-lg text-[#556b2f] dark:text-[#c8a030]">
                <Activity className="w-5 h-5" />
              </div>
              <span className="font-semibold text-left">My Activity</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#556b2f] dark:group-hover:text-[#c8a030] transition-colors" />
          </button>
          
          <button 
            onClick={() => navigate('/about')}
            className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#1f2419] border border-[#e8eadf] dark:border-[#3c452f] hover:border-[#556b2f] dark:hover:border-[#c8a030] hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#556b2f]/10 dark:bg-[#c8a030]/10 rounded-lg text-[#556b2f] dark:text-[#c8a030]">
                <Info className="w-5 h-5" />
              </div>
              <span className="font-semibold text-left">About RasayanFlow</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#556b2f] dark:group-hover:text-[#c8a030] transition-colors" />
          </button>
        </div>
      </div>

      {/* My Labs Grid */}
      <div>
        <h2 className="text-xl font-bold text-[#3c4e23] dark:text-[#c8a030] mb-4 flex items-center gap-2">
          <Beaker className="w-5 h-5" /> My Practical Subjects
        </h2>
        
        {myLabs && myLabs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {myLabs.map(lab => (
              <Card 
                key={lab._id || lab.id}
                onClick={() => navigate(`/labs/${lab._id || lab.id}`)}
                className="cursor-pointer group relative overflow-hidden bg-white dark:bg-[#1f2419] border-[#e8eadf] dark:border-[#3c452f] hover:border-[#556b2f] dark:hover:border-[#c8a030] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-6"
              >
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity dark:opacity-[0.05] dark:group-hover:opacity-[0.1]">
                  <Beaker className="w-32 h-32 text-[#556b2f] dark:text-[#c8a030]" />
                </div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <span className="inline-block px-2.5 py-1 bg-[#556b2f]/10 dark:bg-[#c8a030]/10 text-[#556b2f] dark:text-[#c8a030] text-xs font-bold rounded-lg uppercase tracking-wide">
                      {lab.labCode}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">
                      {lab.department || lab.courseType || 'Department'}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold mb-2 group-hover:text-[#556b2f] dark:group-hover:text-[#c8a030] transition-colors line-clamp-2">
                    {lab.labName}
                  </h3>
                  
                  <div className="mt-auto pt-4 flex items-center text-sm font-semibold text-[#556b2f] dark:text-[#c8a030] group-hover:translate-x-1 transition-transform">
                    Enter Subject <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 sm:p-8 text-left bg-white dark:bg-[#1f2419] border border-dashed border-[#d9e1ca] dark:border-[#414a33] rounded-2xl">
            <div className="flex flex-col items-start gap-3">
              <div className="p-3 bg-[#f4f6ee] dark:bg-[#28301f] rounded-2xl text-[#556b2f] dark:text-[#c8a030]">
                <Beaker className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#3c4e23] dark:text-[#eef4e8]">No Labs Assigned for {user?.course || 'B.Pharm'} Year {user?.year || '1'} • Sem {user?.semester || '1'} Yet</h3>
                <p className="text-sm text-[#71805a] dark:text-[#c5d0b5] mt-1 max-w-lg">
                  No laboratories or subjects have been created for your semester yet. Your profile has been saved successfully! Once your faculty or lab administrator sets up labs for Year {user?.year || '1'} Sem {user?.semester || '1'}, they will automatically appear here.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* My Requests Section */}
      <Card className="bg-white dark:bg-[#1f2419] border-[#e8eadf] dark:border-[#3c452f] overflow-hidden text-left">
        <div className="p-4 sm:p-6 border-b border-[#e8eadf] dark:border-[#3c452f] space-y-4 text-left">
          <h2 className="text-xl font-bold text-[#3c4e23] dark:text-[#c8a030] flex items-center gap-2 text-left">
            <Activity className="w-5 h-5" /> Requisition History
          </h2>
          
          <div className="flex flex-col md:flex-row md:items-center justify-start gap-3 text-left">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by lab or experiment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full bg-gray-50 dark:bg-[#1a1d16] border-[#e8eadf] dark:border-[#3c452f] focus:border-[#556b2f] dark:focus:border-[#c8a030] text-sm"
              />
            </div>
            
            <div className="flex overflow-x-auto gap-2 pb-1 text-left justify-start">
              {['All', 'Pending', 'Approved', 'Partial', 'Rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === status 
                      ? 'bg-[#556b2f] text-white dark:bg-[#c8a030] dark:text-black' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 text-left">
          <Table
            headers={[
              { key: 'date', label: 'Date', render: (row) => new Date(row.requestedAt).toLocaleDateString('en-GB') },
              { key: 'subject', label: 'Subject / Lab', render: (row) => (
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{row.labName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{row.subject}</div>
                </div>
              )},
              { key: 'experiment', label: 'Experiment', render: (row) => (
                <div className="text-sm text-gray-900 dark:text-gray-100 text-left">
                  <span className="font-medium mr-1 text-[#556b2f] dark:text-[#c8a030]">Exp {row.experimentNo}:</span> 
                  {row.experimentName}
                </div>
              )},
              { key: 'status', label: 'Status', render: (row) => getStatusBadge(row.overallStatus) }
            ]}
            rows={filteredRequests}
          />
        </div>
      </Card>
    </div>
  );
};

export default BPharmDashboard;
