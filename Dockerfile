# ── Stage 1: Build ─────────────────────────────────────────────────────────
FROM python:3.10-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    poppler-utils \      
    tesseract-ocr \
    tesseract-ocr-eng \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --upgrade pip "setuptools<70.0.0" wheel && \
    pip install --no-cache-dir --no-build-isolation -r requirements.txt


# ── Stage 2: Runtime ───────────────────────────────────────────────────────
FROM python:3.10-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN groupadd -r studentai && useradd -r -g studentai studentai

WORKDIR /app

# Copy application code
COPY --chown=studentai:studentai . .

# Ensure the backend directory is the working directory for uvicorn
WORKDIR /app/backend

# Create upload directory with correct permissions
RUN mkdir -p /app/backend/uploads && chown -R studentai:studentai /app/backend/uploads

USER studentai

EXPOSE 10000

# Start the FastAPI app on port 10000 (Render's default port, or 8000 mapped by Render)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
