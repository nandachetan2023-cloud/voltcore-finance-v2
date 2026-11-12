#!/usr/bin/env python3
"""Add Z.ai metadata to PDF files."""
import sys
from pypdf import PdfReader, PdfWriter

def add_metadata(filepath):
    reader = PdfReader(filepath)
    writer = PdfWriter()
    writer.clone_reader_document_root(reader)
    
    writer.add_metadata({
        '/Author': 'Z.ai',
        '/Creator': 'Z.ai',
        '/Producer': 'Z.ai ReportLab Generator',
        '/Title': 'voltcore_erp_documentation',
        '/Subject': 'VoltCore ERP Project Documentation',
    })
    
    with open(filepath, 'wb') as f:
        writer.write(f)
    
    print(f"Metadata added to: {filepath}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python add_zai_metadata.py <pdf_file>")
        sys.exit(1)
    add_metadata(sys.argv[1])
