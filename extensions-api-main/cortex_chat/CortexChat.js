

$(document).ready(function() {
    

    let dashboardFilters = []; //holds the filters from the dashboard TODO: structure this better with the datasources.
    let dashboardDataSources = []; //holds the datasources from the dashboard
    let currentUser = ''; //read from username parameter, the tableau user (email)
    let feedbackSubmitted = new Set(); //tracks feedback on messages.
    let chatHistory = []; //holds the chat history for the session.

    //Orchastrator connection info
    //TODO have a better way to configure this.
    let orchastratorAddress = 'http://127.0.0.1:5000/'
    
    // Initialize Tableau Extension
    tableau.extensions.initializeAsync({'configure': configure}).then(function() {

        console.log("Extension initialized");
        addStatusMessage("Extension connected to Tableau");

        // Check if the model has been saved to settings from configuration. If not, force the user to select a model.
        var savedModelSetting = tableau.extensions.settings.get("model");
        if (!savedModelSetting) {
            console.log("Model not configured, showing modal.");
            showModelNotConfiguredModal();
        } else {
            try {
                var modelObj = JSON.parse(savedModelSetting);
                $(".bot-title").text(modelObj.name);
                // If the modal exists, remove it because we have a valid configuration.
                if ($("#modelNotConfiguredModal").length > 0) {
                    $("#modelNotConfiguredModal").modal('hide');
                    $("#modelNotConfiguredModal").remove();
                    $(".modal-backdrop").remove();
                }
            } catch (e) {
                console.error("Error parsing saved model: ", e);
                showModelNotConfiguredModal();
            }
        }
        //add event listener for setting changes.
        tableau.extensions.settings.addEventListener(tableau.TableauEventType.SettingsChanged, (settingsEvent) => {
        console.log("Settings changed:", settingsEvent.newSettings);
        if (tableau.extensions.settings.get("model")) {
                if ($("#modelNotConfiguredModal").length > 0) {
                    $("#modelNotConfiguredModal").modal('hide');
                    $("#modelNotConfiguredModal").remove();
                    $(".modal-backdrop").remove();
                }
        }
        });
  
        //Get the dashboard object
        let dashboard = tableau.extensions.dashboardContent.dashboard;
        //Gather reserved parameter values, username.
        tableau.extensions.dashboardContent.dashboard.getParametersAsync().then(function (parameters) {
            parameters.forEach(function (p) {
              if (p.name === "username") {
                currentUser = p.currentValue.formattedValue;
                addStatusMessage(`Username: ${currentUser}`);
              }
            });
        });
        
        //TODO store filters in a better way..
        refreshDashboardFilters();
        refreshDashboardDataSources();
  
        //create eventListeners to filter changes on worksheets
        dashboard.worksheets.forEach(worksheet => {
            worksheet.addEventListener(tableau.TableauEventType.FilterChanged, function() {
                refreshDashboardFilters();
            });
        });
        
    }).catch(function(err) {
        // Display error
        addStatusMessage("Error initializing: " + err.toString());
    });
    //Configuration function.
    const defaultModelId = '';
    async function configure() {
        const popupURL = './config.html';
        let dialogStyle = tableau.DialogStyle.Modal;
        tableau.extensions.ui.displayDialogAsync(popupURL, defaultModelId, { height: 550, width: 500, dialogStyle })
          .then((closePayload) => {
            console.log('Configuration Dialog closed with message: ' + closePayload);
                // Retrieve the saved model from settings
                const savedModelSetting = tableau.extensions.settings.get("model");
                if (savedModelSetting) {
                    try {
                        var modelObj = JSON.parse(savedModelSetting);
                        $(".bot-title").text(modelObj.name);
                        addStatusMessage("Saved Model: " + modelObj.name);
                    } catch(e) {
                        console.error("Error parsing saved model:", e);
                        addStatusMessage("Error reading saved model configuration");
                    }
                } else {
                    addStatusMessage("Model not set.");
                }

          }).catch((err) => {
            console.error("Dialog closed with error: " + err.toString());
          });
    }

  
    // Handle user chat input submission
    $("#chatInputForm").on("submit", function(e) {
        e.preventDefault();
        const userInput = $("#userInput").val().trim();
        processMessage(userInput);
    });
    
    // Handle feedback thumbs up/down clicks using a modal overlay
    $(document).on("click", ".feedback-button.up, .feedback-button.down", function(e) {
        const button = $(this);
        const isUp = button.hasClass("up");
        const messageContainer = button.closest(".message-container");
        const messageId = messageContainer.data("message-id");

        if (feedbackSubmitted.has(messageId)) {
            return; // prevent double submission
        }

        // Remove any existing feedback modal if present
        $(".feedback-modal").remove();

        // Create the feedback modal overlay with the feedback box
        const feedbackModal = $(`
            <div class="feedback-modal">
                <div class="feedback-box">
                    <h3 class="feedback-header">We'd love your feedback!</h3>
                    <textarea placeholder="${isUp ? 'Optional..' : 'Where did I go wrong?'}"></textarea>
                    <div class="feedback-actions">
                        <button class="submit-feedback">Submit</button>
                        <button class="cancel-feedback">Cancel</button>
                    </div>
                </div>
            </div>
        `);

        // Append the modal to the body
        $("body").append(feedbackModal);

        // Focus on the textarea
        feedbackModal.find("textarea").focus();

        // Save selected type and message id in the modal's data
        feedbackModal.data("feedback-type", isUp ? "up" : "down");
        feedbackModal.data("message-id", messageId);

        // Reset both button states
        const buttonGroup = button.parent();
        buttonGroup.find(".feedback-button.up, .feedback-button.down").css({ color: "", fontWeight: "normal" });
        // Highlight the selected button
        button.css({
            color: isUp ? "green" : "red",
            fontWeight: "bold"
        });

        // Prevent click from bubbling to document
        e.stopPropagation();
    });
  
    // Feedback Submit button : submitFeedback 
    // needs to have the last message sent as well(we could get this from api history using requestId)
    $(document).on("click", ".submit-feedback", function () {
        const modal = $(this).closest(".feedback-modal");
        const text = modal.find("textarea").val().trim();
        const type = modal.data("feedback-type");
        const messageId = modal.data("message-id");
        const messageContainer = $(`.message-container[data-message-id="${messageId}"]`);

        const statusElement = $("<div class=\"status-message\"></div>").text(`Feedback submitted: ${text}`);
        messageContainer.after(statusElement);

        submitFeedback(messageId, type, text);

        feedbackSubmitted.add(messageId); //marks message as feedback submitted

        //set colors + disable other feedback option for message
        const upButton = messageContainer.find(".feedback-button.up");
        const downButton = messageContainer.find(".feedback-button.down");

        if (type === "up") {
            upButton.css("color", "green");
            downButton.prop("disabled", true).css("opacity", 0.5);
        } else {
            downButton.css("color", "red");
            upButton.prop("disabled", true).css("opacity", 0.5);
        }
        modal.remove();
    });
    // Feedback Cancel button
    $(document).on("click", ".cancel-feedback", function () {
        $(this).closest(".feedback-modal").remove();
    });

    // Clicking outside feedback box cancels it
    $(document).on("click", function (e) {
    if (!$(e.target).closest(".feedback-box, .feedback-button.up, .feedback-button.down").length) {
        //$(".feedback-box").remove();
        $(".feedback-box").each(function () {
            const box = $(this);
            const messageId = box.data("message-id");
        
            const messageContainer = $(`.message-container[data-message-id="${messageId}"]`);
            messageContainer.find(".feedback-button.up, .feedback-button.down").css({
                color: "",
                fontWeight: ""
            });
        
            box.remove();
            });

    }
    });

    //resets the color on feedback buttons when cancelled
    $(document).on("click", function (e) {
    if (!$(e.target).closest(".feedback-box, .feedback-button.up, .feedback-button.down").length) {
        $(".feedback-box").each(function () {
        const box = $(this);
        const messageId = box.data("message-id");
    
        const messageContainer = $(`.message-container[data-message-id="${messageId}"]`);
        messageContainer.find(".feedback-button.up, .feedback-button.down").css({
            color: "",
            fontWeight: ""
        });
    
        box.remove();
        });
    }
    });
      
    //Add event listener for copy message button clicks
    $(document).on("click", ".feedback-button.copy", function() {
        const button = $(this);
        const messageContainer = button.closest(".message-container");
        const messageText = messageContainer.find(".message").text();
        
        // Copy text to clipboard
        navigator.clipboard.writeText(messageText).then(function() {
            // Show toast notification
            showToast("Response copied to clipboard");
            
            // Briefly highlight the button
            button.addClass("active");
            setTimeout(function() {
                button.removeClass("active");
            }, 1000);
            
            console.log("Text copied to clipboard");
        }).catch(function(err) {
            console.error("Could not copy text: ", err);
        });
    });
  
    //Add event listener for copy ReqeustId clicks
    $(document).on("click", ".feedback-button.copyId", function() {
        const button = $(this);
        const messageContainer = button.closest(".message-container");
        const requestId = messageContainer.data("request-id");
        
        navigator.clipboard.writeText(requestId).then(function () {
            showToast("Copied Request ID to clipboard");
  
            button.addClass("active");
            setTimeout(function () {
                button.removeClass("active");
            }, 1000);
  
            console.log("Request ID copied to clipboard");
        }).catch(function (err) {
            console.error("Could not copy Request ID: ", err);
        });
    });

    // Add event listener for copying table data as CSV
    $(document).on("click", ".feedback-button.copyData", function() {
        const button = $(this);
        const container = button.closest(".message-container");
        const sqlData = container.data("sql-data");
        console.log('sqlData', sqlData);
        if (sqlData) {
            const csv = convertJSONToCSV(sqlData);
            navigator.clipboard.writeText(csv).then(function() {
                showToast("Data copied as CSV");
                button.addClass("active");
                setTimeout(function() {
                    button.removeClass("active");
                }, 1000);
            }).catch(function(err) {
                console.error("Could not copy data: ", err);
            });
        }
    });
  
    //send chat request to orchestrator
    //TODO Sanitize user input.
    function sendChatRequest(latest_msg, messageId) {
        const filtersToSend = getFlatFilterList();
        //latest_msg is only for testing. We will send the full chat context to the orchestrator.
        latest_msg_text = latest_msg.message.content[0].text;
        //what the request body will eventually look like.
        //TODO implement dashboard source in request for monitoring.
        const eventualRequestBody = JSON.stringify({
            chatHistory: chatHistory,
            filters: filtersToSend,
            user: currentUser
          }, null, 2);

          //fake data for testing.
          const requestId = Date.now().toString(); 
          let response = {};

          let big_table = [
            {
              "Name": "Alice",
              "Age": 25,
              "City": "New York",
              "Occupation": "Engineer",
              "Salary": 70.000,
              "Experience": 5,
              "Hobbies": ["Reading", "Traveling"],
              "Skills": ["Python", "JavaScript"],
              "Languages": ["English", "Spanish"],
              "Education": {
                "Degree": "Bachelor's",
                "Major": "Computer Science",
                "University": "MIT"
              }
            },
            {
              "Name": "Bob",
              "Age": 30,
              "City": "San Francisco",
              "Occupation": "Engineer",
              "Salary": 70.000,
              "Experience": 5,
              "Hobbies": ["Reading", "Traveling"],
              "Skills": ["Python", "JavaScript"],
              "Languages": ["English", "Spanish"],
              "Education": {
                "Degree": "Bachelor's",
                "Major": "Computer Science",
                "University": "MIT"
              }
            },
            {
              "Name": "Charlie",
              "Age": 35,
              "City": "Los Angeles",
              "Occupation": "Engineer",
              "Salary": 70.000,
              "Experience": 5,
              "Hobbies": ["Reading", "Traveling"],
              "Skills": ["Python", "JavaScript"],
              "Languages": ["English", "Spanish"],
              "Education": {
                "Degree": "Bachelor's",
                "Major": "Computer Science",
                "University": "MIT"
              }
            },
            {
              "Name": "Charlie",
              "Age": 35,
              "City": "Los Angeles",
              "Occupation": "Engineer",
              "Salary": 70.000,
              "Experience": 5,
              "Hobbies": ["Reading", "Traveling"],
              "Skills": ["Python", "JavaScript"],
              "Languages": ["English", "Spanish"],
              "Education": {
                "Degree": "Bachelor's",
                "Major": "Computer Science",
                "University": "MIT"
              }
            },
            {
              "Name": "Charlie",
              "Age": 35,
              "City": "Los Angeles",
              "Occupation": "Engineer",
              "Salary": 70.000,
              "Experience": 5,
              "Hobbies": ["Reading", "Traveling"],
              "Skills": ["Python", "JavaScript"],
              "Languages": ["English", "Spanish"],
              "Education": {
                "Degree": "Bachelor's",
                "Major": "Computer Science",
                "University": "MIT"
              }
            },
            {
              "Name": "Charlie",
              "Age": 35,
              "City": "Los Angeles",
              "Occupation": "Engineer",
              "Salary": 70.000,
              "Experience": 5,
              "Hobbies": ["Reading", "Traveling"],
              "Skills": ["Python", "JavaScript"],
              "Languages": ["English", "Spanish"],
              "Education": {
                "Degree": "Bachelor's",
                "Major": "Computer Science",
                "University": "MIT"
              }
            },
            {
              "Name": "Charlie",
              "Age": 35,
              "City": "Los Angeles",
              "Occupation": "Engineer",
              "Salary": 70.000,
              "Experience": 5,
              "Hobbies": ["Reading", "Traveling"],
              "Skills": ["Python", "JavaScript"],
              "Languages": ["English", "Spanish"],
              "Education": {
                "Degree": "Bachelor's",
                "Major": "Computer Science",
                "University": "MIT"
              }
            },
            {
              "Name": "Charlie",
              "Age": 35,
              "City": "Los Angeles",
              "Occupation": "Engineer",
              "Salary": 70.000,
              "Experience": 5,
              "Hobbies": ["Reading", "Traveling"],
              "Skills": ["Python", "JavaScript"],
              "Languages": ["English", "Spanish"],
              "Education": {
                "Degree": "Bachelor's",
                "Major": "Computer Science",
                "University": "MIT"
              }
            },
            {
              "Name": "Charlie",
              "Age": 35,
              "City": "Los Angeles",
              "Occupation": "Engineer",
              "Salary": 70.000,
              "Experience": 5,
              "Hobbies": ["Reading", "Traveling"],
              "Skills": ["Python", "JavaScript"],
              "Languages": ["English", "Spanish"],
              "Education": {
                "Degree": "Bachelor's",
                "Major": "Computer Science",
                "University": "MIT"
              }
            },
            {
              "Name": "Charlie",
              "Age": 35,
              "City": "Los Angeles",
              "Occupation": "Engineer",
              "Salary": 70.000,
              "Experience": 5,
              "Hobbies": ["Reading", "Traveling"],
              "Skills": ["Python", "JavaScript"],
              "Languages": ["English", "Spanish"],
              "Education": {
                "Degree": "Bachelor's",
                "Major": "Computer Science",
                "University": "MIT"
              }
            },
            {
              "Name": "Charlie",
              "Age": 35,
              "City": "Los Angeles",
              "Occupation": "Engineer",
              "Salary": 70.000,
              "Experience": 5,
              "Hobbies": ["Reading", "Traveling"],
              "Skills": ["Python", "JavaScript"],
              "Languages": ["English", "Spanish"],
              "Education": {
                "Degree": "Bachelor's",
                "Major": "Computer Science",
                "University": "MIT"
              }
            },
            {
              "Name": "Charlie",
              "Age": 35,
              "City": "Los Angeles",
              "Occupation": "Engineer",
              "Salary": 70.000,
              "Experience": 5,
              "Hobbies": ["Reading", "Traveling"],
              "Skills": ["Python", "JavaScript"],
              "Languages": ["English", "Spanish"],
              "Education": {
                "Degree": "Bachelor's",
                "Major": "Computer Science",
                "University": "MIT"
              }
            },
            {
              "Name": "Charlie",
              "Age": 35,
              "City": "Los Angeles",
              "Occupation": "Engineer",
              "Salary": 70.000,
              "Experience": 5,
              "Hobbies": ["Reading", "Traveling"],
              "Skills": ["Python", "JavaScript"],
              "Languages": ["English", "Spanish"],
              "Education": {
                "Degree": "Bachelor's",
                "Major": "Computer Science",
                "University": "MIT"
              }
            }
          ];

          let small_table = 
            [
                {
                  "Age": 25
                }
          ]

            //fake replies for testing.
            if (latest_msg_text === "text") {  
                response = {
                    request_id: requestId,
                    message: {
                        role: "analyst",
                        content: [
                            {
                                type: "text",
                                text: "This is an example text response."
                            }
                        ]
                    }
                };
            } else if (latest_msg_text === "filters") {
            response = {
                requestId : requestId,
                message: {
                    role: "analyst",
                    content: [
                        {
                            type: "text",
                            text: "This is an example text response with filters!"
                        }, 
                        {
                            type: "text",
                            text: "Here are the filters applied to the dashboard: " + JSON.stringify(filtersToSend, null, 2)
                        }
                    ]
                },
            }
            }else if (latest_msg_text === "small data") {
                response = {
                    request_id: requestId,
                    message: {
                        role: "analyst",
                        content: [
                            {
                                type: "text",
                                text: "This is an example text response with data!"
                            }
                        ]
                    },
                    sql_eval: small_table
                };
            } else if (latest_msg_text === "big data") {
                response = {
                    request_id: requestId,
                    message: {
                        role: "analyst",
                        content: [
                            {
                                type: "text",
                                text: "This is an example text response with data!"
                            }
                        ]
                    },
                    sql_eval: big_table
                };
            } else {
                //suggestion response.
                response = {
                    request_id: requestId,
                    message: {
                        role: "analyst",
                        content: [
                            {   type: "text",
                                text: "I'm sorry, we couldn't process that request. Try one of these options instead."
                            },
                            {
                                type: "suggestions",
                                suggestions: ["text", "small data", "big data", "filters", "longer than the last will this go on the next line?"]
                            }
                        ]
                    }
                };
                
            }

        //append response to chat history
        appendChatHistory(messageId, response);

        //update the bot message with the response. This replaces the "Cortex Thinking..." placeholder.
        updateBotMessage(messageId, response);
      }

    //Orchestrator Request. Sends feedback to the feedback endpoint.
    function submitFeedback(messageId, type, text) {

        fetch(orchastratorAddress+'/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messageId: messageId,
                type: type,
                text: text
            })
        })
        .then(response => {
            if (response.ok) {
                console.log("Feedback submitted successfully");
                console.log(Object.keys(response));
            } else {
                console.error("Failed to submit feedback");
            }
        })
        .catch(error => {
            console.error("Error submitting feedback:", error);
        });
       console.log("Submitting feedback:", { messageId, type, text });
    }

    //append message struct to the chat history.
    function appendChatHistory(messageId, message) {
        chatHistory.push({messageId: messageId, content: message});
    }

    // Fetch and store datasources from the dashboard.
    function refreshDashboardDataSources() {
        const dashboard = tableau.extensions.dashboardContent.dashboard;
    
        let datasourcePromises = dashboard.worksheets.map(worksheet =>
            worksheet.getDataSourcesAsync().then(data => ({
                sheetName: worksheet.name,
                datasourceID: data.id,
                datasourceName: data.name,
                datasourceisExtract: data.isExtract,
            }))
        );
    
        Promise.all(datasourcePromises).then(results => {
            dashboardDataSources = results;
            console.log("Data Sources updated:", dashboardDataSources);
        }).catch(err => {
            console.error("Failed to refresh filters:", err);
        });
    }

    //Fetch and store filters + datasources from dashboard
    function refreshDashboardFilters() {
        const dashboard = tableau.extensions.dashboardContent.dashboard;
    
        let filterPromises = dashboard.worksheets.map(worksheet =>
        worksheet.getFiltersAsync().then(filters => ({
            sheetName: worksheet.name,
            filters: filters
        }))
        );
    
        Promise.all(filterPromises).then(results => {
        dashboardFilters = results;
        console.log("Filters updated:", getFlatFilterList());
        }).catch(err => {
        console.error("Failed to refresh filters:", err);
        });
    }
    
    //Format filters for request payload
    function getFlatFilterList() {
        return dashboardFilters.flatMap(sheet =>
        sheet.filters.map(filter => ({
            field: filter.fieldName,
            values: filter.appliedValues?.map(v => v.value) || [],
            sheet: sheet.sheetName
        }))
        );
    }
    
    // Function to show toast notification
    function showToast(message) {
        const toast = $("#toast");
    
        // Reset classes and set message
        toast.removeClass("hide").text(message);
    
        // Show without transition
        toast.addClass("show");
    
        // After 2 seconds, fade out
        setTimeout(function() {
            toast.addClass("hide");
    
            // After transition ends, remove .show to reset
            toast.on("transitionend", function () {
                toast.removeClass("show");
                toast.off("transitionend"); // avoid stacking events
            });
        }, 1200);
    }
    
    // Function to add a user message to stream after they submit.
    function addUserMessage(text) {
        const messageContainer = $('<div class="message-container user-container"></div>');
        const messageElement = $('<div class="message user-message"></div>').text(text);
        
        messageContainer.append(messageElement);
        $("#chatMessages").append(messageContainer);
        setTimeout(scrollToBottom, 0);
    }

    // Function to process user input.
    //TODO: We need to sanitize user input.
    function processMessage(userInput) {

        cleanUserInput = userInput;
        
        if (userInput !== "") {
            $("#userInput").val(""); // Clear the input field
            // Add user message
            const messageId = Date.now().toString(); // Simple unique ID
            addUserMessage(cleanUserInput); //add input to stream

            // Append to chat history
            message_obj = {
                "message": {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": cleanUserInput
                        }
                    ]
                }
            }
            appendChatHistory(messageId, message_obj);
            //add loading message to bot.
            addLoadingBotMessage(messageId);

            //simulate delay for testing.
            const randomInterval = 1500;
            setTimeout(function() {
                sendChatRequest(message_obj, messageId); //send chat reqeust handles updating the view.
            }, randomInterval);     
        }
    }
  
    //adds the 'loading' message from the analyst
    function addLoadingBotMessage(messageId) {
        const messageContainer = $(`<div class="message-container bot-container" data-message-id="${messageId}"></div>`);
        const messageElement = $('<div class="message bot-message loading">Cortex is Thinking <i class="fas fa-spinner fa-spin loading-spinner"></i></div>');
        
        messageContainer.append(messageElement);
        $("#chatMessages").append(messageContainer);
        setTimeout(scrollToBottom, 0);
    }
  
    //updates the bots message when response is recieved.
    function updateBotMessage(messageId, response) {
        
        const container = $(`.message-container[data-message-id="${messageId}"]`);
        container.data("request-id", response.request_id);
        const messageElement = container.find(".bot-message");
        messageElement.removeClass("loading");

        let messageText = "";

        //loop through message content. 
        response.message.content.forEach(contentItem => {
            if (contentItem.type === "text") {
                //TODO : implement clean formating for multiple user messages. Right now, all text is appended together.
                messageText += contentItem.text + " "; // Add space to separate multiple texts
            } else if (contentItem.type === "suggestions") {
                
                // If it's suggestions, create sub-bubbles for each suggestion
                const suggestionsContainer = $("<div class='suggestions-container'></div>");
                contentItem.suggestions.forEach(suggestion => {
                    const suggestionBubble = $(`<div class="suggestion-bubble">${suggestion}</div>`);
                    
                    //add click event listener to suggestion
                    suggestionBubble.on("click", function(){
                        processMessage(suggestion);
                    });

                    suggestionsContainer.append(suggestionBubble);
                });
                // Append the suggestions container below the message text
                container.append(suggestionsContainer);
            }
        });

        //process sql_eval if it exists.
        if (response.sql_eval) {
            const tableData = response.sql_eval;
            const tableHtml = generateTableFromJSON(tableData);
            container.data("sql-data", tableData); // Store the SQL data in the container
            container.append(tableHtml);
        }

        messageElement.text(messageText.trim());

        // If there are no suggestions, meaning we had a successful query, add the feedback buttons
        if (!response.message.content.some(contentItem => contentItem.type === "suggestions")) {
            const feedbackButtons = $(`
                <div class="feedback-buttons">
                    <button class="feedback-button up" title="Thumbs up"><i class="fas fa-thumbs-up"></i></button>
                    <button class="feedback-button down" title="Thumbs down"><i class="fas fa-thumbs-down"></i></button>
                    <button class="feedback-button copy" title="Copy to clipboard"><i class="fas fa-copy"></i></button>
                    <button class="feedback-button copyId" title="Copy Request Id"><i class="fas fa-copy"></i>Request ID</button>
                    ${response.sql_eval ? '<button class="feedback-button copyData" title="Copy table data as CSV"><i class="fas fa-copy"></i> Data</button>' : ''}
                </div>
            `);
            container.append(feedbackButtons);
        }
        scrollToBottom(); //scroll the chat to the bottom.
    }

    //converts dataframe.to_json(orient="records") output to a html table.
    function generateTableFromJSON(records) {
        // Check if records is not empty
        if (records.length === 0) return '<p>No data available</p>';

        // Get the column names from the first record (row)
        const keys = Object.keys(records[0]);

        // Create the table element wrapped in a new container
        let tableHtml = '<div class="sql-table-container">';  // New wrapper for the table

        tableHtml += '<table class="sql-table">';
        
        // Create the table header
        tableHtml += '<thead><tr>';
        keys.forEach(key => {
            tableHtml += `<th>${key}</th>`; // Add each column name as a table header
        });
        tableHtml += '</tr></thead>';

        // Create the table body
        tableHtml += '<tbody>';
        records.forEach(record => {
            tableHtml += '<tr>';
            keys.forEach(key => {
                tableHtml += `<td>${record[key]}</td>`; // Add each record's value to the table cell
            });
            tableHtml += '</tr>';
        });
        tableHtml += '</tbody>';

        tableHtml += '</table>';
        tableHtml += '</div>';  // Close the new wrapper for the table

        // Return the HTML table
        return tableHtml;
    }
    
    //converts JSON to CSV for data copy.
    function convertJSONToCSV(jsonData) {
        if (!jsonData || !jsonData.length) return '';
        const keys = Object.keys(jsonData[0]);
        const header = keys.join(',');
        const csvRows = jsonData.map(row => keys.map(key => {
            let value = row[key];
            if (typeof value === 'string') {
                value = value.replace(/\"/g, '\"\"');
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    value = `\"${value}\"`;
                }
            }
            return value;
        }).join(','));
        return header + '\n' + csvRows.join('\n');
    }

    // Function to add a status message to chat stream.
    function addStatusMessage(text) {
        const statusElement = $('<div class="status-message"></div>').text(text);
        $("#chatMessages").append(statusElement);
        setTimeout(scrollToBottom, 0);
    }
    
    //scrolls to bottom of chat window.
    function scrollToBottom() {
        const chatMessages = document.getElementById("chatMessages");
        chatMessages.scrollTop = chatMessages.scrollHeight;
        $("#chatMessages").animate({ scrollTop: chatMessages.scrollHeight }, 200);
    }

    //shows modal if the model is not chosen from the configuration.
    function showModelNotConfiguredModal() {
        // Check if the modal already exists
        if ($("#modelNotConfiguredModal").length === 0) {
            var modalHtml = `
            <div class="modal fade" id="modelNotConfiguredModal" tabindex="-1" role="dialog" aria-labelledby="modelNotConfiguredModalLabel" aria-hidden="true">
              <div class="modal-dialog" role="document">
                <div class="modal-content">
                  <div class="modal-header">
                    <h4 class="modal-title" id="modelNotConfiguredModalLabel">Configuration Required</h4>
                  </div>
                  <div class="modal-body">
                    Please select a model from the configuration menu to use the extension.
                  </div>
                </div>
              </div>
            </div>
            `;
            $("body").append(modalHtml);
        }
        // Open the modal with a static backdrop so it cannot be dismissed by the user
        $("#modelNotConfiguredModal").modal({
            backdrop: 'static',
            keyboard: false
        });
    }
      
    });

