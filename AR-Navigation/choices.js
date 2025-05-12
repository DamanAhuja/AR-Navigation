// Initialize destination dropdown with Choices.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("Choices.js initializing...");
  
  const dropdown = document.getElementById('destinationDropdown');
  if (!dropdown) {
    console.error("Destination dropdown element not found");
    return;
  }
  
  // Predefined list of destinations as a fallback
  const defaultDestinations = [
    'Cabin1', 'Cabin2', 'Cabin3', 
    'Conference1', 'Conference2', 
    'Corridor1', 'Corridor2', 'Corridor3', 
    'Entrance', 'Entrance2', 
    'Kitchen', 
    'Lab1', 'Lab2', 
    'Podcast'
  ];
  
  // Create initial placeholder state
  const placeholderOption = document.createElement('option');
  placeholderOption.value = "";
  placeholderOption.text = "Select destination...";
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  dropdown.appendChild(placeholderOption);
  
  // Initialize Choices.js with default state
  let choicesInstance = new Choices(dropdown, {
    searchEnabled: true,
    itemSelectText: '',
    placeholder: true,
    placeholderValue: "Select destination..."
  });
  
  // Function to populate dropdown
  function populateDropdown(destinations) {
    try {
      // Prepare choices list
      const choicesList = destinations.map(dest => ({
        value: dest,
        label: dest
      }));
      
      // Destroy existing Choices instance
      if (choicesInstance) {
        choicesInstance.destroy();
      }
      
      // Clear existing options
      while (dropdown.firstChild) {
        dropdown.removeChild(dropdown.firstChild);
      }
      
      // Add placeholder option
      const placeholderOption = document.createElement('option');
      placeholderOption.value = "";
      placeholderOption.text = "Select destination...";
      placeholderOption.disabled = true;
      placeholderOption.selected = true;
      dropdown.appendChild(placeholderOption);
      
      // Reinitialize Choices with new options
      choicesInstance = new Choices(dropdown, {
        searchEnabled: true,
        itemSelectText: '',
        placeholder: true,
        placeholderValue: "Select destination...",
        choices: choicesList
      });
      
      console.log("[Choices] Dropdown successfully populated");
    } catch (error) {
      console.error("[Choices] Error populating dropdown:", error);
    }
  }
  
  // Try to use extractedNodes if available, otherwise use default destinations
  let retryCount = 0;
  const maxRetries = 10;
  const checkInterval = 500; // Check every 500ms
  
  function checkForNodes() {
    console.log(`[Choices] Checking for extractedNodes (attempt ${retryCount + 1}/${maxRetries})`);
    
    // Check if extractedNodes exists and has data
    if (window.extractedNodes && Array.isArray(window.extractedNodes) && window.extractedNodes.length > 0) {
      console.log(`[Choices] Found ${window.extractedNodes.length} nodes, updating dropdown`);
      const nodeDestinations = window.extractedNodes.map(node => node.id);
      populateDropdown(nodeDestinations);
      return;
    }
    
    // If not found, retry with limit
    retryCount++;
    if (retryCount < maxRetries) {
      setTimeout(checkForNodes, checkInterval);
    } else {
      console.warn("[Choices] Failed to load node data, using default destinations");
      populateDropdown(defaultDestinations);
    }
  }
  
  // Start checking for nodes data
  checkForNodes();
});

// Global function to route to destination
window.routeToDestination = function() {
  const dropdown = document.getElementById('destinationDropdown');
  if (dropdown && dropdown.value) {
    // Check if goTo function exists before calling
    if (typeof window.goTo === 'function') {
      window.goTo(dropdown.value);
    } else {
      console.error("[Routing] goTo function is not defined");
    }
  }
};
