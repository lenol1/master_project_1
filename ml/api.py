# ml/api.py
import joblib
import torch
import os
import csv
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from transformers import BertTokenizer, BertForSequenceClassification, TextClassificationPipeline
import config  # Ваш файл config.py

# --- 1. Ініціалізація FastAPI ---
app = FastAPI(
    title="ML Categorization Service",
    description="API для автоматичної категоризації та адаптивного навчання.",
    version="1.0.0"
)

# --- Глобальні змінні для моделей ---
# 'global_model' - це навчена модель (pipeline)
# 'global_predict_function' - це уніфікована функція, яка приймає текст
global_model = None
global_predict_function = None

# Кеш для завантажених персоналізованих моделей (щоб не читати з диска щоразу)
personalized_models_cache = {}

# Файл для збору виправлень від користувачів
CORRECTIONS_FILE = "user_corrections.csv"


# --- 2. Завантаження Глобальної Моделі (при старті сервера) ---
@app.on_event("startup")
def load_global_model():
    """
    Завантажує одну "чемпіонську" модель (RF або BERT) з config.py 
    в пам'ять при старті сервера.
    """
    global global_model, global_predict_function
    
    try:
        if config.MODEL_TYPE == "BERT":
            model_path = config.BERT_MODEL_PATH
            print(f"🔄 Завантаження ГЛОБАЛЬНОЇ моделі BERT з {model_path}...")
            
            tokenizer = BertTokenizer.from_pretrained(model_path)
            model = BertForSequenceClassification.from_pretrained(model_path)
            device = 0 if torch.cuda.is_available() else -1
            global_model = TextClassificationPipeline(model=model, tokenizer=tokenizer, device=device)
            
            # Створюємо уніфіковану функцію для BERT
            def bert_predict(text: str) -> int:
                result = global_model(text)[0]
                return int(result['label'].split('_')[-1])
            
            global_predict_function = bert_predict

        elif config.MODEL_TYPE == "RF":
            model_path = config.SKLEARN_MODEL_PATH
            print(f"🔄 Завантаження ГЛОБАЛЬНОЇ моделі SKlearn з {model_path}...")
            
            global_model = joblib.load(model_path)
            
            # Створюємо уніфіковану функцію для SKlearn
            def rf_predict(text: str) -> int:
                # Модель (pipeline) очікує список
                result = global_model.predict([text])[0]
                return int(result)
            
            global_predict_function = rf_predict
        
        print(f"✅ Глобальну модель ({config.MODEL_TYPE}) успішно завантажено.")

    except Exception as e:
        print(f"❌❌❌ КРИТИЧНА ПОМИЛКА: Не вдалося завантажити глобальну модель. {e}")


# --- 3. Опис Моделей Даних (Pydantic) ---

class TransactionInput(BaseModel):
    description: str
    user_id: str  # Важливо для персоналізації

class CorrectionInput(BaseModel):
    user_id: str
    description: str
    original_category_id: int  # Яку категорію запропонувала модель
    corrected_category_id: int # Яку категорію обрав користувач


# --- 4. Логіка Збереження Виправлень ---

def save_correction_to_csv(correction: CorrectionInput):
    """
    Дописує нове виправлення в CSV-файл (нашу "скарбничку").
    """
    file_exists = os.path.isfile(CORRECTIONS_FILE)
    
    with open(CORRECTIONS_FILE, 'a', newline='', encoding='utf-8') as f:
        # Використовуємо Pydantic .model_dump() для отримання словника
        writer = csv.DictWriter(f, fieldnames=correction.model_dump().keys())
        if not file_exists:
            writer.writeheader()  # Написати заголовки, якщо файл новий
        writer.writerow(correction.model_dump())


# --- 5. Кінцеві Точки (Endpoints) API ---

@app.post("/api/v1/categorize")
def categorize_transaction(transaction: TransactionInput):
    """
    ГОЛОВНИЙ ENDPOINT: Приймає транзакцію, знаходить потрібну модель 
    (персоналізовану або глобальну) і повертає категорію.
    """
    global global_predict_function, personalized_models_cache
    
    predict_function_to_use = None
    user_id = transaction.user_id
    
    # Визначаємо шлях до персоналізованої моделі (припустимо, вони всі SKlearn/joblib)
    personalized_model_path = f"model_user_{user_id}.joblib" 

    # --- ЛОГІКА АДАПТАЦІЇ (ВАША НАУКОВА НОВИЗНА) ---
    
    # 1. Чи є ця модель вже у кеші?
    if user_id in personalized_models_cache:
        predict_function_to_use = personalized_models_cache[user_id]
        print(f"[Cache HIT] Використання моделі з кешу для {user_id}")

    # 2. Якщо ні, чи існує для цього користувача персоналізований файл?
    elif os.path.exists(personalized_model_path):
        print(f"[Cache MISS] Знайдено персоналізовану модель на диску для {user_id}")
        try:
            # (Для простоти, припустимо, персоналізовані моделі - це SKlearn)
            personalized_model = joblib.load(personalized_model_path)
            
            def personalized_predict(text: str) -> int:
                return int(personalized_model.predict([text])[0])
            
            predict_function_to_use = personalized_predict
            personalized_models_cache[user_id] = predict_function_to_use # Зберігаємо в кеш
            
        except Exception as e:
            print(f"Помилка завантаження персоналізованої моделі {personalized_model_path}: {e}")
            predict_function_to_use = global_predict_function # Використовуємо глобальну
    
    # 3. Якщо ні, використовуємо глобальну модель
    else:
        print(f"[Cache MISS] Використання ГЛОБАЛЬНОЇ моделі для {user_id}")
        predict_function_to_use = global_predict_function
            
    # --- Виконання прогнозу ---
    if predict_function_to_use is None:
        return {"error": "Глобальна модель не завантажена"}, 500
        
    try:
        category_id = predict_function_to_use(transaction.description)
        return {
            "description": transaction.description,
            "category_id": category_id
        }
    except Exception as e:
        return {"error": f"Помилка під час прогнозування: {str(e)}"}, 400


@app.post("/api/v1/submit-correction")
def submit_correction(correction: CorrectionInput):
    """
    ENDPOINT ЗВОРОТНОГО ЗВ'ЯЗКУ: Приймає виправлення від користувача 
    і зберігає його в "скарбничку" (CSV-файл) для майбутнього перенавчання.
    """
    try:
        save_correction_to_csv(correction)
        print(f"✅ Отримано та збережено виправлення від {correction.user_id}")
        return {"status": "correction_received"}
    except Exception as e:
        print(f"❌ Помилка збереження виправлення: {str(e)}")
        return {"error": f"Не вдалося зберегти виправлення: {str(e)}"}, 500


# --- 6. Налаштування CORS ---
# Дозволяє вашому React (порт 3000) та Node.js (порт 5000)
# спілкуватися з цим Python-сервером (порт 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", # Ваш React-додаток
        "http://localhost:5000"  # Ваш Node.js-сервер
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- (Для запуску uvicorn з терміналу) ---
if __name__ == "__main__":
    import uvicorn
    print("🚀 Запуск ML API-сервера на http://localhost:8000")
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)