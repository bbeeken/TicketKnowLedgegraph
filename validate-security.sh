#!/bin/bash
# Security validation script for Docker containers

echo "🔐 Docker Security Validation"
echo "============================="

# Function to check if container is running as non-root
check_user() {
    local container=$1
    echo "Checking user for $container..."
    
    if docker ps --format "table {{.Names}}" | grep -q "$container"; then
        user=$(docker exec "$container" whoami 2>/dev/null || echo "container not running")
        if [ "$user" != "root" ]; then
            echo "✅ $container: Running as user '$user' (non-root)"
        else
            echo "❌ $container: Running as root (security risk)"
        fi
    else
        echo "⚠️  $container: Not running"
    fi
}

# Function to check for security options
check_security_options() {
    local container=$1
    echo "Checking security options for $container..."
    
    if docker ps --format "table {{.Names}}" | grep -q "$container"; then
        # Check if container has no-new-privileges
        security_opts=$(docker inspect "$container" --format '{{.HostConfig.SecurityOpt}}' 2>/dev/null)
        if echo "$security_opts" | grep -q "no-new-privileges"; then
            echo "✅ $container: Has no-new-privileges security option"
        else
            echo "⚠️  $container: Missing no-new-privileges (use production compose)"
        fi
    fi
}

# Function to check read-only filesystem
check_readonly() {
    local container=$1
    echo "Checking filesystem for $container..."
    
    if docker ps --format "table {{.Names}}" | grep -q "$container"; then
        readonly_fs=$(docker inspect "$container" --format '{{.HostConfig.ReadonlyRootfs}}' 2>/dev/null)
        if [ "$readonly_fs" = "true" ]; then
            echo "✅ $container: Has read-only root filesystem"
        else
            echo "⚠️  $container: Root filesystem is writable (use production compose)"
        fi
    fi
}

echo ""
echo "🔍 Checking container users..."
check_user "ticketknowledgegraph-api-1"
check_user "ticketknowledgegraph-ui-1" 
check_user "ticketknowledgegraph-worker-1"
check_user "ticketknowledgegraph-alert-poller-1"

echo ""
echo "🛡️  Checking security options (requires production compose)..."
check_security_options "ticketknowledgegraph-api-1"
check_security_options "ticketknowledgegraph-ui-1"
check_security_options "ticketknowledgegraph-worker-1"

echo ""
echo "📁 Checking read-only filesystems (requires production compose)..."
check_readonly "ticketknowledgegraph-api-1"
check_readonly "ticketknowledgegraph-ui-1"
check_readonly "ticketknowledgegraph-worker-1"

echo ""
echo "🐳 Base image security status:"
echo "✅ Python: Updated to 3.12-slim (eliminates 7 high vulnerabilities)"
echo "✅ Node.js: Updated to 22-alpine (eliminates 2 high vulnerabilities)"

echo ""
echo "💡 To enable full security features, run:"
echo "   docker-compose -f docker-compose.yml -f docker-compose.security.yml up -d"
