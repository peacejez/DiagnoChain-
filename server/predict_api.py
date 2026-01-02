import sys
import os
import json
import joblib
import numpy as np
import csv

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
AI_MODEL_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, '..', 'ai-model'))
MODEL_PATH = os.path.join(AI_MODEL_DIR, 'diagnochain_model.pkl')
DESCRIPTION_CSV = os.path.join(AI_MODEL_DIR, 'symptom_Description.csv')
PRECAUTION_CSV = os.path.join(AI_MODEL_DIR, 'symptom_precaution.csv')


def ensure_model():
    if os.path.exists(MODEL_PATH):
        return True

    train_script = os.path.join(AI_MODEL_DIR, 'train_model.py')
    if not os.path.exists(train_script):
        return False

    import subprocess
    try:
        subprocess.check_call([sys.executable, train_script], cwd=AI_MODEL_DIR)
        return os.path.exists(MODEL_PATH)
    except Exception:
        return os.path.exists(MODEL_PATH)


def load_kb():
    descriptions = {}
    precautions = {}
    try:
        with open(DESCRIPTION_CSV, encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader, None)
            for row in reader:
                if len(row) >= 2:
                    descriptions[row[0].strip()] = row[1].strip()
    except Exception:
        pass

    try:
        with open(PRECAUTION_CSV, encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader, None)
            for row in reader:
                if len(row) >= 2:
                    disease = row[0].strip()
                    items = [c.strip() for c in row[1:5] if c.strip()]
                    precautions[disease] = items
    except Exception:
        pass

    return descriptions, precautions


def predict_from_model(symptoms_text):
    if not ensure_model():
        return {"error": "Model not available and training failed."}

    package = joblib.load(MODEL_PATH)
    model = package.get('model')
    le = package.get('le')
    cols = list(package.get('cols', []))

    if model is None or le is None or not cols:
        return {"error": "Saved model is invalid or incomplete."}

    descriptions, precautions = load_kb()

    import re
    text = symptoms_text.lower()
    words = set(re.findall(r"\w+", text))

    synonyms = {
        'rash': ['rash', 'skin_rash'],
        'blister': ['blister', 'blisters', 'skin_rash'],
        'itchy': ['itchy', 'skin_rash'],
        'loss': ['loss_of_appetite', 'loss', 'appetite'],
        'appetite': ['loss_of_appetite', 'appetite'],
        'vomit': ['vomiting', 'nausea', 'vomit'],
        'fever': ['fever', 'high_fever'],
        'cough': ['cough'],
        'headache': ['headache']
    }

    extracted_set = set()

    for col in cols:
        name = col.replace('_', ' ').lower()
        col_words = set(name.split())
        if col_words & words:
            extracted_set.add(col)
            continue

    for w in words:
        if w in synonyms:
            for mapped in synonyms[w]:
                for col in cols:
                    if mapped.replace('_', ' ') in col.replace('_', ' '):
                        extracted_set.add(col)

    extracted = list(extracted_set)

    if not extracted:
        return {"error": "No symptoms detected in input."}

    symptoms_dict = {symptom: idx for idx, symptom in enumerate(cols)}
    input_vec = np.zeros(len(cols))
    for s in extracted:
        if s in symptoms_dict:
            input_vec[symptoms_dict[s]] = 1

    probs = model.predict_proba([input_vec])[0]
    top_idxs = np.argsort(probs)[-3:][::-1]

    results = []
    for idx in top_idxs:
        try:
            disease = le.inverse_transform([idx])[0]
        except Exception:
            disease = str(idx)
        confidence = float(probs[idx] * 100)
        if confidence <= 0.0:
            continue
        results.append({
            'disease': disease,
            'confidence': round(confidence, 2),
            'description': descriptions.get(disease, 'No description available.'),
            'precautions': precautions.get(disease, ['Consult a healthcare professional'])
        })

    while len(results) < 3:
        results.append({
            'disease': 'Unknown',
            'confidence': 0.0,
            'description': 'Unable to determine with given symptoms.',
            'precautions': ['Consult a healthcare professional']
        })

    return results[:3]


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No symptoms provided"}))
        sys.exit(1)
    text = sys.argv[1]
    out = predict_from_model(text)
    print(json.dumps(out))
