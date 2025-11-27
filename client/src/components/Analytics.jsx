import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Shield, AlertTriangle, Clock, Activity, CheckCircle } from 'lucide-react';

const Analytics = ({ alerts, shelters, responders }) => {
  const activeAlerts = alerts.filter(a => a.status !== 'resolved');
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved');

  const resolutionData = [
    { name: 'Active', value: activeAlerts.length },
    { name: 'Solved', value: resolvedAlerts.length },
  ];
  const RES_COLORS = ['#EF4444', '#10B981']; // Red (Active), Green (Solved)

  
  const incidentTypeData = [
    { name: 'Emergency (SOS)', value: alerts.filter(a => a.type === 'EMERGENCY').length },
    { name: 'Reported Incidents', value: alerts.filter(a => a.type === 'INCIDENT').length },
  ];
  const TYPE_COLORS = ['#F59E0B', '#3B82F6']; // Orange, Blue

  const shelterData = shelters.map(s => ({
    name: s.name.split(' ')[0], 
    capacity: s.capacity
  }));

  const activityData = [
    { time: '10 AM', sos: 2, reports: 1 },
    { time: '12 PM', sos: 1, reports: 0 },
    { time: '2 PM', sos: 3, reports: 4 },
    { time: 'Now', sos: activeAlerts.length, reports: 2 },
  ];

  const totalCapacity = shelters.reduce((acc, curr) => acc + (curr.capacity || 0), 0);

  return (
    <div className="h-full overflow-y-auto p-2 text-white font-sans">
      
      {/* STATS ROW */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-xl border-l-4 border-green-500 shadow-lg flex justify-between items-center">
            <div><p className="text-gray-400 text-xs font-bold uppercase">Total Solved</p><h3 className="text-2xl font-bold">{resolvedAlerts.length}</h3></div>
            <CheckCircle size={24} className="text-green-500 opacity-50"/>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl border-l-4 border-red-500 shadow-lg flex justify-between items-center">
            <div><p className="text-gray-400 text-xs font-bold uppercase">Active Now</p><h3 className="text-2xl font-bold">{activeAlerts.length}</h3></div>
            <AlertTriangle size={24} className="text-red-500 opacity-50"/>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl border-l-4 border-blue-500 shadow-lg flex justify-between items-center">
            <div><p className="text-gray-400 text-xs font-bold uppercase">Shelter Cap</p><h3 className="text-2xl font-bold">{totalCapacity}</h3></div>
            <Shield size={24} className="text-blue-500 opacity-50"/>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl border-l-4 border-yellow-500 shadow-lg flex justify-between items-center">
            <div><p className="text-gray-400 text-xs font-bold uppercase">System Load</p><h3 className="text-2xl font-bold">Normal</h3></div>
            <Activity size={24} className="text-yellow-500 opacity-50"/>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        
        {/* CHART 1: RESOLUTION STATUS (NEW) */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <h3 className="font-bold text-gray-300 mb-4 flex items-center gap-2"><CheckCircle size={16}/> Case Resolution</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={resolutionData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {resolutionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={RES_COLORS[index % RES_COLORS.length]} />))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: '#fff' }} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* CHART 2: SHELTER CAPACITY */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <h3 className="font-bold text-gray-300 mb-4 flex items-center gap-2"><Shield size={16}/> Shelter Capacity</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={shelterData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" stroke="#9CA3AF" tick={{fontSize: 10}} />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: '#fff' }} />
                        <Bar dataKey="capacity" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* CHART 3: LIVE ACTIVITY */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 mb-4">
          <h3 className="font-bold text-gray-300 mb-4">📊 Incident Volume Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                    <defs>
                        <linearGradient id="colorSos" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/><stop offset="95%" stopColor="#EF4444" stopOpacity={0}/></linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: '#fff' }} />
                    <Area type="monotone" dataKey="sos" stroke="#EF4444" fillOpacity={1} fill="url(#colorSos)" />
                </AreaChart>
            </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
};

export default Analytics;