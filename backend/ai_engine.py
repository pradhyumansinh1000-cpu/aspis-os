from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct
import hashlib
import uuid
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
llm_client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
) if OPENROUTER_API_KEY else None

# Initialize local Qdrant
client = QdrantClient(path="./qdrant_storage")

COLLECTION_NAME = "aspis_intelligence"

# Create collection if it doesn't exist
try:
    client.get_collection(collection_name=COLLECTION_NAME)
except Exception:
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=384, distance=Distance.COSINE),
    )

def generate_embedding(text: str) -> list:
    """
    Simulates a SentenceTransformer model (like all-MiniLM-L6-v2) which outputs 384-dimensional vectors.
    We use deterministic hashing to ensure the demo runs instantly without downloading 2GB PyTorch models.
    """
    vector = []
    base_hash = int(hashlib.sha256(text.encode('utf-8')).hexdigest(), 16)
    for i in range(384):
        # Generate pseudo-random deterministic float between -1 and 1
        val = ((base_hash >> (i % 64)) & 0xFF) / 128.0 - 1.0
        vector.append(val)
    return vector

def index_document(student_id: str, department: str, content: str, metadata: dict):
    """
    Indexes a document into Qdrant.
    """
    vector = generate_embedding(content)
    payload = {
        "student_id": student_id,
        "department": department,
        "content": content,
        **metadata
    }
    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload=payload
            )
        ]
    )

def semantic_search(query: str, limit: int = 5):
    """
    Searches across all departmental data for the query.
    """
    query_vector = generate_embedding(query)
    response = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=limit
    )
    
    formatted_results = []
    for hit in response.points:
        formatted_results.append({
            "score": hit.score,
            "payload": hit.payload
        })
    return formatted_results

def generate_student_intelligence_report(student_context: dict) -> str:
    if not llm_client:
        return "{}"
    
    try:
        response = llm_client.chat.completions.create(
            model="google/gemini-2.5-flash",
            messages=[
                {
                    "role": "system", 
                    "content": "You are ASPIS OS, an advanced Student Intelligence Engine. Analyze the cross-domain student data and output a 4-part holistic Student Performance Card. Return ONLY valid JSON in this exact format: {\"overallScore\": 85, \"domains\": [{\"subject\": \"Academic\", \"score\": 90, \"fullMark\": 100}, {\"subject\": \"Health\", \"score\": 85, \"fullMark\": 100}, {\"subject\": \"Sports\", \"score\": 70, \"fullMark\": 100}, {\"subject\": \"Arts\", \"score\": 95, \"fullMark\": 100}, {\"subject\": \"Behavior\", \"score\": 80, \"fullMark\": 100}], \"strengths\": [\"strength 1\"], \"gaps\": [\"gap 1\"], \"recommendations\": [\"rec 1\"], \"summaryText\": \"summary\", \"teacherReport\": {\"focusAreas\": [\"pedagogical strategy 1\"], \"futureRisks\": [\"predicted risk 1\"]}, \"parentReport\": {\"summary\": \"Warm summary for parents.\", \"encouragement\": [\"Actionable way parents can help 1\"]}, \"coDomainAnalysis\": {\"intro\": \"How co-domains affect academics\", \"correlations\": [{\"domain\": \"Health\", \"impact\": \"Negative\", \"description\": \"Poor attendance affects math\"}]}} Do not include markdown formatting or backticks, just the raw JSON."
                },
                {"role": "user", "content": f"Student Profile Data:\n{str(student_context)}"}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```json"):
            content = content[7:-3]
        elif content.startswith("```"):
            content = content[3:-3]
        return content
    except Exception as e:
        print(f"Error generating intelligence report: {e}")
        return "{}"

def generate_class_action_report(class_data: dict) -> str:
    """
    Calls meta-llama/llama-3.3-70b-instruct:free to generate an actionable pedagogical report for a teacher.
    """
    if not llm_client:
        return "System Warning: OPENROUTER_API_KEY not configured. LLM analysis unavailable."
    
    try:
        response = llm_client.chat.completions.create(
            model="google/gemini-2.5-flash",
            messages=[
                {
                    "role": "system", 
                    "content": "You are ASPIS OS, an advanced Pedagogical AI. Analyze the class performance data provided and generate a concise 3-point Action Report for the teacher. Focus on how to address the weakest concepts and help at-risk students. Use markdown formatting."
                },
                {"role": "user", "content": f"Class Performance Data:\n{str(class_data)}"}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating action report: {str(e)}"

import json

def generate_teacher_alerts(class_data: dict) -> list:
    """
    Calls meta-llama/llama-3.3-70b-instruct:free to generate 3 actionable alerts for a teacher.
    """
    if not llm_client:
        return []
    
    try:
        response = llm_client.chat.completions.create(
            model="google/gemini-2.5-flash",
            messages=[
                {
                    "role": "system", 
                    "content": "You are ASPIS OS, an advanced AI. Analyze the teacher's class data and generate exactly 3 highly actionable Intelligence Alerts. Return ONLY valid JSON in this exact format: [{\"id\": 1, \"type\": \"critical\", \"text\": \"The alert text\", \"time\": \"Just now\"}]. Valid types are 'critical', 'warning', 'success', or 'info'. Do not include markdown codeblocks."
                },
                {"role": "user", "content": f"Class Data:\n{str(class_data)}"}
            ],
            temperature=0.7,
            max_tokens=500
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```json"):
            content = content[7:-3]
        elif content.startswith("```"):
            content = content[3:-3]
        return json.loads(content)
    except Exception as e:
        print(f"Error generating teacher alerts: {e}")
        return []
