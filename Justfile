# Monthly Budget Calculator Justfile

# Variables
host := "192.168.0.221"
port := "1313"

# Default recipe shows help
default: help

# Show available recipes
@help:
    just --list

# Start development server
serve:
    @echo "Starting development server..."
    hugo server --disableFastRender --bind=0.0.0.0 --baseURL=http://{{host}}:{{port}}

# Show current configuration
config:
    @echo "Current configuration:"
    @echo "  Host: {{host}}"
    @echo "  Port: {{port}}"
