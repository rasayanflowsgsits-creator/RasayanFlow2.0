import React, { useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { Download } from 'lucide-react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const CHART_COLORS = ['#556b2f', '#c8a030', '#8fad5a', '#d4891a', '#a3c468', '#e6b84a'];

const TIME_RANGES = [
  { label: 'This Week', days: 7 },
  { label: 'This Month', days: 30 },
  { label: 'This Semester', days: 180 },
  { label: 'This Year', days: 365 },
];

const TIME_SLOTS = ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function LabAnalyticsPage() {
  const user = useAuthStore(state => state.user);
  const store = useAppStore();
  
  const [timeRange, setTimeRange] = useState(30);

  const assignedLabs = useMemo(() => {
    const currentUserId = String(user?.id || user?._id || '');
    const currentUserEmail = (user?.email || '').toLowerCase();
    const currentUserLabId = String(user?.labId?._id || user?.labId || '');
    return store.labs.filter(lab => {
      const labIdStr = String(lab.id || lab._id || '');
      const isDirectAdmin = Array.isArray(lab.admins) && lab.admins.some(admin => {
        const adminIdStr = String(admin.id || admin._id || admin);
        const adminEmailStr = (admin.email || '').toLowerCase();
        return (adminIdStr && adminIdStr === currentUserId) || (adminEmailStr && adminEmailStr === currentUserEmail);
      });
      const matchesUserLabId = Boolean(currentUserLabId && currentUserLabId === labIdStr);
      return isDirectAdmin || matchesUserLabId;
    });
  }, [store.labs, user]);

  const activeLab = assignedLabs[0];
  const labId = activeLab?.id || activeLab?._id || '';

  // Filter data by time range
  const filterByDate = (dateString, days) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= days;
  };

  // --- Summary Stats ---
  const totalChemicals = store.inventory.length;
  
  const inventoryValue = store.inventory.reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.costPerUnit) || 0);
  }, 0);

  const relevantRequests = store.transactions.filter(tx => 
    tx.requestCategory === 'experiment' && filterByDate(tx.timestamp || tx.createdAt, timeRange)
  );
  
  const approvedRequests = relevantRequests.filter(tx => tx.status === 'approved');
  const rejectedRequests = relevantRequests.filter(tx => tx.status === 'rejected');
  const pendingRequests = relevantRequests.filter(tx => tx.status === 'pending');
  
  const experimentsCompleted = approvedRequests.length;

  const activeStudents = new Set(
    relevantRequests.map(tx => tx.requesterEmail || tx.requesterName)
  ).size;

  const requestApprovalRate = relevantRequests.length > 0 
    ? Math.round((approvedRequests.length / relevantRequests.length) * 100) 
    : 0;

  const lowStockAlerts = store.inventory.filter(
    item => Number(item.quantity || 0) <= Number(item.minThreshold || 5)
  ).length;

  // --- Chart 1: Chemical Consumption Trend (Line Chart) ---
  const consumptionData = useMemo(() => {
    const borrowTxs = store.transactions.filter(tx => tx.type === 'borrow' && tx.status === 'approved');
    const monthlyData = {};
    
    // Create last 6 months labels
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthYear = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyData[monthYear] = { name: monthYear };
    }

    // Map transactions
    const topChemicalsMap = {};
    borrowTxs.forEach(tx => {
      const date = new Date(tx.timestamp || tx.createdAt);
      const monthYear = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (monthlyData[monthYear]) {
        const chemName = tx.itemName || 'Unknown';
        monthlyData[monthYear][chemName] = (monthlyData[monthYear][chemName] || 0) + Number(tx.quantity || 0);
        topChemicalsMap[chemName] = (topChemicalsMap[chemName] || 0) + Number(tx.quantity || 0);
      }
    });

    const top5Chemicals = Object.entries(topChemicalsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);

    return {
      data: Object.values(monthlyData),
      lines: top5Chemicals
    };
  }, [store.transactions]);

  // --- Chart 2: Most Used Chemicals (Bar Chart) ---
  const top10UsedChemicals = useMemo(() => {
    const usage = {};
    store.transactions
      .filter(tx => tx.type === 'borrow' && tx.status === 'approved' && filterByDate(tx.timestamp || tx.createdAt, timeRange))
      .forEach(tx => {
        const chemName = tx.itemName || 'Unknown';
        usage[chemName] = (usage[chemName] || 0) + Number(tx.quantity || 0);
      });
    return Object.entries(usage)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [store.transactions, timeRange]);

  // --- Chart 3: Experiment Completion (Pie Chart) ---
  const pieData = [
    { name: 'Approved', value: approvedRequests.length },
    { name: 'Pending', value: pendingRequests.length },
    { name: 'Rejected', value: rejectedRequests.length }
  ].filter(d => d.value > 0);

  // --- Student Activity Heatmap ---
  const heatmapData = useMemo(() => {
    const matrix = Array(6).fill(0).map(() => Array(6).fill(0));
    
    (store.studentRequests || []).forEach(req => {
      if (!filterByDate(req.createdAt || req.timestamp, timeRange)) return;
      
      const d = new Date(req.createdAt || req.timestamp);
      let dayIdx = d.getDay() - 1; // 0=Monday, 5=Saturday
      if (dayIdx < 0 || dayIdx > 5) dayIdx = 0; // Fallback to Monday if Sunday

      const hour = d.getHours();
      let timeIdx = 0;
      if (hour >= 9 && hour < 10) timeIdx = 0;
      else if (hour >= 10 && hour < 11) timeIdx = 1;
      else if (hour >= 11 && hour < 13) timeIdx = 2; // 11-1
      else if (hour >= 13 && hour < 15) timeIdx = 3; // 1-3
      else if (hour >= 15 && hour < 16) timeIdx = 4; // 3-4
      else timeIdx = 5; // 4+

      matrix[timeIdx][dayIdx]++;
    });

    return matrix;
  }, [store.studentRequests, timeRange]);

  const getHeatmapColor = (count, max) => {
    if (count === 0) return 'bg-[#f4f5eb] dark:bg-[#28301f]';
    return 'bg-[#556b2f]';
  };
  const maxHeatmapVal = Math.max(...heatmapData.flat());

  // --- Inventory Health ---
  const inventoryHealth = useMemo(() => {
    let inStock = 0, lowStock = 0, outOfStock = 0;
    const expiringSoon = [];
    
    const now = new Date();
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(now.getDate() + 60);

    store.inventory.forEach(item => {
      const qty = Number(item.quantity || 0);
      const min = Number(item.minThreshold || 5);
      
      if (qty === 0) outOfStock++;
      else if (qty <= min) lowStock++;
      else inStock++;

      if (item.expiryDate) {
        const expDate = new Date(item.expiryDate);
        if (expDate > now && expDate <= sixtyDaysFromNow) {
          expiringSoon.push(item);
        }
      }
    });

    return { inStock, lowStock, outOfStock, expiringSoon };
  }, [store.inventory]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Lab Analytics Report', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
    
    doc.text(`Total Chemicals: ${totalChemicals}`, 20, 50);
    doc.text(`Inventory Value: Rs. ${inventoryValue.toFixed(2)}`, 20, 60);
    doc.text(`Experiments Completed: ${experimentsCompleted}`, 20, 70);
    doc.text(`Active Students: ${activeStudents}`, 20, 80);
    doc.text(`Request Approval Rate: ${requestApprovalRate}%`, 20, 90);
    doc.text(`Low Stock Alerts: ${lowStockAlerts}`, 20, 100);
    
    doc.save('analytics-report.pdf');
  };

  return (
    <div className="space-y-6 pb-10" id="analytics-content">
      {/* Header & Time Range Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">Analytics Dashboard</h1>
          <p className="text-sm text-[#71805a] dark:text-[#a5b48b] mt-1">
            Data insights and trends for {activeLab?.name || 'your lab'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#fdfdf7] dark:bg-[#1f2419] rounded-lg border border-[#d9e1ca] dark:border-[#414a33] p-1 shadow-sm">
            {TIME_RANGES.map(range => (
              <button
                key={range.label}
                onClick={() => setTimeRange(range.days)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  timeRange === range.days 
                    ? 'bg-[#556b2f] text-white shadow-sm' 
                    : 'text-[#71805a] dark:text-[#a5b48b] hover:bg-[#e8ede0] dark:hover:bg-[#28301f]'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <Button onClick={handleExportPDF} className="flex items-center gap-2 bg-[#c8a030] hover:bg-[#b08c2a] text-white">
            <Download size={16} /> Export PDF
          </Button>
        </div>
      </div>

      {/* 6 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:-translate-y-1 transition-transform duration-200">
          <div className="text-[#71805a] dark:text-[#a5b48b] text-sm font-medium mb-1">Total Chemicals</div>
          <div className="text-3xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">{totalChemicals}</div>
        </Card>
        <Card className="hover:-translate-y-1 transition-transform duration-200">
          <div className="text-[#71805a] dark:text-[#a5b48b] text-sm font-medium mb-1">Inventory Value</div>
          <div className="text-3xl font-bold text-[#c8a030]">₹ {inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </Card>
        <Card className="hover:-translate-y-1 transition-transform duration-200">
          <div className="text-[#71805a] dark:text-[#a5b48b] text-sm font-medium mb-1">Experiments Completed</div>
          <div className="text-3xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">{experimentsCompleted}</div>
        </Card>
        <Card className="hover:-translate-y-1 transition-transform duration-200">
          <div className="text-[#71805a] dark:text-[#a5b48b] text-sm font-medium mb-1">Active Students</div>
          <div className="text-3xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">{activeStudents}</div>
        </Card>
        <Card className="hover:-translate-y-1 transition-transform duration-200">
          <div className="text-[#71805a] dark:text-[#a5b48b] text-sm font-medium mb-1">Approval Rate</div>
          <div className="text-3xl font-bold text-[#8fad5a]">{requestApprovalRate}%</div>
        </Card>
        <Card className="hover:-translate-y-1 transition-transform duration-200">
          <div className="text-[#71805a] dark:text-[#a5b48b] text-sm font-medium mb-1">Low Stock Alerts</div>
          <div className="text-3xl font-bold text-[#d4891a]">{lowStockAlerts}</div>
        </Card>
      </div>

      {/* Consumption Trend Line Chart */}
      <Card title="Chemical Consumption Trend" subtitle="Monthly usage of top 5 requested chemicals">
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={consumptionData.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ece1" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71805a', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#71805a', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fffef8' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              {consumptionData.lines.map((chem, idx) => (
                <Line 
                  key={chem} 
                  type="monotone" 
                  dataKey={chem} 
                  stroke={CHART_COLORS[idx % CHART_COLORS.length]} 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Two Column Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Most Used Chemicals" subtitle="Top 10 by quantity requested">
          <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10UsedChemicals} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ece1" horizontal={true} vertical={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#71805a', fontSize: 12}} />
                <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tick={{fill: '#3c4e23', fontSize: 12, fontWeight: 500}} />
                <Tooltip cursor={{fill: '#f4f5eb'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fffef8' }} />
                <Bar dataKey="count" fill="#8fad5a" radius={[0, 4, 4, 0]}>
                  {top10UsedChemicals.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Experiment Completion" subtitle="Status of all experiment requests">
          <div className="h-[250px] w-full mt-4 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        entry.name === 'Approved' ? '#8fad5a' : 
                        entry.name === 'Pending' ? '#c8a030' : '#d4891a'
                      } />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fffef8' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-[#71805a]">No experiment requests found for this period.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heatmap */}
        <Card className="lg:col-span-2" title="Student Activity Heatmap" subtitle="When are students requesting experiments?">
          <div className="mt-6">
            <div className="grid grid-cols-[auto_1fr] gap-4">
              {/* Y-axis Labels */}
              <div className="flex flex-col justify-between text-xs text-[#71805a] font-medium py-2">
                {TIME_SLOTS.map(time => <div key={time} className="h-8 flex items-center">{time}</div>)}
              </div>
              
              {/* Grid */}
              <div className="grid grid-cols-6 gap-2">
                {/* X-axis Labels */}
                {DAYS.map((day, colIdx) => (
                  <div key={day} className="flex flex-col gap-2">
                    <div className="text-center text-xs text-[#71805a] font-medium mb-1">{day}</div>
                    {TIME_SLOTS.map((_, rowIdx) => {
                      const count = heatmapData[rowIdx][colIdx];
                      return (
                        <div 
                          key={`${rowIdx}-${colIdx}`}
                          className={`h-8 rounded-md transition-colors ${getHeatmapColor(count, maxHeatmapVal)}`}
                          style={{
                            opacity: count > 0 ? Math.max(0.2, count / (maxHeatmapVal || 1)) : 1
                          }}
                          title={`${count} requests`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4 text-xs text-[#71805a]">
              <span>Less</span>
              <div className="w-16 h-3 rounded-full bg-gradient-to-r from-[#f4f5eb] to-[#556b2f] dark:from-[#28301f]"></div>
              <span>More</span>
            </div>
          </div>
        </Card>

        {/* Inventory Health Panel */}
        <Card title="Inventory Health" subtitle="Real-time stock status">
          <div className="mt-4 space-y-6">
            {/* Status Breakdown */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-[#3c4e23] dark:text-[#eef4e8]">Stock Levels</span>
              </div>
              
              <div className="flex h-4 w-full rounded-full overflow-hidden bg-slate-100">
                <div style={{ width: `${(inventoryHealth.inStock / (totalChemicals || 1)) * 100}%` }} className="bg-[#8fad5a]" title={`In Stock: ${inventoryHealth.inStock}`}></div>
                <div style={{ width: `${(inventoryHealth.lowStock / (totalChemicals || 1)) * 100}%` }} className="bg-[#c8a030]" title={`Low Stock: ${inventoryHealth.lowStock}`}></div>
                <div style={{ width: `${(inventoryHealth.outOfStock / (totalChemicals || 1)) * 100}%` }} className="bg-[#d4891a]" title={`Out of Stock: ${inventoryHealth.outOfStock}`}></div>
              </div>
              
              <div className="flex justify-between mt-3 text-xs">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#8fad5a]"></div><span className="text-[#71805a]">Healthy ({inventoryHealth.inStock})</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#c8a030]"></div><span className="text-[#71805a]">Low ({inventoryHealth.lowStock})</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#d4891a]"></div><span className="text-[#71805a]">Out ({inventoryHealth.outOfStock})</span></div>
              </div>
            </div>

            {/* Expiring Soon */}
            <div>
              <h4 className="text-sm font-medium text-[#3c4e23] dark:text-[#eef4e8] mb-3 pb-2 border-b border-[#e8ece1] dark:border-[#414a33]">Expiring Soon (60 Days)</h4>
              {inventoryHealth.expiringSoon.length > 0 ? (
                <ul className="space-y-3">
                  {inventoryHealth.expiringSoon.slice(0, 4).map(item => (
                    <li key={item.id} className="flex justify-between items-center text-sm">
                      <span className="text-[#3c4e23] dark:text-[#c5d0b5] truncate max-w-[150px]" title={item.chemicalName}>{item.chemicalName}</span>
                      <span className="text-[#d4891a] font-medium text-xs bg-[#fdf8f0] dark:bg-[#3d2e15] px-2 py-0.5 rounded-md">
                        {new Date(item.expiryDate).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                  {inventoryHealth.expiringSoon.length > 4 && (
                    <li className="text-xs text-center text-[#71805a] mt-2">
                      + {inventoryHealth.expiringSoon.length - 4} more items
                    </li>
                  )}
                </ul>
              ) : (
                <div className="text-sm text-[#71805a] text-center py-4 bg-[#fdfdf7] dark:bg-[#1f2419] rounded-lg border border-dashed border-[#d9e1ca] dark:border-[#414a33]">
                  No items expiring soon
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
