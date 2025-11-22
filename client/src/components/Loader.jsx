import { Activity } from 'lucide-react';

const Loader = () => {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-900 z-[9999] fixed top-0 left-0">
      {/* Heartbeat Animation */}
      <div className="relative">
        <Activity size={64} className="text-red-600 animate-bounce" />
        <div className="absolute top-0 left-0 w-full h-full bg-red-500 blur-xl opacity-20 animate-pulse"></div>
      </div>
      
      <h1 className="text-3xl font-extrabold text-white mt-6 tracking-widest">
        RESCUE<span className="text-red-500">HQ</span>
      </h1>
      
      <div className="flex items-center gap-2 mt-2 text-gray-400 text-xs uppercase tracking-wide">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
        Establishing Satellite Link...
      </div>
    </div>
  );
};

export default Loader;