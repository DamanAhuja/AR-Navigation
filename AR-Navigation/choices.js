<!-- HTML Dropdown -->
<select id="destinationDropdown" placeholder="Select destination..."></select>

<!-- JS Script -->
<script>
document.addEventListener("DOMContentLoaded", () => {
  console.log("Choices.js initializing...");

  const dropdown = document.getElementById('destinationDropdown');
  if (!dropdown) {
    console.error("Destination dropdown element not found");
    return;
  }

  function populateDropdownFromExtractedNodes() {
    dropdown.innerHTML = '';

    const placeholderOption = document.createElement('option');
    placeholderOption.value = "";
    placeholderOption.text = "Select destination...";
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    dropdown.appendChild(placeholderOption);

    const destinations = window.extractedNodes.map(node => node.id);

    if (dropdown.choicesInstance) {
      dropdown.choicesInstance.destroy();
    }

    const choices = new Choices(dropdown, {
      searchEnabled: true,
      searchPlaceholderValue: 'Search destinations...',
      itemSelectText: '',
      placeholder: true,
      placeholderValue: 'Select destination...',
      searchFloor: 1,
      searchResultLimit: 10,
      shouldSort: false,
      removeItemButton: false,
      duplicateItemsAllowed: false,
      renderSelectedChoices: 'auto',
    });

    dropdown.choicesInstance = choices;

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

    // Hide dropdown list on blur
    const input = dropdown.parentElement.querySelector('input');
    if (input) {
      input.addEventListener('blur', () => {
        // Delay needed to allow click selection before blur hides it
        setTimeout(() => {
          const list = dropdown.parentElement.querySelector('.choices__list--dropdown');
          if (list) list.style.display = 'none';
        }, 200);
      });

      // Show list on focus if there's input
      input.addEventListener('focus', () => {
        const list = dropdown.parentElement.querySelector('.choices__list--dropdown');
        if (list) list.style.display = '';
      });
    }
  }

  // Retry until extractedNodes are available
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

// Route function
window.routeToDestination = function() {
  const dropdown = document.getElementById('destinationDropdown');
  if (dropdown && dropdown.value) {
    if (typeof window.goTo === 'function') {
      window.goTo(dropdown.value);
    } else {
      console.error("[Routing] goTo function is not defined");
    }
  }
};
</script>
