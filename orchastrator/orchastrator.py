from flask import Flask, request, jsonify
from flask_cors import CORS

temp_model_store = {
    "surveyModelID": {"name": "CSAT Surveys", "description": "Customer Satisfaction Surveys"},
    "supportModelID": {"name": "Support Cases", "description": "Support Chatbot"},
}

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
# Chat endpoint
@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_input = data.get("message", "")
    # Placeholder response logic
    response = {
        "reply": f"You said: {user_input}"
    }
    return jsonify(response)

# Feedback endpoint
@app.route('/feedback', methods=['POST'])
def feedback():
    data = request.get_json()
    # Save/process the feedback here
    print("Received feedback:", data)
    return data['messageId'], 204  # No content, but successful

@app.route('/model', methods=['POST'])
def get_model():
    data = request.get_json()
    modelid = data.get("modelid")
    if modelid and modelid in temp_model_store:
        return jsonify(temp_model_store[modelid])
    else:
        return jsonify({"error": "Model not found"}), 404

if __name__ == '__main__':
    app.run(debug=True)
