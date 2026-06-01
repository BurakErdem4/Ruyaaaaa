import os
import urllib.parse
import random
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv

load_dotenv(override=True)

app = FastAPI(title="Yapay Zeka Destekli Rüya Yorumlama - Ücretsiz Gemini API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ücretsiz Google Gemini İstemcisi
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class DreamRequest(BaseModel):
    text: str
    zodiac: str

class ImageRequest(BaseModel):
    text: str

class ImageResponse(BaseModel):
    image_url: str

class DreamResponse(BaseModel):
    sentiment: str
    classic_meaning: str
    freud_meaning: str
    jung_meaning: str
    islamic_meaning: str
    astrological_meaning: str
    keywords: List[str]
    image_url: str

class DreamAI:
    
    @staticmethod
    def pre_process_text(text: str) -> str:
        if not text:
            return ""
        return text.strip()

    @staticmethod
    def call_gemini(prompt: str, system_instruction: str) -> str:
        """Google Gemini modelini ücretsiz modda çağırır."""
        try:
            response = client.models.generate_content(
                model='models/gemini-2.5-flash',
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7
                )
            )
            return response.text.strip()
        except Exception as e:
            return f"Analiz motoru şu an yanıt vermiyor: {str(e)}"

    @staticmethod
    def extract_keywords_from_dream(dream_text: str) -> List[str]:
        """Gemini ile rüyadaki EN ÖNEMLİ TEK BİR NESNEYİ İngilizce olarak çeker."""
        try:
            response = client.models.generate_content(
                model='models/gemini-2.5-flash',
                contents=dream_text,
                config=genai.types.GenerateContentConfig(
                    system_instruction="""Sen bir kelime seçicisin. Rüyayı oku ve rüyadaki EN BELİRGİN, EN ÖNEMLİ TEK BİR FİZİKSEL NESNEYİ İngilizce tek bir kelime olarak yaz.
Örnek: "yarasalarla dolu bir ormanda şatoya sığındım" -> "castle"
Örnek: "köpek sürüsü beni kovaladı" -> "dog"
SADECE TEK BİR KELİME YAZ. Başka hiçbir şey ekleme.""",
                    temperature=0.1
                )
            )
            raw = response.text.strip().lower()
            # Boşluk veya virgül varsa sadece ilk kelimeyi al garantile
            clean_word = raw.split(',')[0].split(' ')[0]
            return [clean_word] if clean_word else ["nature"]
        except Exception:
            return ["nature"]

    @staticmethod
    def optimize_image_prompt(dream_text: str) -> str:
        """Gemini kullanarak rüya metnini profesyonel bir İngilizce görsel promptuna dönüştürür."""
        prompt_instruction = "Sen profesyonel bir yapay zeka prompt mühendisisin. Sadece İngilizce prompt metni üret, başka hiçbir açıklama yazma."
        prompt_text = f"Kullanıcı şöyle bir rüya görmüş: [{dream_text}]. Bu rüyayı sürrealist, detaylı ve yüksek kaliteli bir tablo olarak çizdirmek için İngilizce bir resim oluşturma promptu (image generation prompt) yazar mısın? Sadece prompt metnini döndür."
        return DreamAI.call_gemini(prompt=prompt_text, system_instruction=prompt_instruction)

    @staticmethod
    def generate_dream_image(dream_text: str) -> str:
        """Gemini ile prompt'u iyileştirip Pollinations AI üzerinden görsel oluşturur."""
        optimized_prompt = DreamAI.optimize_image_prompt(dream_text)
        
        # Eğer API hatası gelirse veya geçersiz bir yanıt dönerse varsayılan bir prompt kullan
        if not optimized_prompt or "Analiz motoru" in optimized_prompt:
            optimized_prompt = f"A surreal, highly detailed and high quality painting of this dream: {dream_text}"

        # İngilizce URL için uygun hale getiriyoruz
        clean_prompt = urllib.parse.quote(optimized_prompt)
        
        # Aynı rüyayı yazarsan farklı resim gelsin diye kilit numarası (seed)
        lock_id = random.randint(1, 1000000)
        
        # Pollinations AI görsel oluşturma linki
        return f"https://image.pollinations.ai/prompt/{clean_prompt}?width=1024&height=1024&nologo=true&seed={lock_id}"

    @staticmethod
    def analyze_dream_all_in_one(dream_text: str, zodiac: str) -> dict:
        import json
        system_instruction = """Sen profesyonel bir rüya analisti ve prompt mühendisisin.
Aşağıdaki rüyayı incele ve ÇIKTIYI SADECE GEÇERLİ BİR JSON OLARAK DÖN.
JSON formatı birebir şu şekilde olmalı:
{
  "sentiment": "SADECE tek kelime (Pozitif, Negatif veya Nötr)",
  "classic_meaning": "Geleneksel rüya sembollerine göre yorum",
  "freud_meaning": "Freudyen psikanaliz teorilerine göre yorum",
  "jung_meaning": "Jungiyen arketiplere göre analiz",
  "islamic_meaning": "İslami rüya tabiri",
  "astrological_meaning": "Kullanıcının burcuna göre astrolojik yorum",
  "image_prompt": "Rüyayı sürrealist, detaylı, yüksek kaliteli bir tablo olarak çizdirmek için İNGİLİZCE resim oluşturma promptu. (Sadece prompt metni)",
  "keywords": ["İNGİLİZCE EN ÖNEMLİ TEK NESNE KELİMESİ"]
}
Asla markdown kullanma, sadece saf JSON metni dön."""
        prompt = f"Rüya: {dream_text}\nKullanıcının Burcu: {zodiac}"
        
        try:
            response = client.models.generate_content(
                model='models/gemini-2.5-flash',
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7,
                    response_mime_type="application/json"
                )
            )
            return json.loads(response.text.strip())
        except Exception as e:
            print(f"JSON Çözümleme Hatası veya API Limiti: {e}")
            return {
                "sentiment": "Nötr",
                "classic_meaning": "Analiz motoru şu an meşgul veya API limiti aşıldı, lütfen daha sonra tekrar deneyin.",
                "freud_meaning": "Analiz motoru şu an meşgul, lütfen daha sonra tekrar deneyin.",
                "jung_meaning": "Analiz motoru şu an meşgul, lütfen daha sonra tekrar deneyin.",
                "islamic_meaning": "Analiz motoru şu an meşgul, lütfen daha sonra tekrar deneyin.",
                "astrological_meaning": "Analiz motoru şu an meşgul, lütfen daha sonra tekrar deneyin.",
                "image_prompt": f"A surreal painting of this dream: {dream_text}",
                "keywords": ["dream"]
            }

@app.post("/api/generate-image", response_model=ImageResponse)
async def generate_image_endpoint(request: ImageRequest):
    try:
        cleaned_text = DreamAI.pre_process_text(request.text)
        if not cleaned_text:
            raise HTTPException(status_code=400, detail="Rüya içeriği boş olamaz.")
        
        img_url = DreamAI.generate_dream_image(cleaned_text)
        return ImageResponse(image_url=img_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Görsel oluşturma hatası: {str(e)}")

@app.post("/api/analyze-dream", response_model=DreamResponse)
async def analyze_dream_endpoint(request: DreamRequest):
    try:
        cleaned_text = DreamAI.pre_process_text(request.text)
        if not cleaned_text:
            raise HTTPException(status_code=400, detail="Rüya içeriği boş olamaz.")

        # Tek bir Gemini isteği ile TÜM JSON verisini alıyoruz
        data = DreamAI.analyze_dream_all_in_one(cleaned_text, request.zodiac)
        
        # Image prompt'unu URL'ye dönüştür
        image_prompt = data.get("image_prompt", f"A surreal painting of this dream: {cleaned_text}")
        clean_prompt = urllib.parse.quote(image_prompt)
        lock_id = random.randint(1, 1000000)
        img_url = f"https://image.pollinations.ai/prompt/{clean_prompt}?width=1024&height=1024&nologo=true&seed={lock_id}"

        return DreamResponse(
            sentiment=data.get("sentiment", "Nötr"),
            classic_meaning=data.get("classic_meaning", ""),
            freud_meaning=data.get("freud_meaning", ""),
            jung_meaning=data.get("jung_meaning", ""),
            islamic_meaning=data.get("islamic_meaning", ""),
            astrological_meaning=data.get("astrological_meaning", ""),
            keywords=data.get("keywords", ["dream"]),
            image_url=img_url
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sistem analiz motoru hatası: {str(e)}")