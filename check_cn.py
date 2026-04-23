import os
import re

def check_files(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'cn(' in content:
                        if not re.search(r'import\s+.*cn.*\s+from', content) and 'function cn(' not in content:
                            print(f"File potentially missing cn import: {path}")

check_files('src')
