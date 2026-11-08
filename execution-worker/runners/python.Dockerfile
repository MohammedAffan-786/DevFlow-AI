# ==============================================================================
# Hardened Isolated Python Test Execution Sandbox Image
# ==============================================================================
FROM python:3.11-slim

# Prevent bytecode write to read-only root and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/workspace

# Install minimal test runner dependencies
RUN pip install --no-cache-dir \
    pytest==8.1.1 \
    pytest-json-report==1.5.0 \
    pytest-timeout==2.3.1

# Create non-root unprivileged execution user and group (UID/GID 10001)
RUN groupadd -g 10001 sandboxgroup && \
    useradd -u 10001 -g sandboxgroup -s /sbin/nologin -d /workspace -M sandboxuser

# Create workspace directory with restricted permissions
WORKDIR /workspace
RUN chown -R 10001:10001 /workspace && \
    chmod 755 /workspace

# Switch permanently to unprivileged user
USER 10001:10001

CMD ["pytest", "--json-report", "--json-report-file=/tmp/report.json", "--timeout=10"]
