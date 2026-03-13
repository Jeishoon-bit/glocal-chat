#!/bin/bash

# Iniciar LibreTranslate en segundo plano
echo "🌍 Iniciando LibreTranslate en puerto 5000..."
libretranslate --host 0.0.0.0 --port 5000 --load-only en,es,fr,de,it,pt,ja,ko,zh,ru --char-limit 0 &

# Esperar a que LibreTranslate esté listo
echo "⏳ Esperando a que LibreTranslate inicie..."
sleep 5

# Iniciar la app Node.js
echo "🚀 Iniciando servidor GLOCAL en puerto 3000..."
node server/server.js