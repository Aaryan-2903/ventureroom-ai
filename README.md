# VentureRoom AI

> **Pitch your startup idea to an AI Board of Directors and get an investor-grade verdict in minutes.**

VentureRoom AI is a premium AI boardroom simulation for founders, students, indie hackers, and product builders. Instead of asking a single chatbot for startup advice, users present an idea to a virtual board of executives — including an investor, CTO, growth lead, and devil’s advocate — who debate the idea, challenge assumptions, vote, and generate a polished board report with actionable next steps.

---

## Live Demo

- **Website:** [Add your live URL here]
- **GitHub:** [Add your repository URL here]

---

## What It Does

VentureRoom AI helps users validate startup ideas before they spend time and money building the wrong thing.

Users can:
- submit a startup idea,
- start an AI board meeting,
- ask follow-up questions,
- receive opposing viewpoints,
- view individual director votes,
- and generate a structured executive report.

The experience is designed to feel like a real board meeting, not a generic chat interface.

---

## Key Features

- **AI Boardroom simulation** with four distinct executives
- **Streaming responses** for a live meeting feel
- **Investor-style discussion** with opposing viewpoints
- **Founder Q&A** with directors
- **Voting and board tally**
- **Executive report** with strengths, risks, opportunities, and next steps
- **Anonymous save & share links**
- **Dark premium UI** with executive glassmorphism
- **Responsive design** for desktop and mobile
- **No authentication required**

---

## AI Board Members

### Vera Sterling — Venture Partner
Focuses on:
- market size
- moat
- fundraising
- business model
- investor readiness
- competitive advantage

### Marcus Chen — CTO
Focuses on:
- architecture
- scalability
- security
- technical feasibility
- AI reliability
- implementation risk

### Sofia Reyes — Head of Growth
Focuses on:
- go-to-market
- acquisition
- retention
- partnerships
- pricing
- product positioning

### Devil’s Advocate — Contrarian
Focuses on:
- attacking assumptions
- exposing weak logic
- finding hidden risks
- challenging the moat
- identifying reasons the startup may fail

---

## How It Works

1. **Enter a startup idea**
2. **The board convenes**
3. **Each director gives an opening statement**
4. **The founder asks follow-up questions**
5. **Directors respond and challenge each other**
6. **Each director votes: Proceed / Pivot / Kill**
7. **The app generates an executive board report**
8. **The meeting can be saved and shared via link**

---

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Supabase
- **AI Orchestration:** Supabase Edge Functions
- **LLM Provider:** OpenAI / OpenRouter-compatible provider
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Deployment:** Natively AI / hosted web app
- **Storage:** Supabase database
- **Sharing:** Anonymous shareable meeting links

---

## Architecture

```mermaid
flowchart TD
    A[User enters startup idea] --> B[Frontend UI]
    B --> C[Supabase Edge Functions]
    C --> D[LLM Provider]
    D --> C
    C --> E[Board discussion stream]
    E --> F[Votes and board tally]
    F --> G[Executive report]
    G --> H[Anonymous save]
    H --> I[Shareable meeting link]

    subgraph Frontend
        B
    end

    subgraph Backend
        C
        E
        F
        G
        H
        I
    end
