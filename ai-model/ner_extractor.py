from transformers import pipeline

class MedicalNER:
    def __init__(self):  # FIXED: Double underscore
        # Silent loading - no print to avoid API issues
        self.ner_pipeline = pipeline(
            "token-classification", 
            model="d4data/biomedical-ner-all", 
            aggregation_strategy="simple"
        )

    def extract_symptoms(self, text):
        """
        Input: "I have a severe headache and high fever."
        Output: ['headache', 'high fever']
        """
        results = self.ner_pipeline(text)
        
        extracted_symptoms = []
        
        for entity in results:
            if entity['entity_group'] in ['Sign_symptom', 'Diagnostic_procedure', 'Biological_structure']:
                clean_word = entity['word'].strip()
                extracted_symptoms.append(clean_word)
                
        return extracted_symptoms

# Test it if running directly
if __name__ == "__main__":  # FIXED: Double underscore
    ai = MedicalNER()
    print(ai.extract_symptoms("Patient has severe chest pain and coughing."))