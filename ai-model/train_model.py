import pandas as pd
import numpy as np
import random
import csv
import joblib
import os
import warnings
from difflib import get_close_matches
from sklearn import preprocessing
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split
from ner_extractor import MedicalNER

warnings.filterwarnings("ignore")

class DiseasePredictor:
    def __init__(self):  # FIXED: Double underscore
        print("Initializing DiseasePredictor...")
        self.description_list = {}
        self.precautionDictionary = {}
        self.severityDictionary = {}
        self.symptoms_dict = {}
        self.cols = []
        self.le = preprocessing.LabelEncoder()
        self.model = None
        self.model_path = "diagnochain_model.pkl"
        
        print("Loading AI NER Model...")
        self.ai_ner = MedicalNER()
        
        if os.path.exists(self.model_path):
            print(f"Found existing model at {self.model_path}")
            self.load_model()
        else:
            print("No saved model found. Training from scratch...")
            self.train_model()
            
        self.load_knowledge_base()
        print("Initialization complete!")

    def load_model(self):
        try:
            package = joblib.load(self.model_path)
            self.model = package['model']
            self.le = package['le']
            self.cols = package['cols']
            self.symptoms_dict = package['symptoms_dict']
            print("Model loaded successfully!")
        except Exception as e:
            print(f"Error loading model: {e}")
            print("Will train a new model...")
            self.train_model()

    def save_model(self):
        try:
            package = {
                'model': self.model,
                'le': self.le,
                'cols': self.cols,
                'symptoms_dict': self.symptoms_dict
            }
            joblib.dump(package, self.model_path)
            print(f"Model saved to {os.path.abspath(self.model_path)}")
            
            # Verify the file was created
            if os.path.exists(self.model_path):
                file_size = os.path.getsize(self.model_path)
                print(f"File verified! Size: {file_size / 1024:.2f} KB")
            else:
                print("ERROR: File was not created!")
        except Exception as e:
            print(f"Error saving model: {e}")

    def augment_data(self, df):
        new_rows = []
        columns = list(df.columns)

        # Influenza
        flu_symptoms = ['cough', 'high_fever', 'headache', 'fatigue', 'muscle_pain', 'chills', 'throat_irritation', 'runny_nose']
        for _ in range(100):
            row = {col: 0 for col in columns if col != 'prognosis'}
            row['prognosis'] = 'Influenza'
            for sym in flu_symptoms:
                if sym in row: row[sym] = 1
            if random.random() < 0.2:
                if 'chills' in row: row['chills'] = 0
            new_rows.append(row)

        # Acute Sinusitis
        sinus_symptoms = ['sinus_pressure', 'headache', 'runny_nose', 'congestion', 'cough', 'throat_irritation', 'malaise', 'mild_fever']
        for _ in range(100):
            row = {col: 0 for col in columns if col != 'prognosis'}
            row['prognosis'] = 'Acute Sinusitis'
            for sym in sinus_symptoms:
                if sym in row: row[sym] = 1
            if random.random() < 0.2:
                if 'mild_fever' in row: row['mild_fever'] = 0
            new_rows.append(row)

        # Common Cold
        cold_symptoms = ['cough', 'runny_nose', 'continuous_sneezing', 'headache', 'throat_irritation']
        for _ in range(50):
            row = {col: 0 for col in columns if col != 'prognosis'}
            row['prognosis'] = 'Common Cold'
            for sym in cold_symptoms:
                if sym in row: row[sym] = 1
            new_rows.append(row)

        return pd.concat([df, pd.DataFrame(new_rows)], ignore_index=True)

    def load_dataset(self):
        print("Loading dataset.csv...")
        
        # Try multiple possible locations
        possible_paths = [
            'dataset.csv',
            'Data/dataset.csv',
            '../dataset.csv'
        ]
        
        dataset_path = None
        for path in possible_paths:
            if os.path.exists(path):
                dataset_path = path
                print(f"Found dataset at: {os.path.abspath(path)}")
                break
        
        if not dataset_path:
            print("ERROR: dataset.csv not found in any of these locations:")
            for path in possible_paths:
                print(f"  - {os.path.abspath(path)}")
            raise FileNotFoundError("dataset.csv not found!")
        
        # Read CSV
        raw_data = pd.read_csv(dataset_path, header=None)
        raw_data.dropna(how='all', inplace=True)
        
        # Extract symptoms
        all_symptoms = set()
        for index, row in raw_data.iterrows():
            symptoms = row.iloc[1:].dropna().tolist()
            for s in symptoms:
                if isinstance(s, str):
                    clean_sym = s.strip().replace(" ", "_").lower()
                    all_symptoms.add(clean_sym)
        
        sorted_symptoms = sorted(list(all_symptoms))
        if '' in sorted_symptoms: 
            sorted_symptoms.remove('')
        
        print(f"Found {len(sorted_symptoms)} unique symptoms")
        
        # Create encoded dataframe
        encoded_data = []
        for index, row in raw_data.iterrows():
            disease = row.iloc[0]
            if not isinstance(disease, str): 
                continue
            
            row_dict = {sym: 0 for sym in sorted_symptoms}
            row_dict['prognosis'] = disease.strip()
            
            current_symptoms = row.iloc[1:].dropna().tolist()
            for s in current_symptoms:
                if isinstance(s, str):
                    clean_sym = s.strip().replace(" ", "_").lower()
                    if clean_sym in row_dict:
                        row_dict[clean_sym] = 1
            
            encoded_data.append(row_dict)
        
        df = pd.DataFrame(encoded_data)
        print(f"Created dataframe with {len(df)} rows")
        return df.fillna(0)

    def train_model(self):
        print("\n" + "="*60)
        print("TRAINING MODEL")
        print("="*60)
        
        try:
            # Load dataset
            training = self.load_dataset()
            print(f"Dataset shape: {training.shape}")
            
            # Augment
            print("Augmenting data...")
            training = self.augment_data(training)
            print(f"Augmented shape: {training.shape}")
            
            # Prepare data
            self.cols = training.columns.drop('prognosis')
            print(f"Number of features: {len(self.cols)}")
            
            x = training[self.cols]
            y = training['prognosis']
            
            print(f"Number of diseases: {len(y.unique())}")
            
            # Encode
            y = self.le.fit_transform(y)
            
            # Split
            x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.33, random_state=42)
            print(f"Training samples: {len(x_train)}, Test samples: {len(x_test)}")
            
            # Train
            print("Training model (this may take a minute)...")
            rf = RandomForestClassifier(n_estimators=100, random_state=42)
            svc = SVC(kernel='linear', probability=True, random_state=42)
            nb = MultinomialNB()
            
            self.model = VotingClassifier(
                estimators=[('rf', rf), ('svc', svc), ('nb', nb)], 
                voting='soft'
            )
            
            self.model.fit(x_train, y_train)
            
            # Test accuracy
            accuracy = self.model.score(x_test, y_test)
            print(f"Model accuracy: {accuracy * 100:.2f}%")
            
            # Create symptom dictionary
            self.symptoms_dict = {symptom: idx for idx, symptom in enumerate(self.cols)}
            
            # Save
            print("\nSaving model...")
            self.save_model()
            
            print("="*60)
            print("TRAINING COMPLETE!")
            print("="*60 + "\n")
            
        except Exception as e:
            print(f"\nERROR during training: {e}")
            import traceback
            traceback.print_exc()
            raise

    def load_knowledge_base(self):
        # Try to load from Data folder or current folder
        desc_paths = ['symptom_Description.csv', 'Data/symptom_Description.csv']
        prec_paths = ['symptom_precaution.csv', 'Data/symptom_precaution.csv']
        sev_paths = ['Symptom_severity.csv', 'Data/Symptom_severity.csv']
        
        # Load descriptions
        for path in desc_paths:
            if os.path.exists(path):
                try:
                    with open(path, encoding='utf-8') as csv_file:
                        reader = csv.reader(csv_file)
                        next(reader)  # Skip header
                        for row in reader:
                            if len(row) >= 2:
                                self.description_list[row[0]] = row[1]
                    print(f"Loaded descriptions from {path}")
                    break
                except:
                    pass
        
        # Manual additions
        self.description_list['Influenza'] = "Influenza (The Flu) is a viral infection attacking the respiratory system."
        self.description_list['Acute Sinusitis'] = "Acute Sinusitis is the inflammation of the sinuses."
        
        # Load precautions
        for path in prec_paths:
            if os.path.exists(path):
                try:
                    with open(path, encoding='utf-8') as csv_file:
                        reader = csv.reader(csv_file)
                        next(reader)
                        for row in reader:
                            if len(row) >= 5:
                                self.precautionDictionary[row[0]] = [row[1], row[2], row[3], row[4]]
                    print(f"Loaded precautions from {path}")
                    break
                except:
                    pass
        
        self.precautionDictionary['Influenza'] = ["stay hydrated", "rest", "antiviral medication", "monitor temperature"]
        self.precautionDictionary['Acute Sinusitis'] = ["steam inhalation", "warm compress", "saline spray", "hydrate"]
        
        # Load severity
        for path in sev_paths:
            if os.path.exists(path):
                try:
                    with open(path, encoding='utf-8') as csv_file:
                        reader = csv.reader(csv_file)
                        next(reader)
                        for row in reader:
                            if len(row) >= 2:
                                try:
                                    self.severityDictionary[row[0]] = int(row[1])
                                except:
                                    pass
                    print(f"Loaded severity from {path}")
                    break
                except:
                    pass

    def extract_symptoms_robust(self, user_input):
        # Your existing code here - keep as is
        symptom_map = {
            # --- English Synonyms ---
            "stomach ache": "stomach_pain", "belly pain": "stomach_pain",
            "fever": "high_fever", "high temp": "high_fever",
            "chest pain": "chest_pain", "chest tight": "chest_pain",
            "coughing": "cough", "flu": "influenza",
            "weakness": "fatigue", "tired": "fatigue",
            "dizzy": "dizziness", "headache": "headache",
            "sore throat": "throat_irritation", 
            "pain behind eyes": "pain_behind_the_eyes",
            "joint pain": "joint_pain", "runny nose": "runny_nose",
            "sinus": "sinus_pressure", "sneezing": "continuous_sneezing",
            "chills": "chills", "red eyes": "redness_of_eyes",
            "vomit": "vomiting", "throwing up": "vomiting",
            
            # --- MALAY TRANSLATIONS (Bahasa Melayu) ---
            "demam": "high_fever", "panas badan": "high_fever", "badan panas": "high_fever",
            "batuk": "cough", "uhuk": "cough",
            "sakit kepala": "headache", "pening": "headache", "kepala sakit": "headache",
            "selesema": "runny_nose", "hidung berair": "runny_nose", "hingus": "runny_nose",
            "bersin": "continuous_sneezing",
            "menggigil": "chills", "sejuk": "chills",
            "penat": "fatigue", "letih": "fatigue", "lesu": "fatigue", "badan lemah": "fatigue",
            "sakit dada": "chest_pain", "dada sakit": "chest_pain", "sesak nafas": "breathlessness",
            "sakit tekak": "throat_irritation", "perit tekak": "throat_irritation",
            "sakit sendi": "joint_pain", "lenguh": "joint_pain",
            "muntah": "vomiting", "loya": "nausea",
            "cirit": "diarrhoea", "cirit birit": "diarrhoea", "sakit perut": "stomach_pain",
            "ruam": "skin_rash", "gatal": "itching",
            "mata merah": "redness_of_eyes", "sakit mata": "pain_behind_the_eyes",
            "resdung": "sinus_pressure", "hidung tersumbat": "congestion",
            
            # --- Missed Synonyms (Fix for Chickenpox vs Impetigo) ---
            "blister": "red_spots_over_body", "blisters": "red_spots_over_body", 
            "scab": "red_spots_over_body", "scabs": "red_spots_over_body",
            "crust": "red_spots_over_body", "crusting": "red_spots_over_body",
            "red spots": "red_spots_over_body",
            "rash": "skin_rash", "skin rash": "skin_rash",
            "loss of appetite": "loss_of_appetite"
        }
        
        extracted = set()
        text = user_input.lower().replace("-", " ").replace(",", " ").replace(".", " ")
        
        # 2. Exact Phrase Matching
        for phrase, mapped_sym in symptom_map.items():
            if phrase in text:
                extracted.add(mapped_sym)

        # 3. Fuzzy Logic for Typos
        words = text.split()
        all_possible_keywords = list(symptom_map.keys()) + self.cols.tolist()

        ai_symptoms = []
        if user_input:
            ai_symptoms = self.ai_ner.extract_symptoms(user_input)
            print(f"AI found: {ai_symptoms}")

        # Add AI findings to your extracted list
        for s in ai_symptoms:
            extracted.add(s)

        for word in words:
            if len(word) < 4: continue
            # This requires 'from difflib import get_close_matches' at the top
            matches = get_close_matches(word, all_possible_keywords, n=1, cutoff=0.80)
            
            if matches:
                match = matches[0]
                if match in symptom_map:
                    extracted.add(symptom_map[match])
                elif match in self.cols:
                    extracted.add(match)
                
        return list(extracted)

    def predict(self, user_input):
        symptoms_list = self.extract_symptoms_robust(user_input)
    
        if not symptoms_list:
            return {"error": "No recognizable symptoms. Please list your symptoms clearly (e.g., 'Fever and Cough')"}

        # Vectorize
        input_vector = np.zeros(len(self.symptoms_dict))
        for item in symptoms_list:
            if item in self.symptoms_dict:
                input_vector[self.symptoms_dict[item]] = 1

        # Predict
        probs = self.model.predict_proba([input_vector])[0]
        top_indices = np.argsort(probs)[-5:][::-1]
    
        top_3 = []
        for idx in top_indices:
            disease = self.le.inverse_transform([idx])[0]
            prob = probs[idx]
            if prob > 0.001:
                top_3.append({"disease": disease, "confidence": prob})

        # --- 🧠 MEDICAL LOGIC & SANITY CHECKS ---
        input_set = set(symptoms_list)
    
        has_breathlessness = 'breathlessness' in input_set
        has_chills = 'chills' in input_set
        has_sneezing = 'continuous_sneezing' in input_set or 'runny_nose' in input_set
    
        # 1. ASTHMA CHECK
        for d in top_3:
            if d['disease'] == 'Bronchial Asthma' and not has_breathlessness:
                d['confidence'] -= 0.50

        # 2. COMMON COLD BOOST
        if 'cough' in input_set and ('headache' in input_set or has_sneezing):
             for d in top_3:
                if d['disease'] == 'Common Cold': 
                    d['confidence'] += 0.4

        # 3. INFLUENZA CHECK
        if 'high_fever' in input_set and has_chills:
            for d in top_3:
                if d['disease'] == 'Influenza': 
                    d['confidence'] += 0.3
                if d['disease'] == 'Common Cold': 
                    d['confidence'] -= 0.2

        # 4. PARALYSIS & AIDS PENALTY
        has_neuro = any(s in input_set for s in ['vomiting', 'weakness_of_one_body_side', 'altered_sensorium'])
        if not has_neuro:
             for d in top_3:
                if d['disease'] == 'Paralysis (brain hemorrhage)': 
                    d['confidence'] -= 0.8
    
        has_aids_signs = any(s in input_set for s in ['muscle_wasting', 'patches_in_throat', 'extra_marital_contacts'])
        if not has_aids_signs:
             for d in top_3:
                if d['disease'] == 'AIDS': 
                    d['confidence'] -= 0.8

        # 5. VIRAL FEVER DEFAULT
        if len(input_set) <= 3 and 'high_fever' in input_set:
            for d in top_3:
                if d['disease'] == 'Viral Fever': 
                    d['confidence'] += 0.3

        # --- FINAL SORTING ---
        top_3.sort(key=lambda x: x['confidence'], reverse=True)
    
        # Filter out negatives and keep top 3
        top_3 = [d for d in top_3 if d['confidence'] > 0]
        top_3 = top_3[:3]

        # CRITICAL FIX: Handle case where all diseases were filtered out
        if not top_3:
            # Fallback to most generic diagnosis
            top_3 = [{"disease": "Viral Fever", "confidence": 50.0}]

        # Normalize percentages
        total_score = sum(d['confidence'] for d in top_3)
        if total_score > 0:
            for d in top_3:
                d['confidence'] = round((d['confidence'] / total_score) * 100, 2)
    
        # Build response
        primary = top_3[0]
        alternatives = top_3[1:] if len(top_3) > 1 else []
    
        result = {
            "symptoms_detected": symptoms_list,
            "primary_diagnosis": primary['disease'],
            "confidence": primary['confidence'],
            "description": self.description_list.get(primary['disease'], "No description available"),
            "precautions": self.precautionDictionary.get(primary['disease'], []),
            "alternatives": alternatives
        }
    
        return result

# Test when run directly
if __name__ == "__main__":  # FIXED: Double underscore
    print("Current directory:", os.getcwd())
    print("Files in current directory:", os.listdir('.'))
    print()
    
    predictor = DiseasePredictor()
    
    print("\n" + "="*60)
    print("Model file location:", os.path.abspath("diagnochain_model.pkl"))
    print("Model exists:", os.path.exists("diagnochain_model.pkl"))
    print("="*60)