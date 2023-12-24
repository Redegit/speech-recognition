FROM node:14 AS builder

WORKDIR /app

# Копируем файлы package.json и package-lock.json для установки зависимостей
COPY /front/package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код React-проекта
COPY /front/src ./src
COPY /front/public ./public

# Собираем проект
RUN npm run build

# Создаем отдельный этап для Flask-сервера
FROM python:3.9

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы Python-сервера
COPY /flask-server/requirements.txt .

# Устанавливаем зависимости Flask
RUN pip install -r requirements.txt

RUN apt update
RUN yes | apt install ffmpeg

# Копируем файлы Python-сервера
COPY /flask-server .

# Копируем собранные файлы React-проекта из предыдущего этапа
COPY --from=builder /app/build/*.html ./templates

# Копируем статические файлы
COPY --from=builder /app/build/static ./static


# Определяем переменные среды для Flask
ENV FLASK_APP=main.py
ENV FLASK_RUN_HOST=0.0.0.0

# Запускаем Flask-сервер при старте контейнера
CMD ["flask", "run"]
