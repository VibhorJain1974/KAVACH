"""
Generate hindi_alert.mp3 using gTTS (Google Text-to-Speech).
Run: pip install gtts && python generate_audio.py
"""
from gtts import gTTS
import os

text = (
    "Namaste. KAVACH alert. Aaj ek bada solar toofan aa raha hai. "
    "Apne bijli ke upkaran bandh karein. Grid failure ka khatre hai. "
    "Surakshit rahein."
)

tts = gTTS(text=text, lang='hi', slow=False)
out = os.path.join(os.path.dirname(__file__), 'hindi_alert.mp3')
tts.save(out)
print(f"Saved: {out}")
