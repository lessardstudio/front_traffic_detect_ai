# Используем Node.js версии 22.10.0 как базовый образ
FROM ubuntu:22.04
FROM node:22.10.0
# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json для установки зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install
RUN npm install -g eas-cli

# Копируем остальной код приложения
COPY . .

# Собираем приложение (если требуется)
# RUN npm run build

# Открываем порт, который будет использоваться приложением
EXPOSE 8082

# Команда для запуска приложения
CMD ["npm", "run", "buildapplocal"] 