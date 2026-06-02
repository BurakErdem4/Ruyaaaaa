import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Mail, Lock, Calendar, Loader2 } from 'lucide-react';
import { useDreamContext } from '../context/DreamContext';
import { getZodiacSign } from '../utils/zodiac';

const Register = () => {
  const navigate = useNavigate();
  const { setUserProfile } = useDreamContext();
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    day: '01', 
    month: '1', 
    year: '2000' 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Firebase Auth'ta Kullanıcı Oluştur
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Zodiac ve DOB hesapla
      const dobStr = `${formData.year}-${String(formData.month).padStart(2, '0')}-${String(formData.day).padStart(2, '0')}`;
      const zodiac = getZodiacSign(parseInt(formData.day), parseInt(formData.month));

      const userData = {
        email: formData.email,
        dob: dobStr,
        zodiac: zodiac || 'Bilinmiyor',
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, "kullanicilar", user.uid), userData);

      // Context'i güncelle
      setUserProfile(userData);
      
      // Başarılı olunca ana sayfaya yönlendir
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Kayıt başarısız: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#080B14] flex flex-col items-center justify-center relative overflow-hidden px-6">
      
      {/* Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-dream-accent/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-white tracking-widest mb-2">Aramıza Katıl</h1>
          <p className="text-sm text-dream-accent/70 font-light">Bilinçaltının derinliklerini keşfet</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
            <input 
              type="email"
              required
              placeholder="E-posta adresiniz"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-dream-accent transition-colors"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
            <input 
              type="password"
              required
              placeholder="Şifreniz (En az 6 karakter)"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-dream-accent transition-colors"
            />
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
              <Calendar size={20} />
            </div>
            
            <div className="w-full bg-black/20 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 flex items-center gap-2 focus-within:border-dream-accent transition-colors">
              <span className="text-white/30 text-sm hidden sm:inline mr-2">Doğum Tarihi:</span>
              
              <select 
                value={formData.day}
                onChange={(e) => setFormData({...formData, day: e.target.value})}
                className="bg-transparent text-white outline-none cursor-pointer text-sm flex-1"
                style={{ colorScheme: 'dark' }}
              >
                {[...Array(31).keys()].map(d => (
                  <option key={d + 1} value={d + 1} className="bg-[#0E0D1F] text-white">
                    {String(d + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>

              <select 
                value={formData.month}
                onChange={(e) => setFormData({...formData, month: e.target.value})}
                className="bg-transparent text-white outline-none cursor-pointer text-sm flex-1 border-x border-white/10 px-2 mx-1"
                style={{ colorScheme: 'dark' }}
              >
                {['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'].map((m, idx) => (
                  <option key={idx + 1} value={idx + 1} className="bg-[#0E0D1F] text-white">
                    {m}
                  </option>
                ))}
              </select>

              <select 
                value={formData.year}
                onChange={(e) => setFormData({...formData, year: e.target.value})}
                className="bg-transparent text-white outline-none cursor-pointer text-sm flex-1"
                style={{ colorScheme: 'dark' }}
              >
                {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y} className="bg-[#0E0D1F] text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-white/40 mt-1 ml-2">Astrolojik rüya analizi (Burç) için doğum tarihiniz gereklidir.</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            type="submit"
            className="w-full py-4 mt-4 rounded-2xl bg-gradient-to-r from-dream-accent to-blue-600 text-white font-medium shadow-[0_0_20px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Kayıt Ol'}
          </motion.button>
        </form>

        <p className="text-center text-xs text-white/50 mt-6">
          Zaten hesabın var mı? {' '}
          <Link to="/login" className="text-dream-accent hover:underline">
            Giriş Yap
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
