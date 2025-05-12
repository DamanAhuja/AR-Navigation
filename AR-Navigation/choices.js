// Initialize destination dropdown with Choices.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("Choices.js initializing...");
  
  const dropdown = document.getElementById('destinationDropdown');
  if (!dropdown) {
    console.error("Destination dropdown element not found");
    return;
  }
  
  // Ensure complete cleanup
  if (window.existingChoices) {
    try {
      window.existingChoices.destroy();
    } catch(e) {}
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
    
    // Initialize Choices.js with full configuration
    const choicesInstance = new Choices(dropdown, {
      choices: [
        {
          value: '',
          label: 'Select destination...',
          selected: true,
          disabled: true
        },
        ...destinations.map(dest => ({
          value: dest,
          label: dest,
          selected: false,
          disabled: false
        }))
      ],
      searchEnabled: true,
      searchChoices: true,
      searchPlaceholderValue: 'Search destinations...',
      placeholder: true,
      placeholderValue: 'Select destination...',
      
      // Search and selection configurations
      searchFloor: 1,  // Show suggestions after 1 character
      searchResultLimit: 10,  // Limit suggestions
      shouldSort: false,
      maxItemCount: 1,  // Only one selection allowed
      removeItems: false,
      
      // Rendering preferences
      renderSelectedChoices: 'always',
      
      // UI Customization
      itemSelectText: '',
      classNames: {
        containerOuter: 'choices',
        containerInner: 'choices__inner',
        input: 'choices__input',
        inputCloned: 'choices__input--cloned',
        list: 'choices__list',
        listItems: 'choices__list--multiple',
        listSingle: 'choices__list--single',
        listDropdown: 'choices__list--dropdown',
        item: 'choices__item',
        itemSelectable: 'choices__item--selectable',
        itemDisabled: 'choices__item--disabled',
        itemChoice: 'choices__item--choice',
        placeholder: 'choices__placeholder',
        group: 'choices__group',
        groupHeading: 'choices__heading',
        button: 'choices__button',
        activeState: 'is-active',
        focusState: 'is-focused',
        openState: 'is-open',
        disabledState: 'is-disabled',
        highlightedState: 'is-highlighted',
        selectedState: 'is-selected',
        flippedState: 'is-flipped',
        loadingState: 'is-loading',
        noResults: 'has-no-results',
        noChoices: 'has-no-choices'
      }
    });
    
    // Store global reference
    window.existingChoices = choicesInstance;
    
    // Add custom reset method
    window.resetDropdown = () => {
      if (window.existingChoices) {
        // Reset to placeholder
        window.existingChoices.setChoiceByValue('');
        
        // Ensure input is cleared
        const choicesInput = dropdown.closest('.choices').querySelector('.choices__input');
        if (choicesInput) {
          choicesInput.value = '';
          choicesInput.setAttribute('placeholder', 'Select destination...');
        }
      }
    };
    
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
    // Call routing function
    if (typeof window.goTo === 'function') {
      window.goTo(dropdown.value);
    } else {
      console.error("[Routing] goTo function is not defined");
    }
    
    // Reset dropdown after routing
    if (window.resetDropdown) {
      window.resetDropdown();
    }
  }
};
