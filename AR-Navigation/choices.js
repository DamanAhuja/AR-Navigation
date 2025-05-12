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
    
    // Create a placeholder option first - important!
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.text = 'Select destination...';
    placeholderOption.selected = true;
    dropdown.appendChild(placeholderOption);
    
    // Init Choices with placeholder, minimal config
    const choices = new Choices(dropdown, {
      searchEnabled: true,
      searchPlaceholderValue: 'Select destination...',
      itemSelectText: '',
      placeholder: true,
      searchFloor: 1,
      searchResultLimit: 10,
      shouldSort: false,
      maxItemCount: 1,
      removeItems: false,
      duplicateItemsAllowed: false,
      renderSelectedChoices: 'auto',
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
        itemOption: 'choices__item--choice',
        group: 'choices__group',
        groupHeading: 'choices__heading',
        button: 'choices__button',
        activeState: 'is-active',
        focusState: 'is-focused',
        openState: 'is-open',
        disabledState: 'is-disabled',
        highlightedState: 'is-highlighted',
        selectedState: 'is-selected',
        flippedState: 'is-flipped'
      }
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
    
    // IMPORTANT: Force close dropdown immediately after initialization
    const dropdownList = dropdown.parentElement.querySelector('.choices__list--dropdown');
    if (dropdownList) {
      dropdownList.classList.remove('is-active');
      dropdownList.style.display = 'none';
    }
    
    // Override Choices.js behavior 
    const input = dropdown.parentElement.querySelector('input.choices__input');
    if (input) {
      // Prevent the dropdown from showing on focus
      const originalShowDropdown = choices.showDropdown.bind(choices);
      choices.showDropdown = function() {
        // Don't immediately show the dropdown
      };
      
      // Only show dropdown when user starts typing
      let minCharsToShow = 1; // Show dropdown after at least 1 character
      
      input.addEventListener('input', (e) => {
        if (e.target.value.length >= minCharsToShow) {
          // Only now show the dropdown
          if (dropdownList) {
            dropdownList.classList.add('is-active');
            dropdownList.style.display = '';
          }
        } else {
          // Hide dropdown if user deletes characters
          if (dropdownList) {
            dropdownList.classList.remove('is-active');
            dropdownList.style.display = 'none';
          }
        }
      });
      
      // Hide dropdown on blur
      input.addEventListener('blur', () => {
        setTimeout(() => {
          if (dropdownList) {
            dropdownList.classList.remove('is-active');
            dropdownList.style.display = 'none';
          }
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
