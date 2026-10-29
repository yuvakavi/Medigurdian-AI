import json
import urllib.error
import urllib.request

from app.config import settings
from app.llm.prompts import MEDICAL_SYSTEM_PROMPT


class LlamaService:

    def __init__(self):
        self.provider = settings.llm_provider
        self.model = settings.llm_model
        self.ollama_url = "http://localhost:11434/api/chat"

    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
    ) -> str:

        if not prompt or not prompt.strip():
            raise ValueError("Prompt cannot be empty.")

        # =====================================================
        # MOCK PROVIDER
        # =====================================================

        if self.provider == "mock":

            return (
                "This is a development response from "
                "Medigurdian AI.\n\n"
                "The Llama 3 model is not connected yet. "
                "The RAG pipeline successfully retrieved "
                "healthcare knowledge and prepared the prompt.\n\n"
                "This system provides informational assistance "
                "and does not provide a medical diagnosis."
            )

        # =====================================================
        # OLLAMA PROVIDER
        # =====================================================

        if self.provider == "ollama":

            payload = {
                "model": self.model,
                "messages": [
                    {
                        "role": "system",
                        "content": MEDICAL_SYSTEM_PROMPT
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "stream": False,
                # Keep the local model warm between assistant requests.
                "keep_alive": "30m",
                # Bound generation time on CPU-only local Ollama installs.
                "options": {
                    "num_predict": max(32, int(max_tokens)),
                    "temperature": 0.2,
                    "top_p": 0.9,
                    "repeat_penalty": 1.1,
                },
            }

            request = urllib.request.Request(
                self.ollama_url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json"
                },
                method="POST"
            )

            try:

                with urllib.request.urlopen(
                    request,
                    timeout=120
                ) as response:

                    response_data = json.loads(
                        response.read().decode("utf-8")
                    )

                message = response_data.get(
                    "message",
                    {}
                )

                content = message.get(
                    "content",
                    ""
                )

                if not content:
                    raise RuntimeError(
                        "Ollama returned an empty response."
                    )

                return content.strip()

            except urllib.error.URLError as e:

                raise RuntimeError(
                    "Unable to connect to Ollama. "
                    "Make sure Ollama is running."
                ) from e

            except Exception as e:

                raise RuntimeError(
                    f"Ollama generation failed: {e}"
                ) from e

        # =====================================================
        # UNKNOWN PROVIDER
        # =====================================================

        raise RuntimeError(
            f"Unsupported LLM provider: {self.provider}"
        )

    def generate_with_system_prompt(
        self,
        prompt: str
    ) -> str:

        return self.generate(prompt)


llama_service = LlamaService()