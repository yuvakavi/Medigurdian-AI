
from typing import List, Optional
from threading import Lock

from sentence_transformers import SentenceTransformer


EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"


class EmbeddingService:
    """
    Converts text into numerical vectors for semantic search.
    Loads the embedding model only when first needed.
    """

    def __init__(
        self,
        model_name: str = EMBEDDING_MODEL_NAME
    ):
        self.model_name = model_name
        self._model: Optional[SentenceTransformer] = None
        self._model_lock = Lock()

    @property
    def model(self) -> SentenceTransformer:
        if self._model is None:
            with self._model_lock:
                if self._model is None:
                    self._model = SentenceTransformer(
                        self.model_name,
                        device="cpu"
                    )

        return self._model

    def embed_text(self, text: str) -> List[float]:
        if not text or not text.strip():
            raise ValueError("Text cannot be empty.")

        embedding = self.model.encode(
            text.strip(),
            normalize_embeddings=True
        )

        return embedding.tolist()

    def embed_documents(
        self,
        texts: List[str]
    ) -> List[List[float]]:
        if not texts:
            return []

        cleaned_texts = [
            text.strip()
            for text in texts
            if text and text.strip()
        ]

        if not cleaned_texts:
            return []

        embeddings = self.model.encode(
            cleaned_texts,
            normalize_embeddings=True
        )

        return embeddings.tolist()


embedding_service = EmbeddingService()
