# train.py
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
import config

# Import heavy BERT libraries only if needed (to avoid unnecessary deps for RF)
if config.MODEL_TYPE == "BERT":
    from datasets import Dataset
    from transformers import BertTokenizer, BertForSequenceClassification, TrainingArguments, Trainer

# --- 1. Функція завантаження та очищення даних ---
def load_and_clean_data(file_path):
    print(f"Завантаження даних з {file_path}...")
    df = pd.read_csv(
        file_path, encoding='utf-8-sig', sep=',',
        engine='python', on_bad_lines='skip'
    )
    # Очистка category_id
    df['category_id'] = (
        df['category_id'].astype(str).str.strip()
        .replace('', pd.NA)
    )
    df['category_id'] = pd.to_numeric(df['category_id'], errors='coerce')
    df = df.dropna(subset=['category_id'])
    df['category_id'] = df['category_id'].astype(int)
    # Очистка тексту
    df['text_features'] = df['text_features'].fillna('').astype(str)
    # Перейменування для BERT
    df = df.rename(columns={'category_id': 'labels'})
    print(f"Дані завантажено, {len(df)} рядків.")
    return df

# --- 2. Функція навчання SKlearn ---
def train_sklearn(df):
    print("--- Початок навчання SKLEARN (Random Forest) ---")
    
    # Для продакшену ми тренуємо на ВСІХ даних
    X_train = df['text_features']
    y_train = df['labels']

    pipeline_rf = Pipeline([
        ('tfidf', TfidfVectorizer()),
        ('model', RandomForestClassifier(random_state=42, n_jobs=-1)) # n_jobs=-1 (використовувати всі ядра)
    ])
    
    print("Навчання...")
    pipeline_rf.fit(X_train, y_train)
    
    # Зберігаємо конвеєр у файл
    joblib.dump(pipeline_rf, config.SKLEARN_MODEL_PATH)
    print(f"Модель SKlearn збережено у: {config.SKLEARN_MODEL_PATH}")

# --- 3. Функція навчання BERT ---
def train_bert(df):
    print("--- Початок навчання BERT ---")
    NUM_LABELS = df['labels'].nunique()

    # Ми все одно розділимо, щоб мати валідацію під час навчання
    df_train, df_test = train_test_split(
        df, test_size=0.1, random_state=42, stratify=df['labels']
    )
    train_dataset = Dataset.from_pandas(df_train)
    test_dataset = Dataset.from_pandas(df_test)

    tokenizer = BertTokenizer.from_pretrained(config.BERT_BASE_MODEL)
    def tokenize_function(examples):
        return tokenizer(
            examples['text_features'], padding="max_length", truncation=True, max_length=64
        )
    
    train_dataset_tokenized = train_dataset.map(tokenize_function, batched=True)
    test_dataset_tokenized = test_dataset.map(tokenize_function, batched=True)

    model = BertForSequenceClassification.from_pretrained(config.BERT_BASE_MODEL, num_labels=NUM_LABELS)

    training_args = TrainingArguments(
        output_dir='./results_temp', # Тимчасова папка
        num_train_epochs=3,
        per_device_train_batch_size=8,
        logging_steps=50,
    )
    
    trainer = Trainer(
        model=model, args=training_args,
        train_dataset=train_dataset_tokenized,
        eval_dataset=test_dataset_tokenized,
    )
    
    print("Навчання BERT...")
    trainer.train()
    
    # Зберігаємо фінальну модель та токенізер
    trainer.save_model(config.BERT_MODEL_PATH)
    tokenizer.save_pretrained(config.BERT_MODEL_PATH)
    print(f"Модель BERT збережено у: {config.BERT_MODEL_PATH}")

# --- 4. Головний блок ---
if __name__ == "__main__":
    df = load_and_clean_data(config.DATA_FILE)
    
    if config.MODEL_TYPE == "BERT":
        train_bert(df)
    elif config.MODEL_TYPE == "RF":
        train_sklearn(df)
    else:
        print(f"Невідомий MODEL_TYPE у config.py: {config.MODEL_TYPE}")