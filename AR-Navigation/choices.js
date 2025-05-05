window.addEventListener('DOMContentLoaded', () => {
    const dropdown = document.getElementById('destinationDropdown');

    if (window.extractedNodes && Array.isArray(window.extractedNodes)) {
      window.extractedNodes.forEach(node => {
        const option = document.createElement('option');
        option.value = node;
        option.text = node;
        dropdown.appendChild(option);
      });
    } else {
      console.warn('extractedNodes not found or is not an array');
    }

    new Choices('#destinationDropdown', {
      searchEnabled: true,
      itemSelectText: '',
    });
  });