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
    // Clear any existing options
    dropdown.innerHTML = '';
    
    // Add placeholder option
    const placeholderOption = document.createElement('option');
    placeholderOption.value = "";
    placeholderOption.text = "Select destination...";
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    dropdown.appendChild(placeholderOption);
    
    // Check if extractedNodes exists and is an array
    if (!window.extractedNodes || !Array.isArray(window.extractedNodes)) {
      console.error("extractedNodes is not available or not an array");
      return null;
    }
    
    // Add options from extractedNodes
    const destinations = window.extractedNodes.map(node => node.id);
    
    // Initialize Choices.js with specific configuration
    return new Choices(dropdown, {
      searchEnabled: true,
      searchPlaceholderValue: 'Search destinations...',
      itemSelectText: 'Select',
      placeholder: true,
      placeholderValue: 'Select destination...',
      
      // Key configurations for the behavior you want
      searchFloor: 1,  // Require at least 1 character to show suggestions
      searchResultLimit: 10,  // Limit number of suggestions
      choices: destinations.map(dest => ({
        value: dest,
        label: dest,
        selected: false,
        disabled: false
      })),
      
      // Additional configurations
      shouldSort: false,
      renderChoiceLimit: 0,  // Initially show no choices
      maxItemCount: 1,
      removeItems: false,
      renderSelectedChoices: 'always'
    });
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
  if (dropdown && dropdown.value) {
    // Check if goTo function exists before calling
    if (typeof window.goTo === 'function') {
      window.goTo(dropdown.value);
    } else {
      console.error("[Routing] goTo function is not defined");
    }
  }
};
