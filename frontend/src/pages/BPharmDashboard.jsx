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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#556b2f] to-[#3c4e23] text-white p-8 shadow-lg">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <FlaskConical className="w-48 h-48" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome back, {user?.name}!</h1>
            <p className="text-[#eef4e8]/80 text-sm md:text-base font-medium flex items-center gap-2">
              <span className="bg-[#c8a030] text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                B.Pharm Year {user?.year} • Sem {user?.semester}
              </span>
              {user?.group && <span className="opacity-90">• Group {user?.group}</span>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-[#eef4e8]/80 bg-black/20 px-4 py-2 rounded-lg backdrop-blur-sm">
              {currentDate}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "My Subjects", count: stats.subjectsCount, icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
          { title: "Pending Requests", count: stats.pending, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { title: "Approved Requests", count: stats.approved, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { title: "Total Requests", count: stats.totalRequests, icon: Activity, color: "text-[#c8a030]", bg: "bg-[#c8a030]/10" }
        ].map((stat, idx) => (
          <Card key={idx} className="p-6 bg-white dark:bg-[#1f2419] border-[#e8eadf] dark:border-[#3c452f] hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{stat.title}</p>
                <h3 className="text-2xl font-bold text-[#3c4e23] dark:text-[#c8a030]">{stat.count}</h3>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-[#3c4e23] dark:text-[#c8a030] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button 
            onClick={() => navigate('/store')}
            className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#1f2419] border border-[#e8eadf] dark:border-[#3c452f] hover:border-[#556b2f] dark:hover:border-[#c8a030] hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#556b2f]/10 dark:bg-[#c8a030]/10 rounded-lg text-[#556b2f] dark:text-[#c8a030]">
                <Store className="w-5 h-5" />
              </div>
              <span className="font-semibold text-left">Visit Central Store</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#556b2f] dark:group-hover:text-[#c8a030] transition-colors" />
          </button>
          
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
          <Card className="p-8 text-center bg-white dark:bg-[#1f2419] border-dashed">
            <Beaker className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No subjects assigned for this semester yet.</p>
          </Card>
        )}
      </div>

      {/* My Requests Section */}
      <Card className="bg-white dark:bg-[#1f2419] border-[#e8eadf] dark:border-[#3c452f] overflow-hidden">
        <div className="p-6 border-b border-[#e8eadf] dark:border-[#3c452f] space-y-4">
          <h2 className="text-xl font-bold text-[#3c4e23] dark:text-[#c8a030] flex items-center gap-2">
            <Activity className="w-5 h-5" /> Requisition History
          </h2>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by lab or experiment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full bg-gray-50 dark:bg-[#1a1d16] border-[#e8eadf] dark:border-[#3c452f] focus:border-[#556b2f] dark:focus:border-[#c8a030]"
              />
            </div>
            
            <div className="flex overflow-x-auto gap-2 pb-2 md:pb-0 hide-scrollbar">
              {['All', 'Pending', 'Approved', 'Partial', 'Rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
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

        <div className="p-0">
          <Table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#1a1d16]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject / Lab</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experiment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8eadf] dark:divide-[#3c452f]">
              {filteredRequests?.length > 0 ? (
                filteredRequests.map((req, i) => (
                  <tr key={req._id || i} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {new Date(req.requestedAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{req.labName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{req.subject}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100 truncate max-w-[200px] md:max-w-[300px]">
                        <span className="font-medium mr-1 text-gray-500 dark:text-gray-400">Exp {req.experimentNo}:</span> 
                        {req.experimentName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(req.overallStatus)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No requests found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default BPharmDashboard;
