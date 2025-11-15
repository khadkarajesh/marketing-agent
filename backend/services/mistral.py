from mistralai import Mistral
from config import MISTRAL_API_KEY

class MistralClient:
    def __init__(self):
        print(MISTRAL_API_KEY)
        self.client = Mistral(api_key = MISTRAL_API_KEY)

    def get_embedding(self, text, model="mistral-embed"):
        response = self.client.embeddings.create(
            model=model,
            inputs=text
        )
        return response.data[0].embedding

    def generate(self, prompt, model="mistral-medium-latest"):
        response = self.client.chat.complete(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        return response.choices[0].message["content"]