# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage Dockerfile
#
# Stage 1: builder — installs all Python dependencies into a venv
# Stage 2: runtime — copies only the venv (no build tools in final image)
#
# Why multi-stage?
#   - Keeps final image lean (~40% smaller)
#   - Build tools (gcc, make) don't ship to production
#   - Layer caching: requirements changes don't rebuild the OS layer
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ─────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

# Install build dependencies
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

# Create isolated venv
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy only requirements first (layer cache: only re-runs if requirements change)
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# ── Stage 2: Runtime ───────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# Runtime system dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the venv from builder (no pip install in runtime layer)
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Security: run as non-root user
RUN groupadd -r studentai && useradd -r -g studentai studentai

# App directory
WORKDIR /app

# Copy application code
COPY --chown=studentai:studentai . .

# Create upload directory with correct permissions
RUN mkdir -p /app/uploads && chown -R studentai:studentai /app/uploads

# Switch to non-root user
USER studentai

# Expose FastAPI port
EXPOSE 8000

# Default command (overridden by docker-compose.yml per service)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
