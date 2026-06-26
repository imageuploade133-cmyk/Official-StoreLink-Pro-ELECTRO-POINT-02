
import os
import re

def check_imports(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                path = os.path.join(root, file)
                with open(path, 'r') as f:
                    content = f.read()
                    
                # Find named imports from local components
                # e.g., import { Button } from '@/components/ui/button'
                matches = re.findall(r"import\s+\{\s*([^}]+)\s*\}\s+from\s+['\"](@/components/[^'\"]+)['\"]", content)
                for components, module_path in matches:
                    comp_list = [c.strip() for c in components.split(',')]
                    # Resolve module path
                    actual_path = module_path.replace('@/', 'src/')
                    if not actual_path.endswith('.tsx') and not actual_path.endswith('.ts'):
                        if os.path.exists(actual_path + '.tsx'):
                            actual_path += '.tsx'
                        elif os.path.exists(actual_path + '.ts'):
                            actual_path += '.ts'
                        elif os.path.exists(os.path.join(actual_path, 'index.tsx')):
                            actual_path = os.path.join(actual_path, 'index.tsx')
                        elif os.path.exists(os.path.join(actual_path, 'index.ts')):
                            actual_path = os.path.join(actual_path, 'index.ts')
                        else:
                            continue
                    
                    with open(actual_path, 'r') as mf:
                        module_content = mf.read()
                        
                    for comp in comp_list:
                        # Check if it's exported as named
                        if f'export function {comp}' in module_content or \
                           f'export const {comp}' in module_content or \
                           f'export {{ {comp}' in module_content or \
                           f'export class {comp}' in module_content:
                            continue
                        
                        # Special case for React.memo or forwardRef
                        if re.search(fr"export const {comp}\s*=\s*React\.(memo|forwardRef)", module_content):
                            continue
                            
                        # If not found as named export, check if it's default export
                        if 'export default' in module_content:
                            print(f"Potential mismatch: {comp} imported as named from {module_path} in {path}, but {module_path} has default export.")

check_imports('src')
