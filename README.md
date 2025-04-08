# CyberArk Cortex Chat

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
2. Install the required Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3. Start the orchestrator server:
    ```bash
    python orchestrator.py
    ```

You're all set! Both servers should now be running.

