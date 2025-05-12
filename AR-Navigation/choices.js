// Initialize destination dropdown with Choices.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("Choices.js initializing...");
  
  const dropdown = document.getElementById('destinationDropdown');
  if (!dropdown) {
    console.error("Destination dropdown element not found");
    return;
  }
  
  // Ensure cleanup of any existing Choices instances
  if (window.existingChoices) {
    window.existingChoices.destroy();
  }
  
  // Function to populate dropdown from extractedNodes
  function populateDropdownFromExtractedNodes() {
    // Clear any existing options
    dropdown.innerHTML = '';
    
    // Verify extractedNodes
    if (!window.extractedNodes || !Array.isArray(window.extractedNodes)) {
      console.error("extractedNodes is not available or not an array");
      return null;
    }
    
    // Prepare destinations
    const destinations = window.extractedNodes.map(node => node.id);
    
    // Add placeholder option
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.text = 'Select destination...';
    placeholderOption.selected = true;
    dropdown.appendChild(placeholderOption);
    
    // Add destination options
    destinations.forEach(dest => {
      const option = document.createElement('option');
      option.value = dest;
      option.text = dest;
      dropdown.appendChild(option);
    });
    
    // Initialize Choices.js with aggressive reset configuration
    const choicesInstance = new Choices(dropdown, {
      searchEnabled: true,
      searchPlaceholderValue: 'Search destinations...',
      placeholder: true,
      placeholderValue: 'Select destination...',
      
      // Key configurations
      searchFloor: 1,  // Require at least 1 character to show suggestions
      searchResultLimit: 10,  // Limit number of suggestions
      
      // Strict selection control
      removeItems: false,
      shouldSort: false,
      maxItemCount: 1,
      
      // Ensure no preselected items
      renderSelectedChoices: 'always'
    });
    
    // Store global reference to allow manual reset
    window.existingChoices = choicesInstance;
    
    return choicesInstance;
  }
  
  // Retry mechanism for extractedNodes
  let retryCount = 0;
  const maxRetries = 30;
  const checkInterval = 500;
  
  function checkForExtractedNodes() {
    console.log(`[Choices] Checking for extractedNodes (attempt ${retryCount + 1}/${maxRetries})`);
    
    if (window.extractedNodes && Array.isArray(window.extractedNodes) && window.extractedNodes.length > 0) {
      console.log(`[Choices] Found ${window.extractedNodes.length} nodes, updating dropdown`);
      populateDropdownFromExtractedNodes();
      return;
    }
    
    retryCount++;
    if (retryCount < maxRetries) {
      setTimeout(checkForExtractedNodes, checkInterval);
    } else {
      console.error("[Choices] Failed to load extractedNodes after maximum retries");
    }
  }
  
  // Start checking for extractedNodes
  checkForExtractedNodes();
});

// Global function to route to destination
window.routeToDestination = function() {
  const dropdown = document.getElementById('destinationDropdown');
  
  if (dropdown && dropdown.value) {
    // Reset choices instance if exists
    if (window.existingChoices) {
      window.existingChoices.setChoiceByValue('');
      dropdown.selectedIndex = 0;
    }
    
    // Call routing function
    if (typeof window.goTo === 'function') {
      window.goTo(dropdown.value);
    } else {
      console.error("[Routing] goTo function is not defined");
    }
  }
};
