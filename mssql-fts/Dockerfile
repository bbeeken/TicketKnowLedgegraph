# Custom SQL Server with Full-Text Search
FROM mcr.microsoft.com/mssql/server:2022-latest

# Switch to root to install packages
USER root

# Update and install Full-Text Search
RUN apt-get update && \
    apt-get install -y curl && \
    # Download and install mssql-server-fts
    curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | apt-key add - && \
    curl https://packages.microsoft.com/config/ubuntu/20.04/mssql-server-2022.list > /etc/apt/sources.list.d/mssql-server-2022.list && \
    apt-get update && \
    ACCEPT_EULA=Y apt-get install -y mssql-server-fts && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Switch back to mssql user
USER mssql

# Expose the default port
EXPOSE 1433

# Start SQL Server
CMD ["/opt/mssql/bin/sqlservr"]
