#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API Wrapper for Disease Prediction
Called by Node.js server with symptom text as argument
"""
import sys
import json
import os

# CRITICAL: Redirect stdout to suppress ALL print statements from imports
import io
original_stdout = sys.stdout
sys.stdout = io.StringIO()

# Set encoding to UTF-8 to prevent Windows console issues
if sys.platform == 'win32':
    import codecs
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Suppress TensorFlow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TRANSFORMERS_VERBOSITY'] = 'error'

import warnings
warnings.filterwarnings('ignore')

# Import the predictor (this will trigger initialization messages)
from train_model import DiseasePredictor

# Restore stdout AFTER importing
sys.stdout = original_stdout

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No symptoms provided"}))
        sys.exit(1)
    
    # Get symptoms from command line argument
    symptoms_text = sys.argv[1]
    
    try:
        # Initialize predictor (all initialization messages are suppressed)
        predictor = DiseasePredictor()
        
        # Get prediction
        result = predictor.predict(symptoms_text)
        
        # Check if result is an error
        if isinstance(result, dict) and 'error' in result:
            print(json.dumps(result, ensure_ascii=False))
            sys.exit(1)
        
        # Transform response format
        predictions = []
        
        # Add primary diagnosis
        primary = {
            "disease": result.get("primary_diagnosis", "Unknown"),
            "confidence": result.get("confidence", 0) / 100 if isinstance(result.get("confidence"), (int, float)) else 0,
            "description": result.get("description", "No description available"),
            "precautions": result.get("precautions", [])
        }
        predictions.append(primary)
        
        # Add alternatives
        for alt in result.get("alternatives", []):
            alt_pred = {
                "disease": alt.get("disease", "Unknown"),
                "confidence": alt.get("confidence", 0) / 100 if isinstance(alt.get("confidence"), (int, float)) else 0,
                "description": predictor.description_list.get(alt.get("disease", ""), "No description available"),
                "precautions": predictor.precautionDictionary.get(alt.get("disease", ""), [])
            }
            predictions.append(alt_pred)
        
        # Output ONLY JSON (Node.js expects this)
        print(json.dumps(predictions, ensure_ascii=False))
        
    except Exception as e:
        error_result = {"error": str(e)}
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()