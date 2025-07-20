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
      searchPlaceholderValue: 'Search destinations...',
      itemSelectText: '',
      placeholder: true,
      //placeholderValue: 'Select destination...',
      searchFloor: 1,
      searchResultLimit: 10,
      renderChoiceLimit: 1, // Limit initial rendering
      shouldSort: false,
      maxItemCount: 1,
      removeItems: false,
      duplicateItemsAllowed: false,
      renderSelectedChoices: 'auto',
    });

    dropdown.choicesInstance = choices;

    // Add choices programmatically AFTER init
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
/*window.routeToDestination = function() {
  const dropdown = document.getElementById('destinationDropdown');
  const selectedValue = dropdown?.value;
  
  if (dropdown && selectedValue) {
    // Trigger path rendering
    if (typeof window.goTo === 'function') {
      // Log routing information
      console.log(`Routing to destination: ${selectedValue}`);
      window.goTo(selectedValue);
      
      // Show the navigation arrow after routing is set
      const navigationArrow = document.getElementById('navigation-arrow');
      if (navigationArrow) {
        navigationArrow.setAttribute('visible', 'true');
      }
    } else {
      console.error("[Routing] goTo function is not defined");
    }
    
    // Reset the dropdown selection
    const choicesInstance = dropdown.choicesInstance;
    if (choicesInstance) {
      choicesInstance.removeActiveItems(); // Clear selection
      choicesInstance.setChoiceByValue(''); // Reset to placeholder
    }
  } else {
    console.warn('No destination selected');
  }
};*/
window.routeToDestination = async function () {
  const dropdown = document.getElementById('destinationDropdown');
  const selectedValue = dropdown?.value;

  if (dropdown && selectedValue) {
    // Check if a marker has been scanned
    if (!window.userPosition) {
      console.warn('[Navigation] No marker scanned yet, cannot start navigation');
      alert('Please scan a marker to set your position before starting navigation.');
      return;
    }

    // Request sensor permissions
    const permissionsGranted = await window.requestSensorPermissions();
    if (!permissionsGranted) {
      console.warn('Sensor permissions not granted, cannot proceed with routing');
      alert('Please allow sensor permissions to enable navigation.');
      return;
    }

    // Trigger AR navigation
    if (typeof window.arNavigation.placeNavigationPath === 'function') {
      console.log(`[Navigation] Starting AR navigation to: ${selectedValue}`);
      window.arNavigation.placeNavigationPath(selectedValue);
    } else {
      console.error("[Navigation] startNavigation function is not defined");
      alert("AR navigation is not available. Please try again later.");
    }

    // Reset the dropdown selection
    const choicesInstance = dropdown.choicesInstance;
    if (choicesInstance) {
      choicesInstance.removeActiveItems(); // Clear selection
      choicesInstance.setChoiceByValue(''); // Reset to placeholder
    }
  } else {
    console.warn('No destination selected');
    alert('Please select a destination.');
  }
};
