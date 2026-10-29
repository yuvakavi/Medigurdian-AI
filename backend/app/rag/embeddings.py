from typing import List

from sentence_transformers import SentenceTransformer


# =========================================================
# EMBEDDING MODEL
# =========================================================

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"


class EmbeddingService:
    """
    Converts text into numerical vectors (embeddings)
    for semantic search in ChromaDB.
    """

    def __init__(
        self,
        model_name: str = EMBEDDING_MODEL_NAME
    ):
        self.model_name = model_name
        self.model = SentenceTransformer(model_name)

    # =====================================================
    # EMBED ONE TEXT
    # =====================================================

    def embed_text(self, text: str) -> List[float]:
        if not text or not text.strip():
            raise ValueError(
                "Text cannot be empty."
            )

        embedding = self.model.encode(
            text,
            normalize_embeddings=True
        )

        return embedding.tolist()

    # =====================================================
    # EMBED MULTIPLE TEXTS
    # =====================================================

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


# =========================================================
# SINGLE EMBEDDING SERVICE INSTANCE
# =========================================================

embedding_service = EmbeddingService()