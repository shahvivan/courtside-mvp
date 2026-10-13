#!/bin/zsh
cd "$(dirname "$0")" || exit 1
if curl --max-time 2 -fsS http://localhost:3000/api/events >/dev/null; then
  open http://localhost:3000
  exit 0
fi
open http://localhost:3000
npm run dev -- --host 127.0.0.1
