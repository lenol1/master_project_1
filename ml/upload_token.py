from transformers import BertTokenizerFast

# Замініть це на назву базової моделі, на якій тренувався ваш BERT
BASE_MODEL_NAME = "bert-base-multilingual-cased" 
OUTPUT_DIR = r"C:\Users\Olena\WebstormProjects\master_project\ml\production_bert_model" 

# Завантаження та збереження токенізатора
tokenizer = BertTokenizerFast.from_pretrained(BASE_MODEL_NAME)
tokenizer.save_pretrained(OUTPUT_DIR)

print(f"✅ Токенізатор збережено у {OUTPUT_DIR}. Тепер він повністю локальний.")