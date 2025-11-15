import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

with open("./controllers/search_prompt.txt","r") as file:
    SEARCH_PROMPT = file.read()