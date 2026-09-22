# 🌍 Multi-Agent Travel Planner

A **real** multi-agent travel planning system built with **Google ADK** (`google-adk`), **FastMCP** servers, and the **A2A protocol**. Every agent is a distinct `LlmAgent` instance, every MCP server is a separately running `FastMCP` process, and all agent-to-agent communication uses real A2A protocol with Agent Cards and `RemoteA2aAgent`.

## Architecture

```
┌─────────────────────┐     ┌──────────────────────────────┐
│  Next.js Frontend   │────▶│  FastAPI Backend (port 8000)  │
│  (port 3000)        │     │                              │
└─────────────────────┘     └──────────┬───────────────────┘
                                       │
                          ┌────────────▼─────────────┐
                          │  Itinerary Planner Agent  │
                          │  (gemini-pro orchestrator)│
                          └────┬────────┬────────┬───┘
                               │        │        │
                          A2A  │   A2A  │   A2A  │  MCP
                               │        │        │
                    ┌──────────▼──┐ ┌───▼──────┐ │ ┌──────────┐
                    │Flight Agent │ │Hotel     │ │ │Maps MCP  │
                    │port 9001    │ │Agent 9002│ │ │port 8003 │
                    └──────┬──────┘ └───┬──────┘ │ └──────────┘
                           │            │        │       │
                      MCP  │       MCP  │        │  Nominatim
                           │            │        │  + OSRM
                    ┌──────▼────────────▼──┐     │
                    │  Travel API MCP      │     │
                    │  port 8001           │  ┌──▼──────────┐
                    │  (flights + hotels)  │  │Weather Agent │
                    └──────────────────────┘  │port 9003    │
                                              └──────┬──────┘
                                                     │ MCP
                                              ┌──────▼──────┐
                                              │Weather MCP  │
                                              │port 8002    │
                                              │(Open-Meteo) │
                                              └─────────────┘
```

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- A Google API key from [AI Studio](https://aistudio.google.com/apikey)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Set your API key
# Edit .env and replace 'your-gemini-api-key-here' with your actual key

# Start all 7 services
python start_all.py
```

This starts:
| Service | Port | Type |
|---------|------|------|
| Travel API MCP | 8001 | FastMCP (SSE) |
| Weather MCP | 8002 | FastMCP (SSE) |
| Maps MCP | 8003 | FastMCP (SSE) |
| Flight Agent | 9001 | A2A Server |
| Hotel Agent | 9002 | A2A Server |
| Weather Agent | 9003 | A2A Server |
| Backend API | 8000 | FastAPI |

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open http://localhost:3000

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/plan` | Create a new travel plan |
| `POST` | `/api/chat` | Chat to refine an existing plan |
| `GET` | `/api/session/{id}` | Get session information |
| `GET` | `/api/agent-cards` | Fetch all A2A agent cards |
| `GET` | `/api/logs/{id}` | Get A2A/MCP activity logs |
| `GET` | `/api/health` | Health check for all services |

## Verification

### Agent Cards
```bash
curl http://localhost:9001/.well-known/agent.json
curl http://localhost:9002/.well-known/agent.json
curl http://localhost:9003/.well-known/agent.json
```

### Health Check
```bash
curl http://localhost:8000/api/health
```

### Graceful Degradation
Kill the Weather MCP server, then submit a plan — the system returns a partial plan with weather marked as unavailable.

## Tech Stack

- **Backend**: Python, Google ADK, FastMCP, FastAPI, A2A Protocol
- **Frontend**: Next.js (App Router), TypeScript, CSS
- **AI Models**: Gemini 3.1 Flash Lite (sub-agents), Gemini 3.1 Pro (orchestrator)
- **External APIs**: Open-Meteo (weather), Nominatim (geocoding), OSRM (routing)
- **PDF Export**: jsPDF + html2canvas

## API Keys

Only **1 API key** is needed: `GOOGLE_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey).  
All other APIs (Open-Meteo, Nominatim, OSRM) are free and require no authentication.
