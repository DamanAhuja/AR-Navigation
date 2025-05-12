document.addEventListener("DOMContentLoaded", () => {
  console.log("Choices.js initializing...");
  const dropdown = document.getElementById('destinationDropdown');
  if (!dropdown) {
    console.error("Destination dropdown element not found");
    return;
  }
  function populateDropdownFromExtractedNodes() {
    // Clear existing dropdown content
    dropdown.innerHTML = '';
    // Destroy existing Choices instance if any
    if (dropdown.choicesInstance) {
      dropdown.choicesInstance.destroy();
    }
    
    const destinations = window.extractedNodes.map(node => node.id);
    
    // Init Choices with placeholder, minimal config
    const choices = new Choices(dropdown, {
      searchEnabled: true,
      searchPlaceholderValue: 'Select destination...',
      itemSelectText: '',
      placeholder: true,
      placeholderValue: 'Select destination...',
      searchFloor: 1,
      searchResultLimit: 10,
      renderChoiceLimit: 1, // Show only first item (which will be our empty one)
      shouldSort: false,
      maxItemCount: 1,
      removeItems: false,
      duplicateItemsAllowed: false,
      renderSelectedChoices: 'auto',
    });
    dropdown.choicesInstance = choices;
    
    // Add an empty first choice
    const allChoices = [
      {
        value: '',
        label: '',  // Empty label for first choice
        selected: true,
        disabled: false
      },
      ...destinations.map(dest => ({
        value: dest,
        label: dest,
        selected: false,
        disabled: false
      }))
    ];
    
    // Add choices programmatically AFTER init
    choices.setChoices(allChoices, 'value', 'label', false);
    
    // Hide dropdown on blur
    const input = dropdown.parentElement.querySelector('input');
    const list = dropdown.parentElement.querySelector('.choices__list--dropdown');
    if (input) {
      input.addEventListener('focus', () => {
        if (list) list.style.display = '';
      });
      input.addEventListener('blur', () => {
        setTimeout(() => {
          if (list) list.style.display = 'none';
        }, 200);
      });
    }
    
    // Force close dropdown initially
    if (list) {
      list.style.display = 'none';
    }
  }
  // Retry mechanism
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
      dropdown.innerHTML = '<option value="">No destinations available</option>';
    }
  }
  checkForExtractedNodes();
});
window.routeToDestination = function () {
  const dropdown = document.getElementById('destinationDropdown');
  const selectedValue = dropdown?.value;
  if (dropdown && selectedValue) {
    // Trigger path rendering
    if (typeof window.goTo === 'function') {
      window.goTo(selectedValue);
    } else {
      console.error("[Routing] goTo function is not defined");
    }
    // Reset the dropdown selection
    const choicesInstance = dropdown.choicesInstance;
    if (choicesInstance) {
      choicesInstance.removeActiveItems(); // Clear selection
      choicesInstance.setChoiceByValue(''); // Reset to placeholder
    }
  }
};
