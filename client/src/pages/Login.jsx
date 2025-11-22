import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Shield, User, Lock, Activity, Mail, Key, Phone, Truck } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', email: '', password: '', role: 'citizen', secretKey: '', 
    phone: '', vehicleNumber: '' // New fields
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await axios.post(`http://localhost:5000${endpoint}`, formData);

      if (isRegister) {
        alert("Registration Successful! Please Login.");
        setIsRegister(false);
      } else {
        const { role, name, id, phone, vehicleNumber } = res.data.user;
        localStorage.setItem('role', role);
        localStorage.setItem('userName', name);
        localStorage.setItem('userId', id);
        if(phone) localStorage.setItem('userPhone', phone); // Save phone locally if needed

        if (role === 'admin') navigate('/admin');
        else if (role === 'responder') navigate('/responder');
        else navigate('/citizen');
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 bg-gray-900">
         {/* Background circles */}
         <div className="absolute top-10 left-10 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
         <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md z-10 border border-gray-700 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-center mb-6 text-red-500">
          <Activity size={48} />
        </div>
        <h2 className="text-3xl font-bold text-center mb-2">RescueConnect</h2>
        <p className="text-gray-400 text-center mb-6">
          {isRegister ? "Create a new account" : "Login to access dashboard"}
        </p>

        {error && <div className="bg-red-500/20 text-red-300 p-3 rounded mb-4 text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input name="name" type="text" placeholder="Full Name" className="w-full bg-gray-700 p-3 pl-10 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" onChange={handleChange} required />
              </div>
              
              <div className="relative">
                <Shield className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <select name="role" className="w-full bg-gray-700 p-3 pl-10 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-gray-300" onChange={handleChange} value={formData.role}>
                  <option value="citizen">Citizen</option>
                  <option value="responder">Rescue Team</option>
                  <option value="admin">Admin Authority</option>
                </select>
              </div>

              {/* Fields for Responders */}
              {formData.role === 'responder' && (
                <>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 text-green-400" size={18} />
                    <input name="phone" type="text" placeholder="Emergency Phone Number" className="w-full bg-gray-700 border border-green-500/30 p-3 pl-10 rounded-lg outline-none focus:ring-2 focus:ring-green-500" onChange={handleChange} required />
                  </div>
                  <div className="relative">
                    <Truck className="absolute left-3 top-3.5 text-blue-400" size={18} />
                    <input name="vehicleNumber" type="text" placeholder="Vehicle Number (e.g. DL-102)" className="w-full bg-gray-700 border border-blue-500/30 p-3 pl-10 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" onChange={handleChange} required />
                  </div>
                </>
              )}

              {formData.role !== 'citizen' && (
                <div className="relative">
                  <Key className="absolute left-3 top-3.5 text-red-400" size={18} />
                  <input name="secretKey" type="password" placeholder="Enter Secret Code" className="w-full bg-gray-800 border border-red-500/50 p-3 pl-10 rounded-lg outline-none focus:ring-2 focus:ring-red-500" onChange={handleChange} required />
                </div>
              )}
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
            <input name="email" type="email" placeholder="Email Address" className="w-full bg-gray-700 p-3 pl-10 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" onChange={handleChange} required />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
            <input name="password" type="password" placeholder="Password" className="w-full bg-gray-700 p-3 pl-10 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" onChange={handleChange} required />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 py-3 rounded-lg font-bold shadow-lg hover:from-blue-500 hover:to-blue-400 transition">
            {loading ? 'Processing...' : (isRegister ? 'Register Now' : 'Login')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            {isRegister ? "Already have an account?" : "Don't have an account?"}
            <button onClick={() => setIsRegister(!isRegister)} className="text-blue-400 font-bold ml-2 hover:underline">
              {isRegister ? "Login" : "Register"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;