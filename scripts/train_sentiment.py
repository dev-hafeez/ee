"""
Train Sentiment Classifier on Sanders Twitter Sentiment Corpus
Compares trained TF-IDF + LogisticRegression against VADER baseline on held-out test split.
Saves model artifact to services/ai/app/analysis/sentiment_classifier.joblib
"""
import csv
import io
import os
import urllib.request
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

DATASET_URL = "https://raw.githubusercontent.com/zfz/twitter_corpus/master/full-corpus.csv"
OUTPUT_MODEL_PATH = "services/ai/app/analysis/sentiment_classifier.joblib"
LOCAL_DATASET_CACHE = "services/ai/data/sanders_twitter_sentiment.csv"

def fetch_data():
    os.makedirs("services/ai/data", exist_ok=True)
    if os.path.exists(LOCAL_DATASET_CACHE):
        print(f"Reading cached dataset from {LOCAL_DATASET_CACHE}...")
        with open(LOCAL_DATASET_CACHE, "r", encoding="utf-8") as f:
            content = f.read()
    else:
        print(f"Fetching dataset from {DATASET_URL}...")
        with urllib.request.urlopen(DATASET_URL, timeout=15) as resp:
            content = resp.read().decode("utf-8", errors="ignore")
        with open(LOCAL_DATASET_CACHE, "w", encoding="utf-8") as f:
            f.write(content)

    reader = csv.reader(io.StringIO(content))
    next(reader) # skip header

    texts = []
    labels = []
    for r in reader:
        if len(r) >= 5:
            sentiment = r[1].lower().strip()
            text = r[4].strip()
            if sentiment in ["positive", "negative", "neutral"] and text:
                texts.append(text)
                labels.append(sentiment)

    return texts, labels

def train_and_evaluate():
    texts, labels = fetch_data()
    print(f"Total valid labeled samples: {len(texts)}")

    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.20, random_state=42, stratify=labels
    )
    print(f"Train split: {len(X_train)} | Test split: {len(X_test)}")

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(max_features=5000, ngram_range=(1, 2), sublinear_tf=True)),
        ("clf", LogisticRegression(C=1.5, max_iter=1000, class_weight="balanced", random_state=42))
    ])

    print("Fitting model...")
    pipeline.fit(X_train, y_train)

    y_pred_model = pipeline.predict(X_test)
    acc_model = accuracy_score(y_test, y_pred_model)
    f1_model = f1_score(y_test, y_pred_model, average="macro")

    # VADER Baseline Evaluation
    vader = SentimentIntensityAnalyzer()
    y_pred_vader = []
    for t in X_test:
        comp = vader.polarity_scores(t)["compound"]
        if comp >= 0.05:
            y_pred_vader.append("positive")
        elif comp <= -0.05:
            y_pred_vader.append("negative")
        else:
            y_pred_vader.append("neutral")

    acc_vader = accuracy_score(y_test, y_pred_vader)
    f1_vader = f1_score(y_test, y_pred_vader, average="macro")

    print("\n================ EVALUATION ON HELD-OUT TEST SET (N = 685) ================")
    print(f"Trained TF-IDF + LogReg Accuracy: {acc_model * 100:.2f}% | Macro F1: {f1_model:.4f}")
    print(f"VADER Baseline Accuracy:          {acc_vader * 100:.2f}% | Macro F1: {f1_vader:.4f}")

    print("\n--- Model Classification Report ---")
    print(classification_report(y_test, y_pred_model))

    print("--- VADER Baseline Classification Report ---")
    print(classification_report(y_test, y_pred_vader))

    os.makedirs(os.path.dirname(OUTPUT_MODEL_PATH), exist_ok=True)
    joblib.dump(pipeline, OUTPUT_MODEL_PATH)
    print(f"Saved trained sentiment model pipeline to: {OUTPUT_MODEL_PATH}")

    return {
        "acc_model": acc_model,
        "f1_model": f1_model,
        "acc_vader": acc_vader,
        "f1_vader": f1_vader
    }

if __name__ == "__main__":
    train_and_evaluate()
