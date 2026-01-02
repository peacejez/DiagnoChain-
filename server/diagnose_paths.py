#!/usr/bin/env python3
"""
Diagnostic script to check if predict_api.py can find CSV files
Run this from the server/ folder: python diagnose_paths.py
"""

import os
import sys

# Same logic as predict_api.py
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
AI_MODEL_DIR = os.path.join(SCRIPT_DIR, '..', 'ai-model')

print("=" * 60)
print("PATH DIAGNOSTIC TOOL")
print("=" * 60)

print(f"\n1. Script Location:")
print(f"   {SCRIPT_DIR}")

print(f"\n2. AI Model Directory:")
print(f"   {AI_MODEL_DIR}")
print(f"   Exists: {os.path.exists(AI_MODEL_DIR)}")

print(f"\n3. Checking ai-model/ contents:")
if os.path.exists(AI_MODEL_DIR):
    contents = os.listdir(AI_MODEL_DIR)
    for item in contents:
        item_path = os.path.join(AI_MODEL_DIR, item)
        item_type = "DIR" if os.path.isdir(item_path) else "FILE"
        print(f"   [{item_type}] {item}")
else:
    print("   ❌ Directory does not exist!")

print(f"\n4. Looking for CSV files in ai-model/:")
csv_files = ['Training.csv', 'Testing.csv', 'symptom_Description.csv', 'symptom_precaution.csv']
found_in_root = []
found_in_data = []

for csv in csv_files:
    # Check in ai-model/
    path_root = os.path.join(AI_MODEL_DIR, csv)
    if os.path.exists(path_root):
        found_in_root.append(csv)
        print(f"   ✅ {csv} (in ai-model/)")
    else:
        # Check in ai-model/Data/
        path_data = os.path.join(AI_MODEL_DIR, 'Data', csv)
        if os.path.exists(path_data):
            found_in_data.append(csv)
            print(f"   ✅ {csv} (in ai-model/Data/)")
        else:
            print(f"   ❌ {csv} NOT FOUND")

print("\n" + "=" * 60)
print("RECOMMENDATION:")
print("=" * 60)

if len(found_in_root) == 4:
    print("✅ All CSV files found in ai-model/")
    print("   Your predict_api.py should work with:")
    print("   DATA_DIR = AI_MODEL_DIR")
elif len(found_in_data) == 4:
    print("✅ All CSV files found in ai-model/Data/")
    print("   Update predict_api.py to use:")
    print("   DATA_DIR = os.path.join(AI_MODEL_DIR, 'Data')")
elif len(found_in_root) > 0 and len(found_in_data) > 0:
    print("⚠️  CSV files are split between ai-model/ and ai-model/Data/")
    print("   Recommendation: Move all CSVs to one location")
else:
    print("❌ CSV files not found!")
    print("   Check if ai-model folder is in the right place")

print("\n" + "=" * 60)