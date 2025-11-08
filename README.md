# 🎙️ AI Voice Agent

> A real-time multilingual AI voice assistant with automatic speech detection, powered by Groq Whisper & LLaMA, Microsoft Edge TTS, and LiveKit WebRTC.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![LiveKit](https://img.shields.io/badge/LiveKit-WebRTC-green)](https://livekit.io/)
[![Groq](https://img.shields.io/badge/Groq-AI-orange)](https://groq.com/)

## ✨ Features

- 🎯 **Automatic Speech Detection** - No buttons, just speak naturally
- 🌍 **14+ Languages Support** - English, Hindi, Spanish, French, German, Japanese, Chinese, Arabic, and more
- ⚡ **Ultra-Fast Responses** - Powered by Groq's LLaMA 3.3 70B
- 🎭 **Natural Voice Output** - Microsoft Edge TTS with multiple voice options
- 🎨 **Minimal Black UI** - Clean, distraction-free interface
- 🔊 **Smart Audio Processing** - Silence detection, noise filtering, and audio queuing
- 💬 **Real-Time Conversation** - See transcripts as you speak

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Next.js + React 19)                          │
│  ├─ Voice Selection Dropdown (14 languages)             │
│  ├─ Automatic Recording (Web Audio API)                 │
│  ├─ Silence Detection (3s timeout)                      │
│  └─ Audio Queue Management                              │
└─────────────────┬───────────────────────────────────────┘
                  │ WebSocket (port 3002)
                  ↓
┌─────────────────────────────────────────────────────────┐
│  Backend (Express + TypeScript)                         │
│  ├─ Audio Stream Processing                             │
│  ├─ Groq Whisper (Speech-to-Text)                       │
│  ├─ Groq LLaMA 3.3 70B (AI Responses)                   │
│  ├─ Microsoft Edge TTS (Text-to-Speech)                 │
│  └─ LiveKit Integration (Room Management)               │
└─────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
Voice-chat/
├── frontend/                  # Next.js 16 + React 19
│   ├── app/
│   │   ├── page.tsx          # Main entry point
│   │   └── api/token/        # LiveKit token generation
│   ├── components/
│   │   └── VoiceChat.tsx     # Main voice chat component
│   └── package.json
│
└── backend/                   # Express + TypeScript
    ├── src/
    │   ├── index.ts          # WebSocket server
    │   ├── voiceAgent.ts     # Core voice processing
    │   └── services/
    │       ├── groqSTT.ts    # Whisper transcription
    │       ├── groqLLM.ts    # LLaMA responses
    │       └── edgeTTS.ts    # Speech synthesis
    └── package.json
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- [Groq API Key](https://console.groq.com) (Free tier available)
- [LiveKit Account](https://cloud.livekit.io) (Free 10k minutes/month)

### 1️⃣ Clone Repository

```bash
git clone https://github.com/PankajKumardev/ai-voice-agent
cd ai-voice-agent
```

### 2️⃣ Backend Setup

```bash
cd backend
npm install

# Create .env file
cat > .env << EOF
PORT=3001
GROQ_API_KEY=your_groq_api_key_here
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_secret
LIVEKIT_URL=wss://your-project.livekit.cloud
EOF

# Start backend
npm run dev
```

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_secret
EOF

# Start frontend
npm run dev
```

### 4️⃣ Open Browser

Navigate to `http://localhost:3000` and start speaking! 🎉

## 🔧 Configuration

### Supported Languages & Voices

| Language           | Voice Options   | Language Code |
| ------------------ | --------------- | ------------- |
| 🇮🇳 English (India) | Neerja, Prabhat | en-IN         |
| 🇮🇳 Hindi           | Swara, Madhur   | hi-IN         |
| 🇺🇸 English (US)    | Aria, Guy       | en-US         |
| 🇬🇧 English (UK)    | Sonia, Ryan     | en-GB         |
| 🇪🇸 Spanish         | Elvira          | es-ES         |
| 🇫🇷 French          | Denise          | fr-FR         |
| 🇩🇪 German          | Katja           | de-DE         |
| 🇯🇵 Japanese        | Nanami          | ja-JP         |
| 🇨🇳 Chinese         | Xiaoxiao        | zh-CN         |
| 🇸🇦 Arabic          | Zariyah         | ar-SA         |

### Audio Detection Settings

```typescript
// In frontend/components/VoiceChat.tsx
const SPEECH_THRESHOLD = 50; // Volume threshold
const MIN_SPEAKING_DURATION = 500; // Must speak 500ms
const SILENCE_DURATION = 3000; // 3s silence timeout
const MIN_AUDIO_SIZE = 100000; // 100KB minimum
```

## 🎯 How It Works

### Speech Recognition Flow

```
User Speaks → Silence Detection (3s) → Audio Chunk (>100KB)
    → WebSocket Send → Groq Whisper Transcription
    → Language Detection → Groq LLaMA Response
    → Edge TTS Synthesis → Audio Playback
```

### Key Features Implementation

**Automatic Language Detection:**

```typescript
// Voice name: "hi-IN-SwaraNeural" → language: "hi"
if (voice.startsWith('hi-')) language = 'hi';
else if (voice.startsWith('en-IN')) language = 'en-IN';
// ... auto-detects from voice selection
```

**Smart Audio Filtering:**

```typescript
// Rejects background noise and repetitive patterns
- Minimum 5 characters in transcript
- Filters repetitive words (>70% same)
- Requires 2+ words or 10+ characters
- Ignores punctuation-only transcripts
```

**Pure Language Responses:**

```typescript
// Language-specific system prompts prevent mixing
Hindi: 'केवल हिंदी में जवाब दें';
English: 'Respond in PURE ENGLISH ONLY';
// Prevents Hinglish or mixed language responses
```

## 📊 Performance

- **Response Time**: ~2-3 seconds (STT + LLM + TTS)
- **Groq Whisper**: 150-300ms transcription
- **Groq LLaMA 3.3 70B**: 800-1200ms response generation
- **Edge TTS**: 200-400ms speech synthesis
- **Audio Quality**: 48kHz sample rate, mono channel

## � Troubleshooting

<details>
<summary><b>No audio detected</b></summary>

- Check microphone permissions in browser
- Try increasing speech threshold (lower value = more sensitive)
- Verify mic is not muted in system settings
- Test with `navigator.mediaDevices.getUserMedia()`
</details>

<details>
<summary><b>Language not changing</b></summary>

- Select a different voice from dropdown
- Conversation history clears on voice change
- Backend should show new language code in logs
- Check browser console for "Voice changed from X to Y"
</details>

<details>
<summary><b>Picking up background noise</b></summary>

- Increase `SPEECH_THRESHOLD` from 50 to 60-70
- Increase `MIN_AUDIO_SIZE` from 100KB to 150KB
- Use in quieter environment
- Enable browser noise suppression
</details>

<details>
<summary><b>WebSocket connection failed</b></summary>

- Ensure backend is running on port 3002
- Check firewall/antivirus isn't blocking WebSocket
- Verify backend logs show "WebSocket server running"
- Try restarting both frontend and backend
</details>

## 🚀 Deployment

### Backend → Railway

```bash
# railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

1. Push code to GitHub
2. Connect Railway to repository
3. Add environment variables
4. Deploy automatically

### Frontend → Vercel

```bash
vercel --prod
```

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy automatically

**Update WebSocket URL** in frontend after backend deployment:

```typescript
// Change to your Railway URL
wsRef.current = new WebSocket('wss://your-backend.railway.app');
```

## 💰 Cost Breakdown

| Service      | Free Tier     | Cost After             |
| ------------ | ------------- | ---------------------- |
| **Groq**     | 30 req/min    | Free (generous limits) |
| **Edge TTS** | Unlimited     | Free forever           |
| **LiveKit**  | 10k min/month | $0.006/min             |
| **Railway**  | 500 hours     | $5/month               |
| **Vercel**   | Unlimited     | $20/month (Pro)        |

**Estimated Monthly Cost:** $0-5 for personal use 🎉

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend**: Express, TypeScript, WebSocket (ws)
- **AI**: Groq (Whisper large-v3, LLaMA 3.3 70B)
- **TTS**: Microsoft Edge TTS (edge-tts-universal)
- **WebRTC**: LiveKit Client & Server SDK
- **Audio**: Web Audio API, MediaRecorder API

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- [Groq](https://groq.com/) for blazing-fast AI inference
- [Microsoft](https://azure.microsoft.com/en-us/products/ai-services/text-to-speech) for Edge TTS
- [LiveKit](https://livekit.io/) for WebRTC infrastructure
- [Vercel](https://vercel.com/) for Next.js hosting
- [Railway](https://railway.app/) for backend deployment

---

<div align="center">

**Made with ❤️ by [Your Name]**

[⭐ Star this repo](https://github.com/yourusername/ai-voice-agent) • [🐛 Report Bug](https://github.com/yourusername/ai-voice-agent/issues) • [✨ Request Feature](https://github.com/yourusername/ai-voice-agent/issues)

</div>
