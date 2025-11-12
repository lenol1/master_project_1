# api.py
import joblib
import torch
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from transformers import BertTokenizer, BertForSequenceClassification, TextClassificationPipeline
import config 

# --- 1. Ініціалізація FastAPI ---
app = FastAPI(title="ML Categorization API")

# --- 2. Завантаження ГЛОБАЛЬНОЇ моделі ---
GLOBAL_MODEL_PATH = "production_model_rf.joblib"
try:
    global_model = joblib.load(GLOBAL_MODEL_PATH)
    print(f"✅ Глобальну модель {GLOBAL_MODEL_PATH} завантажено.")
except Exception as e:
    global_model = None
    print(f"❌ Не вдалося завантажити глобальну модель: {e}")

# Словник для кешування персоналізованих моделей (щоб не завантажувати з диска щоразу)
personalized_models_cache = {}

# --- 3. Опис вхідних даних (тепер з user_id) ---
class TransactionInput(BaseModel):
    user_id: str
    description: str

# --- 4. Оновлена кінцева точка API ---
@app.post("/api/v1/categorize")
def categorize_transaction(transaction: TransactionInput):
    
    model_to_use = None
    user_id = transaction.user_id
    if user_id in personalized_models_cache:
        model_to_use = personalized_models_cache[user_id]
    else:
        personalized_model_path = f"model_user_{user_id}.joblib"
        
        if os.path.exists(personalized_model_path):
            try:
                model_to_use = joblib.load(personalized_model_path)
                personalized_models_cache[user_id] = model_to_use # Зберігаємо в кеш
                print(f"Завантажено персоналізовану модель для {user_id}")
            except Exception as e:
                print(f"Помилка завантаження персоналізованої моделі для {user_id}: {e}")
                model_to_use = global_model # Використовуємо глобальну як запасний варіант
        else:
            # 3. Якщо файлу немає, використовуємо глобальну модель
            model_to_use = global_model
            
    # ---------------------------

    if model_to_use is None:
        return {"error": "Model is not loaded"}, 500

    try:
        prediction = model_to_use.predict([transaction.description])
        category_id = int(prediction[0]) 

        return {
            "description": transaction.description,
            "category_id": category_id
        }
    except Exception as e:
        return {"error": str(e)}, 400

# --- 4. Створення "кінцевої точки" (Endpoint) ---
@app.post("/api/v1/categorize")
def categorize_transaction(transaction: TransactionInput):
    if predict_function is None:
        return {"error": "Model is not loaded"}, 500
    try:
        # Використовуємо нашу єдину функцію
        category_id = predict_function(transaction.description)
        return {
            "description": transaction.description,
            "category_id": category_id
        }
    except Exception as e:
        return {"error": str(e)}, 400

class CorrectionInput(BaseModel):
    user_id: str
    description: str
    original_category_id: int # Яку категорію запропонувала модель
    corrected_category_id: int # Яку категорію обрав користувач

@app.post("/api/v1/submit-correction")
def submit_correction(correction: CorrectionInput):
    try:
        print(f"Отримано виправлення від {correction.user_id}:")
        print(f"   Текст: {correction.description}")
        print(f"   Виправлено з {correction.original_category_id} -> на {correction.corrected_category_id}")
        
        return {"status": "correction_received"}
    
    except Exception as e:
        return {"error": str(e)}, 400

# --- 5. CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

print("🚀 Сервер готовий до роботи за адресою http://localhost:8000")