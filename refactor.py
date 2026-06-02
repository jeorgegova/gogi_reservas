import os
import re

# Replacements mapping (old -> new)
# Order matters: replace longer strings first to avoid partial replacements.
REPLACEMENTS = [
    ('common_area_addons', 'resource_services'),
    ('service_addons', 'services'),
    ('reservation_addons', 'reservation_services'),
    ('common_areas', 'resources'),
    ('common_area_id', 'resource_id'),
    ('addon_id', 'service_id'),
    ('AdminAreas', 'AdminResources'),
    ('AdminAreasPage', 'AdminResourcesPage'),
    ('AdminAreas.tsx', 'AdminResources.tsx'),
    ('commonAreas', 'resources')
]

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content
    for old, new in REPLACEMENTS:
        new_content = new_content.replace(old, new)

    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")
        return True
    return False

def main():
    src_dir = 'src'
    updated_files = 0
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.ts', '.tsx', '.json', '.html')):
                filepath = os.path.join(root, file)
                if replace_in_file(filepath):
                    updated_files += 1

    print(f"Refactored {updated_files} files.")

if __name__ == '__main__':
    main()
