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
  dropdown.innerHTML = '';

  const placeholderOption = document.createElement('option');
  placeholderOption.value = "";
  placeholderOption.text = "Select destination...";
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  dropdown.appendChild(placeholderOption);

  const destinations = window.extractedNodes.map(node => node.id);

  // Destroy previous Choices instance if it exists
  if (dropdown.choicesInstance) {
    dropdown.choicesInstance.destroy();
  }

  // Initialize Choices.js with minimal config to suppress preloading
  const choices = new Choices(dropdown, {
    searchEnabled: true,
    searchPlaceholderValue: 'Search destinations...',
    itemSelectText: '',
    placeholder: true,
    placeholderValue: 'Select destination...',
    searchFloor: 1,
    searchResultLimit: 10,
    shouldSort: false,
    renderChoiceLimit: 0,
    maxItemCount: 1,
    removeItems: false,
    renderSelectedChoices: 'always',
    duplicateItemsAllowed: false,
  });

  // Store the instance for future reference or destruction
  dropdown.choicesInstance = choices;

  // Add choices programmatically after init
  choices.setChoices(
    destinations.map(dest => ({
      value: dest,
      label: dest,
      selected: false,
      disabled: false
    })),
    'value',
    'label',
    false
  );
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
