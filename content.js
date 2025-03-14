// content.js

// Function to toggle the floating div
function toggleFloatingDiv(isVisible) {
  let dragItem = document.getElementById("floating-bar");
  if (isVisible) {
    // Reset position to bottom-right
    xOffset = 0;
    yOffset = 0;
    dragItem.style.transform = "translate3d(0, 0, 0)";
    dragItem.style.display = "block";
    dragItem.style.position = "fixed";
    dragItem.style.bottom = "20px";
    dragItem.style.right = "20px";
  } else {
    dragItem.style.display = "none";
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.toggleVisibility !== undefined) {
    toggleFloatingDiv(message.toggleVisibility);
    sendResponse({ status: "success" });
  }
});
// Get the visibility state from storage, save state for new tabs
chrome.storage.local.get("floatingBarVisible", (result) => {
  const isVisible = result.floatingBarVisible !== false; // Default to visible if not set
  toggleFloatingDiv(isVisible);
});

// Create the floating bar if it doesn't exist
let dragItem = document.getElementById("floating-bar");
if (!dragItem) {
  dragItem = document.createElement("div");
  dragItem.id = "floating-bar";
  
  // Position and basic styling
  dragItem.style.position = "fixed";
  dragItem.style.bottom = "20px";
  dragItem.style.right = "20px";
  dragItem.style.padding = "12px";
  dragItem.style.borderRadius = "8px";
  dragItem.style.cursor = "move";
  dragItem.style.fontSize = "16px";
  dragItem.style.zIndex = "99999";

  
  // Material Green color with opacity
  dragItem.style.backgroundColor = "rgba(76, 175, 80, 0.7)"; // Material Green with opacity
  dragItem.style.color = "#ffffff"; // White text color
  dragItem.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)"; // Subtle shadow for a floating effect
  
  // Infotip on hover
  dragItem.title = "Lower the values, better the experience";
  
  dragItem.innerHTML = "Network & CPU Monitor";

  // Hover effect for better user interaction
  dragItem.addEventListener("mouseover", () => {
    dragItem.style.backgroundColor = "rgba(56, 142, 60, 0.9)"; // Darker green on hover
  });
  
  dragItem.addEventListener("mouseout", () => {
    dragItem.style.backgroundColor = "rgba(76, 175, 80, 0.9)"; // Restore original color
  });

  // Add the floating bar to the body
  document.body.appendChild(dragItem);
}

// Drag functionality
let active = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

dragItem.addEventListener("mousedown", dragStart, false);
dragItem.addEventListener("mouseup", dragEnd, false);
dragItem.addEventListener("mousemove", drag, false);

function dragStart(e) {
  if (e.type === "mousedown") {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    active = true;
  }
}

function dragEnd(e) {
  initialX = currentX;
  initialY = currentY;
  active = false;
}

function drag(e) {
  if (active) {
    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;
    xOffset = currentX;
    yOffset = currentY;
    setTranslate(currentX, currentY);
  }
}

function setTranslate(xPos, yPos) {
  dragItem.style.transform = "translate3d(" + xPos + "px, " + yPos + "px, 0)";
}

// Function to update the floating bar with CPU and RTT data
function updateBar(cpuUsage, rtt) {
  dragItem.innerHTML = `
      📶 Network latency: ${rtt} ms<br/>
      📈 CPU usage: ${cpuUsage}%<br/>
  `;
}

// Listen for updates from the background script or storage
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === 'updateData') {
    updateBar(message.cpuUsage, message.rtt);
  }
});
