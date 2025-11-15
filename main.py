import os
from dotenv import load_dotenv
import praw
from mistralai import Mistral
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
import json
from uuid import uuid4

load_dotenv()

META_DATA = {
    "programming": {
        "subreddits": ["learnprogramming", "coding", "devops", "softwareengineering"],
        "keywords": ["problem", "stuck", "help", "issue", "error"],
    },
    "mentalhealth": {
        "subreddits": ["French", "LearnFrench", "Language", "languagelearning"],
        "keywords": [
            "bad",
            "terrible",
            "awful",
            "horrible",
            "useless",
            "worst",
            "broken",
            "bug",
            "crash",
            "slow",
            "lag",
            "frustrating",
            "annoying",
            "hate",
            "disappointed",
            "duolingo",
            "anki",
            "app",
            "youtube",
        ],
    },
    "language": {
        "subreddits": ["mentalhealth", "breakups", "trauma"],
        "keywords": ["suicide", "die", "unwell" "narcissism", "sober", "divorce"],
    },
}

# SUBREDDITS = ["learnprogramming", "coding", "devops", "softwareengineering"]
# KEYWORDS = ["problem", "stuck", "help", "issue", "error"]


# SUBREDDITS = ["French", "LearnFrench", "Language", "languagelearning"]
# KEYWORDS = ["bad", "terrible", "awful", "horrible", "useless", "worst", "broken", "bug","crash", "slow", "lag", "frustrating", "annoying", "hate", "disappointed", "duolingo", "anki", "app", "youtube"]

SUBREDDITS = ["mentalhealth" , "breakups", "trauma"]
KEYWORDS = ["suicide", "die", "unwell" "narcissism", "sober", "divorce"]
LIMIT = 50  # posts per subreddit

EMBED_MODEL = "mistral-embed"
EMBED_DIM = 1024  # required by qdrant for mistral embedding size


# Reddit client
reddit = praw.Reddit(
    client_id=os.getenv("REDDIT_CLIENT_ID"),
    client_secret=os.getenv("REDDIT_SECRET"),
    user_agent="reddit-problem-collector-script"
)

# Mistral client
mistral = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))

# Qdrant client (local)
qdrant = QdrantClient(url=os.getenv('QDRANT_URL'), api_key=os.getenv('QDRANT_API_KEY'))

def fetch_posts(subreddits, keywords):
    posts = []

    for subreddit in subreddits:
        print(f"🔍 Searching in r/{subreddit}")

        for post in reddit.subreddit(subreddit).hot(limit=LIMIT):
            text_block = (post.title + " " + post.selftext).lower()
            if any(keyword in text_block for keyword in keywords):
                posts.append({
                        "id": post.id,
                        "title": post.title,
                        "text": post.selftext,
                        "url": post.url,
                        "subreddit": subreddit
                })
    print(f"📌 Found {len(posts)} relevant posts.")
    return posts


def embed_posts(posts):

    content = [
        f"{p['title']} \n\n{p['text']}" for p in posts
    ]

    response = mistral.embeddings.create(
        model=EMBED_MODEL,
        inputs=content
    )

    return [d.embedding for d in response.data]


def store_in_qdrant(posts, embeddings):

    qdrant.upsert(
        collection_name=os.getenv('COLLECTION_NAME'),
        points=[
            PointStruct(
                id=str(uuid4()),
                vector=embeddings[i],
                payload={
                    "reddit_id": posts[i]["id"],
                    "title": posts[i]["title"],
                    "text": posts[i]["text"],
                    "subreddit": posts[i]["subreddit"],
                    "url": posts[i]["url"],
                },
            )
            for i in range(len(posts))
        ],
    )

    print(f"🚀 Inserted {len(posts)} posts into Qdrant.")

def append_posts_to_file(posts, filename="posts.txt"):
    """
    Append a list of dictionaries to a text file, one JSON object per line.
    """
    with open(filename, "a", encoding="utf-8") as f:
        for post in posts:
            f.write(json.dumps(post, ensure_ascii=False) + "\n")
    print(f"🗂️ Appended {len(posts)} posts to {filename}")

if __name__ == "__main__":
    posts = []
    for category, data in META_DATA.items():
        subreddits = data.get("subreddits", [])
        keywords = data.get("keywords", [])
        if not subreddits or not keywords:
            continue
        print(f"🗂️ Collecting posts for category '{category}'")
        category_posts = fetch_posts(subreddits, keywords)
        for p in category_posts:
            p["category"] = category
        posts.extend(category_posts)
    append_posts_to_file(posts)
    if posts:
        embeddings = embed_posts(posts)
        store_in_qdrant(posts, embeddings)
