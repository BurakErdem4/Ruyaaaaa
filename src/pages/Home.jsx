import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Sparkles, Send, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDreamContext } from '../context/DreamContext';

const PLACEHOLDERS = [
  "Dün gece ne gördün?...",
  "Az önceki uykunda zihninde neler canlandı?...",
  "Rüyanda en çok hangi duygu hakimdi?...",
  "Gündüz uykusunda karşına kimler çıktı?...",
  "Hatırlayabildiğin en tuhaf detay neydi?..."
];

const DREAM_TAGS = ["Kabus", "Bilinçli (Lucid)", "Tekrarlayan", "Uyku Felci", "Huzurlu", "Karmaşık", "Kehanet", "Sıradan", "Nostaljik", "Gerçeküstü"];

const Home = () => {
  const [dreamText, setDreamText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);
  const [selectedTags, setSelectedTags] = useState([]);
  
  const navigate = useNavigate();
  const { addDream, userProfile, setUserProfile } = useDreamContext();
  
  // SpeechRecognition referansı
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Sayfa yüklendiğinde rastgele bir placeholder seç
    const randomIdx = Math.floor(Math.random() * PLACEHOLDERS.length);
    setPlaceholder(PLACEHOLDERS[randomIdx]);

    // Web Speech API Kurulumu
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'tr-TR';

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        // Mevcut metni koruyup üzerine ekleme mantığı daha stabil olabilir ama basitlik adına 
        // sürekli dinlenen metni geçici olarak ekliyoruz.
        // Düzgün bir ekleme için interim sonuçları handle etmek gerekir.
        // Şimdilik basitçe son final sonucu ekleyelim:
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setDreamText(prev => prev + finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Tarayıcınız ses tanıma özelliğini desteklemiyor.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleLogout = () => {
    setUserProfile(null);
    navigate('/onboarding');
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!dreamText.trim()) return;
    
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/analyze-dream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: dreamText,
          zodiac: userProfile?.zodiac || 'Bilinmiyor'
        })
      });
      
      if (!response.ok) {
        throw new Error('API Hatası');
      }
      
      const data = await response.json();
      
      const newDreamId = addDream({
        text: dreamText,
        // Eğer kullanıcı etiket seçtiyse onları ekle, yoksa yapay zekanın bulduğu anahtar kelimeleri ekle
        keywords: selectedTags.length > 0 ? selectedTags : data.keywords,
        interpretations: {
          classic: data.classic_meaning,
          freud: data.freud_meaning,
          jung: data.jung_meaning,
          islamic: data.islamic_meaning,
          astrological: data.astrological_meaning
        },
        sentiment: data.sentiment,
        imageUrl: data.image_url
      });
      
      navigate(`/dream/${newDreamId}`);
    } catch (error) {
      console.error("Analiz motoru hatası:", error);
      alert("Rüyanız analiz edilirken bir hata oluştu (Sunucu kapalı veya API limiti aşılmış olabilir). Lütfen tekrar deneyin.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-gradient-to-b from-dream-dark via-dream-mid to-dream-light text-white p-6 pb-32">
      
      {/* Profil Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md flex justify-between items-center pt-6 pb-4"
      >
        <h1 className="text-xl font-light text-white/50 tracking-[0.3em] uppercase">
          Rüya Günlüğü
        </h1>
        {userProfile && (
          <div className="flex items-center gap-2 bg-white/5 pl-4 pr-2 py-2 rounded-full border border-white/10 group">
            <User size={14} className="text-dream-accent" />
            <span className="text-xs font-medium text-white/80">{userProfile.name}</span>
            <span className="text-[10px] text-white/40 uppercase tracking-widest px-1 border-l border-white/20 ml-1 pl-2">
              {userProfile.zodiac}
            </span>
            <button 
              onClick={handleLogout}
              className="ml-2 p-1.5 rounded-full hover:bg-red-500/20 hover:text-red-400 text-white/40 transition-colors"
              title="Çıkış Yap"
            >
              <LogOut size={12} />
            </button>
          </div>
        )}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md flex flex-col items-center gap-4 mt-2 flex-1"
      >
        
        <div className="relative flex flex-col items-center justify-center w-full mt-2">
          <AnimatePresence mode="wait">
            {isAnalyzing ? (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-6 min-h-[150px] justify-center mt-10"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="w-20 h-20 rounded-full border-t-2 border-r-2 border-dream-accent flex items-center justify-center"
                >
                  <Sparkles className="text-dream-accent" size={28} />
                </motion.div>
                <p className="text-dream-accent/80 font-light tracking-widest text-sm animate-pulse">
                  YAPAY ZEKA YORUMLUYOR...
                </p>
              </motion.div>
            ) : (
              <motion.div 
                key="input-area"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full relative flex flex-col gap-4"
              >
                <div className="flex items-center justify-between w-full px-2">
                  <p className="text-sm text-white/40 font-light">
                    {isListening ? "Dinleniyor..." : "Rüyanızı yazın veya sesli anlatın."}
                  </p>
                  <button 
                    onClick={toggleListening}
                    className={`p-3 rounded-full transition-all duration-300 ${
                      isListening 
                      ? 'bg-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse' 
                      : 'bg-dream-accent/20 text-dream-accent hover:bg-dream-accent/40'
                    }`}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                </div>
                
                <div className="relative group w-full">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-dream-accent/0 via-dream-accent/0 to-dream-accent/0 rounded-3xl blur opacity-0 group-focus-within:opacity-20 group-focus-within:via-dream-accent/40 transition-all duration-700 pointer-events-none" />
                  <textarea
                    value={dreamText}
                    onChange={(e) => setDreamText(e.target.value)}
                    disabled={isAnalyzing}
                    placeholder={placeholder}
                    className="
                      relative w-full h-56 bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 
                      text-white/90 placeholder-white/20 outline-none resize-none backdrop-blur-xl 
                      transition-all duration-500 focus:border-dream-accent/50 focus:bg-white/[0.04] 
                      shadow-inner font-light text-lg leading-relaxed
                      scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent
                    "
                  />
                  
                  <AnimatePresence>
                    {dreamText.trim().length > 0 && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSave}
                        className="absolute bottom-4 right-4 w-12 h-12 bg-gradient-to-tr from-[#7C3AED] to-[#8B5CF6] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)] text-white"
                      >
                        <Send size={20} className="ml-1" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-2 px-1">
                  {DREAM_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`text-[10px] px-3 py-1.5 rounded-full uppercase tracking-wider transition-all duration-300 ${
                        selectedTags.includes(tag)
                        ? 'bg-dream-accent text-white border border-dream-accent'
                        : 'bg-white/[0.03] text-white/50 border border-white/5 hover:border-white/20'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </motion.div>
    </div>
  );
};

export default Home;
