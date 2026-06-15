import os, sys
import xml.etree.ElementTree as ET

def check_vue(content):
    import re
    # Just extract <template> wrapper content
    match = re.search(r'<template>(.*)</template>', content, re.DOTALL)
    if not match: return
    tmpl = match.group(1)
    
    # Very crude check: count open vs closed tags for common ones like div, p, span, a, section
    for tag in ['div', 'span', 'p', 'a', 'section', 'button']:
        open_count = len(re.findall(rx_open(tag), tmpl))
        close_count = len(re.findall(rx_close(tag), tmpl))
        if open_count != close_count:
            print(f"Tag <{tag}> mismatch: {open_count} open vs {close_count} close")

def rx_open(tag): return f'<{tag}(\s+[^>]*?)?>'
def rx_close(tag): return f'</{tag}>'

for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith('.vue'):
            path = os.path.join(root, f)
            try:
                content = open(path, encoding='utf-8').read()
                print(f"Checking {f}...")
                check_vue(content)
            except Exception as e:
                print(f"Error reading {f}: {e}")
