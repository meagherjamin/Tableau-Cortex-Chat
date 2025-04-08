# Tableau Cortex Chat

## Getting Started

### Starting the Extension Web Server
1. Navigate to the `extensions-api-main` folder:
    ```bash
    cd extensions-api-main
    ```
2. Install the required dependencies:
    ```bash
    npm install
    ```
3. Build the project:
    ```bash
    npm run build
    ```
4. Start the web server:
    ```bash
    npm start
    ```

### Starting the Orchestrator Server
1. Navigate to the orchestrator folder.
   ```bash
   cd orchastrator
   ```
2. Install the required Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3. Start the orchestrator server:
    ```bash
    python orchestrator.py
    ```

You're all set! Both servers should now be running.

Todo:
- Sanitize User Input.
- Define Resquest + Response Format for each endpoint. 
- Implement configuration and setttings usage on the extension instead of parameters.
-Implement option for  User Input selection buttons, like "Select Path" or "Global Search", "Local Search". The use of these buttons could be defined in the modeID lookup on initialization.
- Extension <-> Orchastrator Authentication(?)


