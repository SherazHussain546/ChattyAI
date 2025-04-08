from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import google.generativeai as genai
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore, auth
import base64
import json
import time
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="ChattyAI API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize Firebase Admin SDK
try:
    firebase_credentials = {
        "type": "service_account",
        "project_id": os.environ.get("FIREBASE_PROJECT_ID"),
        "private_key_id": os.environ.get("FIREBASE_PRIVATE_KEY_ID", ""),
        "private_key": os.environ.get("FIREBASE_PRIVATE_KEY", "").replace('\\n', '\n'),
        "client_email": os.environ.get("FIREBASE_CLIENT_EMAIL", ""),
        "client_id": os.environ.get("FIREBASE_CLIENT_ID", ""),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": os.environ.get("FIREBASE_CLIENT_CERT_URL", "")
    }
    cred = credentials.Certificate(firebase_credentials)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firebase Admin SDK initialized successfully")
except Exception as e:
    print(f"Firebase Admin SDK initialization error: {str(e)}")
    # Initialize without Firebase for development purposes
    db = None

# Initialize Google Generative AI
try:
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
    # Set up the model
    model = genai.GenerativeModel('gemini-pro')
    vision_model = genai.GenerativeModel('gemini-pro-vision')
    print("Gemini API initialized successfully")
except Exception as e:
    print(f"Gemini API initialization error: {str(e)}")
    model = None
    vision_model = None

# Model classes
class ChatRequest(BaseModel):
    prompt: str
    user_id: str
    chat_id: Optional[str] = None
    screenshot: Optional[str] = None
    chat_history: Optional[List[Dict[str, Any]]] = []

class ChatResponse(BaseModel):
    response: str
    chat_id: str

# Helper function to verify Firebase token
async def verify_token(token: str):
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# Routes
@app.get("/")
async def root():
    return {"status": "ChattyAI API is running"}

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not model and not vision_model:
        raise HTTPException(status_code=500, detail="AI models not initialized")
    
    try:
        # Create a new chat ID if none was provided
        chat_id = request.chat_id if request.chat_id else f"chat_{int(time.time())}"
        
        # Prepare chat history for the model
        history = []
        for msg in request.chat_history:
            role = "user" if msg.get("role") == "user" else "model"
            history.append({"role": role, "parts": [msg.get("content", "")]})
        
        ai_response = ""
        
        # If screenshot is provided, use vision model
        if request.screenshot:
            try:
                # Decode base64 image
                image_data = base64.b64decode(request.screenshot.split(",")[1] if "," in request.screenshot else request.screenshot)
                
                # Use vision model
                contents = [request.prompt, {"mime_type": "image/jpeg", "data": image_data}]
                response = vision_model.generate_content(contents)
                ai_response = response.text
            except Exception as e:
                print(f"Vision model error: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Vision model error: {str(e)}")
        else:
            # Use regular chat model
            chat = model.start_chat(history=history)
            response = chat.send_message(request.prompt)
            ai_response = response.text
        
        # Store chat in Firebase if available
        if db:
            try:
                # Create a new chat document if it doesn't exist
                chat_ref = db.collection("users").document(request.user_id).collection("chats").document(chat_id)
                
                # Add the message to the messages subcollection
                messages_ref = chat_ref.collection("messages")
                
                # Add user message
                messages_ref.add({
                    "content": request.prompt,
                    "role": "user",
                    "timestamp": firestore.SERVER_TIMESTAMP,
                    "has_image": bool(request.screenshot)
                })
                
                # Add AI response
                messages_ref.add({
                    "content": ai_response,
                    "role": "assistant",
                    "timestamp": firestore.SERVER_TIMESTAMP,
                    "has_image": False
                })
                
                # Update chat metadata
                chat_ref.set({
                    "updated_at": firestore.SERVER_TIMESTAMP,
                    "title": request.prompt[:50] + "..." if len(request.prompt) > 50 else request.prompt,
                    "last_message": ai_response[:100] + "..." if len(ai_response) > 100 else ai_response
                }, merge=True)
            except Exception as e:
                print(f"Firebase storage error: {str(e)}")
                # Continue even if storage fails
        
        return ChatResponse(response=ai_response, chat_id=chat_id)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@app.get("/chats/{user_id}")
async def get_chats(user_id: str):
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        # Get all chats for the user
        chats_ref = db.collection("users").document(user_id).collection("chats").order_by("updated_at", direction=firestore.Query.DESCENDING)
        chats = chats_ref.stream()
        
        chat_list = []
        for chat in chats:
            chat_data = chat.to_dict()
            chat_data["id"] = chat.id
            chat_list.append(chat_data)
        
        return {"chats": chat_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@app.get("/chats/{user_id}/{chat_id}")
async def get_chat_messages(user_id: str, chat_id: str):
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        # Get all messages for the chat
        messages_ref = db.collection("users").document(user_id).collection("chats").document(chat_id).collection("messages").order_by("timestamp")
        messages = messages_ref.stream()
        
        message_list = []
        for message in messages:
            message_data = message.to_dict()
            message_data["id"] = message.id
            
            # Format the timestamp
            if message_data.get("timestamp"):
                ts = message_data["timestamp"]
                if isinstance(ts, firestore.SERVER_TIMESTAMP):
                    message_data["timestamp"] = datetime.now().isoformat()
                else:
                    message_data["timestamp"] = ts.isoformat()
            
            message_list.append(message_data)
        
        return {"messages": message_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# Run the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)