#!/bin/sh
# Pardus / Linux / macOS icin: siteyi http://localhost:8000 adresinden acar (python3 gerekir).
# Port her zaman 8000 olmalidir: yerel moddaki veriler tarayicida bu adrese bagli tutulur.
cd "$(dirname "$0")" || exit 1
( sleep 1; xdg-open http://localhost:8000/ 2>/dev/null || open http://localhost:8000/ 2>/dev/null ) &
echo "Oyun Arastirmasi sitesi acik: http://localhost:8000  (kapatmak icin Ctrl+C)"
exec python3 -m http.server 8000 --bind 127.0.0.1
