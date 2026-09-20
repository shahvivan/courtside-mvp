#!/bin/zsh
cd /Users/jignesh/Documents/ventures/courtside-mvp || exit 1
if curl --max-time 2 -fsS http://localhost:3000/api/events >/dev/null; then
  open http://localhost:3000
  exit 0
fi
open http://localhost:3000
npm run dev -- --host 127.0.0.1
