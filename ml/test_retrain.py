import os
import csv
import joblib
from api import retrain_personalized_model

TEST_USER = '68d83159665926c147c07c27'
TEST_DESC = 'Кава в Starbucks'
CORRECTIONS_FILE = f'model_user_{TEST_USER}.csv'

# Append a correction row for our test user (ensure fields order matches ml/api.py expected header)
row = {
    'user_id': TEST_USER,
    'description': TEST_DESC,
    'original_category_id': '0',
    'corrected_category_id': '',
    'original_category_name': 'Інше',
    'corrected_category_name': 'Кафе'
}

# Make sure file exists and header includes our columns
file_exists = os.path.exists(CORRECTIONS_FILE)
with open(CORRECTIONS_FILE, 'a', newline='', encoding='utf-8') as f:
    fieldnames = ['user_id', 'description', 'original_category_id', 'corrected_category_id', 'original_category_name', 'corrected_category_name']
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    if not file_exists:
        writer.writeheader()
    writer.writerow(row)

print('Wrote test correction for', TEST_USER)

# Call retrain
print('Triggering retrain...')
retrain_personalized_model(TEST_USER)

model_path = f'model_user_{TEST_USER}.joblib'
if os.path.exists(model_path):
    model = joblib.load(model_path)
    pred = model.predict([TEST_DESC])[0]
    print('Prediction for test description after retrain:', pred)
else:
    print('Model not found at', model_path)
