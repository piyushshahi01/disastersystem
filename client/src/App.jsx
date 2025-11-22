import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Citizen from './pages/Citizen';
import Responder from './pages/Responder';
import Admin from './pages/Admin';

// Protection Component
const ProtectedRoute = ({ children, allowedRole }) => {
  const role = localStorage.getItem('role');
  
  // 1. If not logged in, go to Login
  if (!role) return <Navigate to="/" />;
  
  // 2. If role doesn't match, go to Login (or Unauthorized page)
  if (role !== allowedRole) return <Navigate to="/" />;

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Protected Routes */}
        <Route 
          path="/citizen" 
          element={
            <ProtectedRoute allowedRole="citizen">
              <Citizen />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/responder" 
          element={
            <ProtectedRoute allowedRole="responder">
              <Responder />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRole="admin">
              <Admin />
            </ProtectedRoute>
          } 
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;