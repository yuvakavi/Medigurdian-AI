FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY seed.py .

RUN mkdir -p /app/uploads/reports
RUN mkdir -p /app/uploads/documents
RUN mkdir -p /app/chroma_db

EXPOSE 10000


CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
