# Nemotron Chat

A sleek dark-mode chatbot web app powered by NVIDIA `nvidia/nemotron-3.5-lightning-30b-a3b`.
Express backend proxies the NVIDIA API (your key never reaches the browser) and streams replies.

## Run on Replit

1. Import this project (upload the .zip, or drag the folder into a new Node.js Repl).
2. Open **Tools > Secrets** and add:
   - `NVIDIA_API_KEY` = your key from https://build.nvidia.com (starts with `nvapi-`)
3. Press **Run**.

Optional secrets: `NVIDIA_MODEL` (override the model id) and `NVIDIA_BASE_URL`.

## Features

- Streaming responses with a stop button and regenerate
- Reasoning/thinking output shown in a collapsible block when the model sends it
- Multiple chats saved in your browser (localStorage)
- Markdown + code blocks with copy buttons
- Settings: system prompt, temperature, max tokens
- Mobile-friendly layout

## Run locally

    npm install
    NVIDIA_API_KEY=nvapi-xxxx npm start
