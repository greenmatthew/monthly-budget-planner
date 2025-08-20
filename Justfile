# Monthly Budget Calculator Justfile

# Variables
host := "0.0.0.0"
port := "8080"

# Default recipe shows help
default: help

# Show available recipes
@help:
    just --list

# Start development server
serve:
    @echo "Starting development server..."
    python3 -m http.server {{port}} --bind {{host}}

# Check if required dependencies are available
check:
    @echo "Checking dependencies..."
    @python3 --version || (echo "Python 3 is required but not installed" && exit 1)
    @echo "✓ Python 3 is available"
    @echo "✓ All dependencies satisfied"

# Show current configuration
config:
    @echo "Current configuration:"
    @echo "  Host: {{host}}"
    @echo "  Port: {{port}}"

# Clean up any leftover python server processes on this port
clean:
    @echo "Cleaning up any leftover server processes on port {{port}}..."
    @pkill -f "python3 -m http.server {{port}}" 2>/dev/null || echo "No processes found to clean"