import os
import shutil
import xml.etree.ElementTree as ET

# Define paths
BASE_DIR = "Sohas_weapon-Detection"
ANNOT_DIRS = [os.path.join(BASE_DIR, "annotations", "xmls"),
              os.path.join(BASE_DIR, "annotations_test", "xmls")]
IMAGE_DIR = os.path.join(BASE_DIR, "images")
OUTPUT_DIR = os.path.join(BASE_DIR, "prepared_data")

# Keywords to identify weapons
WEAPON_KEYWORDS = ['weapon', 'gun', 'knife', 'pistol', 'rifle']

# Create output folders
for label in ['weapons', 'non-weapons']:
    os.makedirs(os.path.join(OUTPUT_DIR, label), exist_ok=True)

def classify_annotation(xml_file):
    try:
        tree = ET.parse(xml_file)
        root = tree.getroot()
        labels = [obj.find('name').text.lower() for obj in root.findall('object')]
        if any(any(k in lbl for k in WEAPON_KEYWORDS) for lbl in labels):
            return 'weapons'
        else:
            return 'non-weapons'
    except Exception as e:
        print(f"Failed to parse {xml_file}: {e}")
        return None

# Process annotations
for annot_dir in ANNOT_DIRS:
    for file in os.listdir(annot_dir):
        if not file.endswith('.xml'):
            continue
        xml_path = os.path.join(annot_dir, file)
        label = classify_annotation(xml_path)
        if label:
            try:
                tree = ET.parse(xml_path)
                filename = tree.find('filename').text.strip()
                image_path = os.path.join(IMAGE_DIR, filename)
                if os.path.exists(image_path):
                    shutil.copy(image_path, os.path.join(OUTPUT_DIR, label, filename))
                else:
                    print(f"Image not found for {filename}")
            except Exception as e:
                print(f"Error processing {file}: {e}")