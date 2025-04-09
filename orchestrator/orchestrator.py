from flask import Flask, request, jsonify
from flask_cors import CORS

# from snowflake.snowpark import Session
# from snowflake.cortex import Complete
#example model registry. Eventually store these in snowflake.
modelRegistry_dummy = [
        { "id": "test1", "name": "Test 1", "description": "Description for Test 1", "publishDate": "2023-03-01 12:00:00" },
        { "id": "test2", "name": "Test 2", "description": "Description for Test 2", "publishDate": "2023-03-02 12:00:00" },
        { "id": "test3", "name": "Test 3", "description": "Description for Test 3", "publishDate": "2023-03-03 12:00:00" },
        { "id": "test2dup1", "name": "Test 2", "description": "Much longer description, detailing the semantic models used and the last update date.", "publishDate": "2023-03-04 12:00:00" },
        { "id": "test2dup2", "name": "Test 2", "description": "Description for Test 2", "publishDate": "2023-03-05 12:00:00" },
        { "id": "test2dup3", "name": "Test 2", "description": "Description for Test 2", "publishDate": "2023-03-06 12:00:00" }
    ]

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

@app.route('/modelRegistry', methods=['POST'])
def modelRegistry():
    if modelRegistry:
        return jsonify(modelRegistry_dummy)
    else:
        return jsonify([]), 404

if __name__ == '__main__':
    app.run(debug=True)



