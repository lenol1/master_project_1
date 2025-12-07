ML service: corrections & personalized retraining
===============================================

What changed
------------
- The ML service now accepts and stores both numeric category ids and readable category names when a user submits a correction.
- The retraining routine will try to resolve corrected category names into numeric ids (using a small built-in map and heuristics) so that examples get added to the personalized training set.

How to reproduce locally
------------------------
1. Run the ML server (FastAPI) and the Node backend. If you use the dev setup, run both services:

   - ML: `uvicorn api:app --reload --port 8000`
   - Backend: `npm start` (or how you normally run the server)

2. From the frontend do a prediction on a new (previously unseen) description, then change the predicted category (so the frontend will submit the original prediction to the backend).

3. The backend will forward the correction to ML and retraining will be scheduled in background. The ML service will map corrected names to numeric labels where possible and include those examples for the personalized model.

Testing utilities
-----------------
There's a small helper script `test_retrain.py` that appends a correction row for a test user and triggers `retrain_personalized_model()` directly. Run it from the `ml/` folder with your Python environment:

```bash
python test_retrain.py
```

This will create `model_user_<user_id>.joblib` and print the post-training prediction.

Notes and limitations
---------------------
- If a user corrects to a completely custom category name that does not map to one of the global IDs, a simple heuristic mapping is used (contains/substring match and special handling for 'лік' -> `Аптека/Косметика`).
- For a more robust long-term approach we can:
  - keep a small mapping maintained on both services, or
  - allow users to define which local category maps to which global label, or
  - let the ML service dynamically create new classes (more complex and out of scope for this quick fix).

If you want me to add a more advanced fuzzy-matching or a UI-based mapping workflow — tell me and I'll extend it.
