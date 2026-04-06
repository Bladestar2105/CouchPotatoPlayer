import re
with open('utils/i18nResources.ts', 'r') as f:
    content = f.read()

de_start = content.find('  de: {')
fr_start = content.find('  fr: {')

de_block = content[de_start:fr_start]

print("Keys in DE:")
for line in de_block.split('\\n'):
    if ':' in line and '"' in line:
        print(line.strip())
