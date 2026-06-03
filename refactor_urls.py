import os

src = 'frontend-next/src'
count = 0

for root, dirs, files in os.walk(src):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts') or f.endswith('.jsx') or f.endswith('.js'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            if 'http://localhost:8000' in content:
                # Replace literal string fetches first
                new_content = content.replace('"http://localhost:8000', '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}` + "')
                new_content = new_content.replace("'http://localhost:8000", '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}` + \'')
                # Replace inside existing template literals
                new_content = new_content.replace('http://localhost:8000', '${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}')
                
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                count += 1

print(f'Replaced in {count} files.')
