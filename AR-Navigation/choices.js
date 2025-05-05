window.addEventListener('DOMContentLoaded', () => {
    const dropdown = document.getElementById('destinationDropdown');
  
    // Populate the dropdown with options
    if (window.extractedNodes && Array.isArray(window.extractedNodes)) {
      window.extractedNodes.forEach(node => {
        const option = document.createElement('option');
        option.value = node.id;
        option.text = node.id;
        dropdown.appendChild(option);
      });
    } else {
      console.warn('extractedNodes not found or is not an array');
    }
  
    // Initialize the dropdown with the Choices.js library
    new Choices('#destinationDropdown', {
      searchEnabled: true,
      itemSelectText: '',
    });
  });
  
  // Function to route to the selected destination
  function routeToDestination() {
    const destination = document.getElementById('destinationDropdown').value;
    if (window.goTo && destination) {
      window.goTo(destination);
    } else {
      console.warn("goTo function not available or destination empty.");
    }
  }
  