# Course AI tutor setup

The tutor uses Groq for answers and a local multilingual model for embeddings. No OpenAI key or Ollama server is required. Keep the Groq key only in `server/.env`:

```dotenv
GROQ_API_KEY=your_groq_key_here
GROQ_CHAT_MODEL=openai/gpt-oss-20b
AI_VECTOR_INDEX=course_content_local_v1
```

Groq's free plan is subject to rate limits. Local embeddings have no per-request API charge. The first preparation downloads the quantized `Xenova/paraphrase-multilingual-MiniLM-L12-v2` model from Hugging Face to `server/.cache/embeddings`; subsequent requests use the cached CPU model. Allow time and internet access for the first download. English and Urdu text are supported.

From `apps/server`:

```powershell
npm install
npm run ai:index
npm run ai:prepare
npm run dev
```

`ai:index` creates the MongoDB Atlas Vector Search index. The MongoDB account needs Search Index permissions. Wait until Atlas reports the index queryable. If creating it manually, choose **Vector Search**, collection `tutorchunks`, name `course_content_local_v1`, and this definition:

```json
{"fields":[{"type":"vector","path":"embedding","numDimensions":384,"similarity":"cosine"},{"type":"filter","path":"courseId"},{"type":"filter","path":"model"}]}
```

`ai:prepare` prepares existing course materials and skips those already prepared with the current model. It can be rerun after a failed download or connection. Older OpenAI embeddings are excluded from retrieval; their materials must be prepared again. The new 384-dimension index has a separate name from the old 1536-dimension index.

For future uploads: Teacher → My courses → Open course → Course material: publish notes, PDF or TXT files. Then open **AI tutor → Prepare for tutor**. Warnings explain unreadable attachments. PDFs are limited to 150 pages; each material is limited to 1000 passages. Scanned PDFs and images require a text transcript; OCR and audio/video transcription are not included.

Student → My courses → Open course → **AI tutor**. Ask a self-contained question and expand citations to see exact passages, page numbers and source downloads. Questions are independent; browser conversation history is not sent as context. The tutor declines answers with insufficient evidence or invalid citations.

Enrollment is checked before retrieval and before responding. Atlas filters by the authorized course and embedding model; results are checked against live material records and the current prepared revision. Only published course materials are indexed, excluding quiz answers, submissions and grades. Embeddings are generated locally and stored in MongoDB. Questions and relevant excerpts are sent to Groq. Preparation is explicit and retryable; interrupted preparation locks expire after ten minutes. Deleting a material removes its chunks and preparation record.

If setup fails, check the saved Groq key, Atlas network access and permissions, and the model download connection. Restart the API after editing `.env`. The ordinary LMS can run without tutor configuration.

References: [Groq API compatibility](https://console.groq.com/docs/openai), [Groq models](https://console.groq.com/docs/models), [local multilingual model](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2), [Atlas Vector Search indexes](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type/).
