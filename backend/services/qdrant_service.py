from qdrant_client import QdrantClient, models
import uuid
from qdrant_client.models import VectorParams, Distance
from config import QDRANT_URL, QDRANT_API_KEY

class QdrantService:
    def __init__(self):
        self.models = models
        self.client = QdrantClient(
            url=QDRANT_URL,
            api_key=QDRANT_API_KEY
        )
    def get_uuid(self):
        return str(uuid.uuid4())
    def create_collection(self, name, vector_size=1024):
        return self.client.recreate_collection(
            collection_name=name,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE
            )
        )

    def insert_vectors(self, collection_name, points):
        return self.client.upsert(
            collection_name=collection_name,
            points=points
        )

    def search_vectors(self, collection_name, vector, limit=5):
        return self.client.search(
            collection_name=collection_name,
            query_vector=vector,
            limit=limit
        )