FROM node:18

# Instalar Python y dependencias para LibreTranslate
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv

# Instalar LibreTranslate
RUN pip3 install libretranslate

# Crear directorio para la app
WORKDIR /app

# Copiar archivos de la app
COPY package*.json ./
RUN npm install
COPY server/ ./server/
COPY public/ ./public/
COPY start.sh .

# Dar permisos de ejecución
RUN chmod +x start.sh

EXPOSE 3000 5000

CMD ["./start.sh"]