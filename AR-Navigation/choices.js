// Initialize destination dropdown with Choices.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("Choices.js initializing...");
  
  const dropdown = document.getElementById('destinationDropdown');
  if (!dropdown) {
    console.error("Destination dropdown element not found");
    return;
  }
  
  // Function to populate dropdown from extractedNodes
  function populateDropdownFromExtractedNodes() {
    // Check if extractedNodes exists and is an array
    if (!window.extractedNodes || !Array.isArray(window.extractedNodes)) {
      console.error("extractedNodes is not available or not an array");
      return null;
    }
    
    // Add options from extractedNodes
    const destinations = window.extractedNodes.map(node => node.id);
    
    // Destroy existing Choices instance if it exists
    if (dropdown.choicesInstance) {
      dropdown.choicesInstance.destroy();
    }
    
    // Clear existing options
    dropdown.innerHTML = '';
    
    // Add placeholder option
    const placeholderOption = document.createElement('option');
    placeholderOption.value = "";
    placeholderOption.text = "Select destination...";
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    dropdown.appendChild(placeholderOption);
    
    // Add destination options
    destinations.forEach(dest => {
      const option = document.createElement('option');
      option.value = dest;
      option.text = dest;
      dropdown.appendChild(option);
    });
    
    // Initialize Choices.js with specific configuration
    const choicesInstance = new Choices(dropdown, {
      searchEnabled: true,
      searchPlaceholderValue: 'Search destinations...',
      itemSelectText: '',
      placeholder: true,
      placeholderValue: 'Select destination...',
      
      // Configurations to control dropdown behavior
      searchFloor: 1,  // Require at least 1 character to show suggestions
      searchResultLimit: 10,  // Limit number of suggestions
      shouldSort: false,
      maxItemCount: 1,  // Ensure only one item can be selected
      removeItems: false,
      renderSelectedChoices: 'always'
    });
    
    // Store reference to the Choices instance on the dropdown
    dropdown.choicesInstance = choicesInstance;
    
    // Add event listener to reset selection when needed
    dropdown.addEventListener('change', function(event) {
      // Ensure the placeholder is hidden when a selection is made
      const choicesInput = this.closest('.choices').querySelector('.choices__input');
      if (choicesInput) {
        choicesInput.setAttribute('placeholder', 'Select destination...');
      }
    });
    
    return choicesInstance;
  }
  
  // Retry mechanism to wait for extractedNodes
  let retryCount = 0;
  const maxRetries = 30;
  const checkInterval = 500; // Check every 500ms
  
  function checkForExtractedNodes() {
    console.log(`[Choices] Checking for extractedNodes (attempt ${retryCount + 1}/${maxRetries})`);
    
    // Check if extractedNodes exists and has data
    if (window.extractedNodes && Array.isArray(window.extractedNodes) && window.extractedNodes.length > 0) {
      console.log(`[Choices] Found ${window.extractedNodes.length} nodes, updating dropdown`);
      populateDropdownFromExtractedNodes();
      return;
    }
    
    // If not found, retry with limit
    retryCount++;
    if (retryCount < maxRetries) {
      setTimeout(checkForExtractedNodes, checkInterval);
    } else {
      console.error("[Choices] Failed to load extractedNodes after maximum retries");
      
      // Optional: Add error handling or fallback
      dropdown.innerHTML = '<option value="">No destinations available</option>';
    }
  }
  
  // Start checking for extractedNodes
  checkForExtractedNodes();
});

// Global function to route to destination
window.routeToDestination = function() {
  const dropdown = document.getElementById('destinationDropdown');
  
  // Ensure Choices instance exists and has a value
  if (dropdown && dropdown.choicesInstance && dropdown.value) {
    // Reset the dropdown to placeholder state
    dropdown.choicesInstance.setChoiceByValue('');
    
    // Check if goTo function exists before calling
    if (typeof window.goTo === 'function') {
      window.goTo(dropdown.value);
    } else {
      console.error("[Routing] goTo function is not defined");
    }
  }
};
