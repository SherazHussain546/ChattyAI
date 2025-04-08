#!/bin/bash

# Install dependencies
pip install fastapi uvicorn firebase-admin python-dotenv pydantic google-generativeai python-multipart

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload