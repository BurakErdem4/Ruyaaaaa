import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDreamContext } from '../context/DreamContext';
import { ArrowLeft, Star, Sparkles, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';

const TABS = [
  { id: 'classic', label: 'Klasik' },
  { id: 'freud', label: 'Freud' },
  { id: 'jung', label: 'Jung' },
  { id: 'islamic', label: 'İslami' },
  { id: 'astrological', label: 'Astrolojik' }
];

const DreamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { dreams, toggleFavorite, setImageForDream, deleteDream } = useDreamContext();
  
  const dream = dreams.find(d => d.id === id);
  const [activeTab, setActiveTab] = useState('classic');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!dream) return <div className="p-10 text-center text-white">Rüya bulunamadı.</div>;

  const handleGenerateImage = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: dream.text })
      });
      
      if (!response.ok) throw new Error('API Hatası');
      
      const data = await response.json();
      setImageForDream(dream.id, data.image_url);
    } catch (error) {
      console.error('Görsel oluşturulamadı:', error);
      // Hata durumunda Fallback görsel atıyoruz
      setImageForDream(dream.id, "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop");
    } finally {
      setIsGenerating(false);
    }
  };

  const getInterpretationText = () => {
    if (!dream.interpretations) return "Yorumlama bulunamadı.";
    return dream.interpretations[activeTab] || "Bu ekolde yorum bulunamadı.";
  };

  const handleDelete = () => {
    deleteDream(dream.id);
    navigate('/journal');
  };

  return (
    <div className="min-h-screen w-full bg-dream-dark text-white pb-32">
      {/* Nav */}
      <div className="w-full p-6 pt-8 flex justify-between items-center">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        
        <div className="flex gap-2">
          <button 
            onClick={() => toggleFavorite(dream.id)}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
          >
            <Star size={20} className={dream.isFavorite ? "text-yellow-500 fill-yellow-500" : "text-white"} />
          </button>
          <button 
            onClick={handleDelete}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-red-500/20 hover:text-red-400 transition-colors text-white"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 max-w-md mx-auto flex flex-col gap-6"
      >
        {/* Görsel Kutusu */}
        <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-black/40 border border-white/10 shadow-lg">
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center z-10"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-dream-accent blur-xl rounded-full opacity-30 animate-pulse" />
                  <Loader2 size={40} className="text-dream-accent animate-spin relative z-10" />
                </div>
                <p className="text-xs tracking-[0.2em] uppercase text-dream-accent/70 mt-4 animate-pulse">Yapay Zeka Çiziyor...</p>
              </motion.div>
            ) : dream.imageUrl ? (
              <motion.img 
                key="image"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                src={dream.imageUrl} 
                alt="Dream visualization" 
                className="w-full h-full object-cover"
              />
            ) : (
              <motion.div 
                key="no-image"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center z-10"
              >
                <button 
                  onClick={handleGenerateImage}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-dream-accent/20 border border-dream-accent/30 hover:bg-dream-accent/40 text-dream-accent transition-all"
                >
                  <ImageIcon size={20} />
                  <span className="font-light text-sm tracking-wider">Görselleştir</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-dream-accent">{dream.date}</span>
          <p className="text-lg font-light leading-relaxed text-white/90">"{dream.text}"</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {dream.keywords?.map(k => (
            <span key={k} className="text-[10px] px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-white/70 uppercase tracking-wider">
              {k}
            </span>
          ))}
        </div>

        {/* Yorumlama Sekmeleri */}
        {dream.interpretations && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mt-4">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs transition-all duration-300 ${
                  activeTab === tab.id 
                  ? 'bg-dream-accent text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]' 
                  : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Yorumlama İçeriği */}
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-6 rounded-3xl bg-dream-accent/5 border border-dream-accent/20 relative overflow-hidden mt-2"
        >
          <div className="absolute -right-4 -top-4 text-dream-accent/10">
            <Sparkles size={100} />
          </div>
          <div className="relative z-10 flex flex-col gap-3">
            <h3 className="text-sm tracking-widest uppercase text-dream-accent flex items-center gap-2">
              <Sparkles size={16} /> YORUMLAMA ({TABS.find(t => t.id === activeTab)?.label})
            </h3>
            <p className="text-sm font-light leading-relaxed text-white/80">
              {getInterpretationText()}
            </p>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default DreamDetail;
