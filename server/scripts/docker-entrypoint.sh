#!/bin/sh
# Docker Entrypoint Script
# Ensures system time is synchronized before starting the Node.js application
# This prevents Firebase Admin SDK "Invalid JWT Signature" errors

set -e

echo "=========================================="
echo "🕐 Checking system time synchronization..."
echo "=========================================="

# Display current system time
echo "Current system time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "Current timestamp: $(date +%s)"

# Check if we're in a container environment (Docker/Kubernetes)
if [ -f /.dockerenv ] || [ -f /run/.containerenv ]; then
    echo "✓ Running in containerized environment"
    
    # In containers, we rely on the host's time
    # Verify time is reasonable (after 2024-01-01 and before 2030-01-01)
    CURRENT_YEAR=$(date +%Y)
    if [ "$CURRENT_YEAR" -lt 2024 ] || [ "$CURRENT_YEAR" -gt 2030 ]; then
        echo "⚠️  WARNING: System time appears incorrect!"
        echo "   Current year: $CURRENT_YEAR"
        echo "   Expected: 2024-2030"
        echo "   This may cause Firebase authentication failures."
        echo ""
        echo "   Solutions:"
        echo "   1. Check host system time is synchronized"
        echo "   2. Ensure Docker daemon has correct time"
        echo "   3. Restart container to inherit updated host time"
    else
        echo "✓ System time appears valid (year: $CURRENT_YEAR)"
    fi
else
    echo "Running on bare metal/VM - checking NTP sync..."
    
    # Try to sync time using chrony if available
    if command -v chronyd >/dev/null 2>&1; then
        echo "Starting chrony for time synchronization..."
        chronyd -q 'server pool.ntp.org iburst' 2>/dev/null || true
        echo "✓ Time sync attempted with chrony"
    fi
fi

echo ""
echo "=========================================="
echo "🚀 Starting Node.js application..."
echo "=========================================="
echo ""

# Execute the main command (passed as arguments to this script)
exec "$@"
