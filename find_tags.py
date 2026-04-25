import re

def find_tags(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()
        
    for i, line in enumerate(lines):
        for match in re.finditer(r'<(div|/div)', line):
            print(f"{i+1}: {match.group(0)}")

if __name__ == "__main__":
    find_tags('src/components/inventory/ProductVariantsManager.tsx')
