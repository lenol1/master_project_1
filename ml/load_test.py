import requests
import time
import concurrent.futures
import statistics

# Налаштування тесту
URL = "http://localhost:8000/api/v1/categorize"
NUM_REQUESTS = 50  # Скільки всього запитів відправити
CONCURRENT_USERS = 1 # Скільки "користувачів" одночасно

# Тестові дані
PAYLOAD = {
    "description": "Київстар",
    "user_id": "load_test_user"
}

def send_request(request_id):
    try:
        start = time.time()
        response = requests.post(URL, json=PAYLOAD)
        end = time.time()
        
        latency = (end - start) * 1000 # Час у мс
        
        if response.status_code == 200:
            return latency
        else:
            print(f"❌ Помилка {response.status_code}: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Збій запиту: {e}")
        return None

print(f"🚀 Запуск навантажувального тестування...")
print(f"🎯 Ціль: {URL}")
print(f"📦 Всього запитів: {NUM_REQUESTS}")
print(f"👥 Паралельних потоків: {CONCURRENT_USERS}")
print("-" * 40)

start_total = time.time()

# Запуск паралельних запитів
latencies = []
with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENT_USERS) as executor:
    results = executor.map(send_request, range(NUM_REQUESTS))
    for res in results:
        if res is not None:
            latencies.append(res)

end_total = time.time()
total_duration = end_total - start_total

# Розрахунок статистики
if latencies:
    avg_latency = statistics.mean(latencies)
    min_latency = min(latencies)
    max_latency = max(latencies)
    throughput = len(latencies) / total_duration
    
    print("\n📊 РЕЗУЛЬТАТИ ТЕСТУВАННЯ:")
    print("-" * 40)
    print(f"✅ Успішних запитів: {len(latencies)} / {NUM_REQUESTS}")
    print(f"⏱️ Загальний час: {total_duration:.2f} сек")
    print(f"⚡ Пропускна здатність (Throughput): {throughput:.2f} req/sec")
    print("-" * 40)
    print(f"🐢 Середній час відгуку (Avg Latency): {avg_latency:.2f} мс")
    print(f"🐇 Мінімальний час (Min Latency): {min_latency:.2f} мс")
    print(f"🐌 Максимальний час (Max Latency): {max_latency:.2f} мс")
else:
    print("❌ Усі запити завершилися помилкою.")