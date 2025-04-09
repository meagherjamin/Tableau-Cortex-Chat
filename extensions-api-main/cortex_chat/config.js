$(document).ready(function () {
    // Variable to hold the selected model (full object)
    var selectedModel = null;
    let orchastratorAddress = 'http://127.0.0.1:5000/';

    // Function to populate the list container with the provided options
    function populateList(options) {
        var $listContainer = $("#modelIdListContainer");
        $listContainer.empty(); // Clear any existing content

        $.each(options, function (index, option) {
            var $item = $("<div></div>").addClass("list-item").css({
                "padding": "10px",
                "border": "1px solid #ccc",
                "margin-bottom": "5px",
                "cursor": "pointer"
            });

            // Append the model name in bold, the publish date, and description below it
            $item.append($("<div></div>").html("<strong>" + option.name + "</strong>"));
            $item.append($("<div></div>").text("Published on: " + option.publishDate).css("font-size", "small"));
            $item.append($("<div></div>").text(option.description));

            // Save the full model object as data on the element
            $item.data("model", option);

            // Append the list item to the container
            $listContainer.append($item);
        });
    }

    // Initialize the dialog
    tableau.extensions.initializeDialogAsync().then(function () {
        // Send a POST request to the orchestrator's modelRegistry endpoint using fetch
        fetch(orchastratorAddress + "/modelRegistry", {
            method: "POST"
        })
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Network response was not ok, status: " + response.status);
            }
            return response.json();
        })
        .then(function (data) {
            // Populate the list with the returned models
            populateList(data);

            // Add click listener to each list item for selection highlighting
            $("#modelIdListContainer").on("click", ".list-item", function () {
                // Remove the 'selected' class from all items and clear their background
                $(".list-item").removeClass("selected").css("background-color", "");
                // Mark the clicked item as selected and set its background to light blue
                $(this).addClass("selected").css("background-color", "lightblue");
                // Store the selected model (full object)
                selectedModel = $(this).data("model");
            });

            // Pre-select the saved model if it exists in settings
            var savedSetting = tableau.extensions.settings.get("model");
            if (savedSetting) {
                try {
                    var savedModel = JSON.parse(savedSetting);
                    $("#modelIdListContainer").find(".list-item").each(function () {
                        var model = $(this).data("model");
                        if (model.id === savedModel.id) {
                            $(this).addClass("selected").css("background-color", "lightblue");
                            selectedModel = savedModel;
                        }
                    });
                } catch (e) {
                    console.error("Error parsing saved model:", e);
                }
            }
        })
        .catch(function (error) {
            // On error, display an error message in the list container
            $("#modelIdListContainer").html("<div style='color: red; padding: 10px;'>There was an issue fetching models. Please contact IT</div>");
        });

        // Add click listener on the Save button
        $("#saveConfig").on("click", function () {
            if (!selectedModel) {
                alert("Please select an item before saving.");
                return;
            }
            console.log("Saving model:", selectedModel);
            // Save the selected model (full info) to Tableau extension settings as a JSON string
            tableau.extensions.settings.set("model", JSON.stringify(selectedModel));
            tableau.extensions.settings.saveAsync().then(function () {
                console.log("Settings saved with model:", tableau.extensions.settings.get("model"));
                // Close the dialog and optionally pass back a payload
                tableau.extensions.ui.closeDialog("Configuration saved: " + selectedModel.id);
            }).catch(function (err) {
                console.error("Error saving settings: " + err.toString());
            });
        });
    }).catch(function (err) {
         console.error("Error initializing dialog: " + err.toString());
    });
});