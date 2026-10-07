import re
from typing import Any

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from app.config import settings

analyzer = SentimentIntensityAnalyzer()

def clean_text(text: str) -> str:
    if not text:
        return ""
    # Remove mentions
    text = re.sub(r'@\w+', '', text)
    # Remove hashtags
    text = re.sub(r'#\w+', '', text)
    # Remove URLs
    text = re.sub(r'http\S+', '', text)
    return text.strip()

def analyze_sentiment(text: str) -> dict:
    if not text:
        return {"compound": 0.0, "pos": 0.0, "neu": 0.0, "neg": 0.0}
    return analyzer.polarity_scores(text)

def compute_perf_score(likes: int, comments: int, shares: int, saves: int, reach: int, followers: int) -> float:
    engagement = (
        (likes or 0) * settings.weight_likes +
        (comments or 0) * settings.weight_comments +
        (shares or 0) * settings.weight_shares +
        (saves or 0) * settings.weight_saves
    )
    denominator = (reach if reach and reach > 0 else (followers or 1)) or 1
    return float(engagement / denominator)

def extract_hashtags(text: str) -> list[str]:
    if not text:
        return []
    return [tag.lower() for tag in re.findall(r'#(\w+)', text)]

def analyze_posts_batch(posts: list[dict[str, Any]], account_followers: int) -> list[dict[str, Any]]:
    """
    Analyzes a batch of posts and computes performance scores, sentiment, topics, and hashtag clusters.
    Returns the enriched posts.
    """
    if not posts:
        return []

    # 1. Compute basic metrics (performance score, sentiment, hashtags)
    all_captions = []
    for post in posts:
        caption = post.get("caption") or ""

        # Sentiment
        sentiment_scores = analyze_sentiment(caption)
        post["sentiment"] = sentiment_scores

        # Performance score
        metrics = post.get("metrics", {})
        post["perf_score"] = compute_perf_score(
            likes=metrics.get("likes", 0),
            comments=metrics.get("comments", 0),
            shares=metrics.get("shares", 0),
            saves=metrics.get("saves", 0),
            reach=metrics.get("reach", 0),
            followers=account_followers
        )

        # Hashtags
        post["hashtags"] = extract_hashtags(caption)

        cleaned = clean_text(caption)
        all_captions.append(cleaned)

    # 2. Extract topics via TF-IDF if there are enough documents
    if len([c for c in all_captions if c.strip()]) > 3:
        try:
            vectorizer = TfidfVectorizer(max_features=10, stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(all_captions)
            feature_names = vectorizer.get_feature_names_out()

            for i, post in enumerate(posts):
                if all_captions[i].strip():
                    doc_vector = tfidf_matrix.getrow(i).toarray()[0]
                    # Get top 3 topics for this post
                    top_indices = doc_vector.argsort()[-3:][::-1]
                    topics = [feature_names[idx] for idx in top_indices if doc_vector[idx] > 0]
                    post["topics"] = topics
                else:
                    post["topics"] = []
        except Exception:
            for post in posts:
                post["topics"] = []
    else:
        for post in posts:
            post["topics"] = []

    # 3. Percentile-normalize perf_score within this batch (assuming batch is per-account)
    perf_scores = [p["perf_score"] for p in posts]
    if perf_scores:
        s = pd.Series(perf_scores)
        if s.max() > s.min(): # Avoid division by zero if all scores are identical
            # Percentile ranking (0-1)
            ranks = s.rank(pct=True).tolist()
            for i, post in enumerate(posts):
                post["perf_score_percentile"] = ranks[i]
        else:
            for post in posts:
                post["perf_score_percentile"] = 0.5

    return posts
