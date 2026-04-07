#!/usr/bin/env python3
"""Sanitize code files by removing debug statements, console.log, etc."""
import sys
import re

def sanitize(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Remove console.log lines
    content = re.sub(r'^\s*console\.log\([^)]*\);\s*\n', '', content, flags=re.MULTILINE)
    # Remove debugger statements
    content = re.sub(r'^\s*debugger;\s*\n', '', content, flags=re.MULTILINE)
    # Remove print debug lines
    content = re.sub(r'^\s*print\([^)]*\)\s*\n', '', content, flags=re.MULTILINE)
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"Sanitized: {filepath}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python sanitize_code.py <file>")
        sys.exit(1)
    sanitize(sys.argv[1])
