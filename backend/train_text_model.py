import os
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# --- Step 1: Create or Load Dataset --- #
data = pd.DataFrame({
    'text': [
        "Someone is following me", 
        "This is a peaceful day", 
        "I heard threats nearby", 
        "Everything is fine", 
        "He has a gun", 
        "It was just a misunderstanding",
        "They tried to attack her",
        "I need help now"
    ],
    'label': [1, 0, 1, 0, 1, 0, 1, 1]  # 1 = threat, 0 = safe
})

# --- Step 2: Preprocessing --- #
X_train, X_test, y_train, y_test = train_test_split(
    data['text'], data['label'], test_size=0.2, random_state=42
)

# Match expected input shape for prediction — 33 features
vectorizer = TfidfVectorizer(max_features=33)
X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf = vectorizer.transform(X_test)

# --- Step 3: Train the Classifier --- #
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train_tfidf, y_train)

# --- Step 4: Evaluate the Model --- #
y_pred = clf.predict(X_test_tfidf)
print(classification_report(y_test, y_pred))

# --- Step 5: Save Vectorizer and Model --- #
os.makedirs("models", exist_ok=True)
joblib.dump(vectorizer, "models/tfidf_vectorizer.pkl")
joblib.dump(clf, "models/threat_text_model.pkl")

print(" Text threat model and vectorizer saved successfully.")