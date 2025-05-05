// Initialize destination dropdown with Choices.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("Choices.js initializing...");
  
  const dropdown = document.getElementById('destinationDropdown');
  if (!dropdown) {
      console.error("Destination dropdown element not found");
      return;
  }
  
  // Create initial placeholder state
  const placeholderOption = document.createElement('option');
  placeholderOption.value = "";
  placeholderOption.text = "Loading destinations...";
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  dropdown.appendChild(placeholderOption);
  
  // Initialize Choices.js with loading state
  let choicesInstance = new Choices(dropdown, {
      searchEnabled: false,
      itemSelectText: '',
      placeholder: true,
      placeholderValue: "Loading destinations..."
  });
  
  // Wait for extractedNodes with a robust retry mechanism
  let retryCount = 0;
  const maxRetries = 30;
  const checkInterval = 500; // Check every 500ms
  
  function checkForNodes() {
      console.log(`[Choices] Checking for extractedNodes (attempt ${retryCount + 1}/${maxRetries})`);
      
      // Check if extractedNodes exists and has data
      if (window.extractedNodes && Array.isArray(window.extractedNodes) && window.extractedNodes.length > 0) {
          console.log(`[Choices] Found ${window.extractedNodes.length} nodes, updating dropdown`);
          updateDropdown();
          return;
      }
      
      // If not found, retry with limit
      retryCount++;
      if (retryCount < maxRetries) {
          setTimeout(checkForNodes, checkInterval);
      } else {
          console.error("[Choices] Failed to load node data after maximum retries");
          // Update dropdown to show error state
          updateDropdownWithError();
      }
  }
  
  function updateDropdown() {
      try {
          // Destroy existing instance
          choicesInstance.destroy();
          
          // Clear dropdown
          while (dropdown.firstChild) {
              dropdown.removeChild(dropdown.firstChild);
          }
          
          // Add placeholder
          const placeholderOption = document.createElement('option');
          placeholderOption.value = "";
          placeholderOption.text = "Select destination...";
          placeholderOption.disabled = true;
          placeholderOption.selected = true;
          dropdown.appendChild(placeholderOption);
          
          // Add all nodes as options
          window.extractedNodes.forEach(node => {
              if (node && node.id) {
                  const option = document.createElement('option');
                  option.value = node.id;
                  option.text = node.id;
                  dropdown.appendChild(option);
              }
          });
          
          // Reinitialize with new options
          choicesInstance = new Choices(dropdown, {
              searchEnabled: true,
              itemSelectText: '',
              placeholder: true,
              placeholderValue: "Select destination...",
              searchPlaceholderValue: "Type to search..."
          });
          
          console.log("[Choices] Dropdown successfully updated with node data");
      } catch (error) {
          console.error("[Choices] Error updating dropdown:", error);
      }
  }
  
  function updateDropdownWithError() {
      try {
          // Destroy existing instance
          choicesInstance.destroy();
          
          // Clear dropdown
          while (dropdown.firstChild) {
              dropdown.removeChild(dropdown.firstChild);
          }
          
          // Add error option
          const errorOption = document.createElement('option');
          errorOption.value = "";
          errorOption.text = "Error loading destinations";
          errorOption.disabled = true;
          errorOption.selected = true;
          dropdown.appendChild(errorOption);
          
          // Reinitialize with error state
          choicesInstance = new Choices(dropdown, {
              searchEnabled: false,
              itemSelectText: '',
              placeholder: true,
              placeholderValue: "Error loading destinations"
          });
      } catch (error) {
          console.error("[Choices] Error updating dropdown with error state:", error);
      }
  }
  
  // Start checking for nodes data
  checkForNodes();
});

window.routeToDestination = function() {
  const dropdown = document.getElementById('destinationDropdown');
  if (dropdown && dropdown.value) {
      window.goTo(dropdown.value);
  }
};
