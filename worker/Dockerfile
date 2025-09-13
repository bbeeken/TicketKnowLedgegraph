FROM python:3.12-slim
RUN set -eux; \
	apt-get update; \
	apt-get upgrade -y; \
	apt-get install -y --no-install-recommends curl gnupg2 ca-certificates apt-transport-https unixodbc unixodbc-dev; \
	curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /usr/share/keyrings/microsoft.gpg; \
	echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/mssql-release.list; \
	apt-get update; \
	if ! (ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18); then \
		echo 'msodbcsql18 failed, trying msodbcsql17'; \
		ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql17 || (echo 'ODBC driver install failed' && exit 1); \
	fi; \
	apt-get purge -y --auto-remove gnupg2; \
	apt-get clean; \
	rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
