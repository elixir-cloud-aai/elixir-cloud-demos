# Use Python 3.10 for cwl-tes compatibility
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        openjdk-17-jre-headless \
        curl \
        git \
        build-essential \
        && rm -rf /var/lib/apt/lists/*

# Set workdir
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt ./
RUN pip install 'pip<21.3' 'setuptools<58'
RUN pip install Cython wheel
RUN pip uninstall -y pulp && pip install --no-cache-dir --force-reinstall 'pulp==2.6.0'
RUN pip install --no-cache-dir -r requirements.txt   

# Copy the rest of the app
COPY . .

# FINAL: Force Nextflow install after all other steps
RUN rm -f /usr/local/bin/nextflow /usr/bin/nextflow && \
    curl -s https://get.nextflow.io | bash && \
    mv nextflow /usr/local/bin/ && \
    chmod +x /usr/local/bin/nextflow && \
    ln -sf /usr/local/bin/nextflow /usr/bin/nextflow && \
    nextflow -version

# Add user-level pip bin and /usr/local/bin to PATH
ENV PATH="/root/.local/bin:/usr/local/bin:/usr/bin:$PATH"

# (Optional) Print nextflow version for debug
RUN nextflow -version

# Entrypoint script for runtime PATH debug
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose Flask port
EXPOSE 5000

# Set environment variables for Flask
ENV FLASK_APP=tes_dashboard.py
ENV FLASK_RUN_HOST=0.0.0.0

# Entrypoint
CMD ["/entrypoint.sh"] 