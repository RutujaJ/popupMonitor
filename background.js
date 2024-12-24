let previousRtt = null;
let previousUsage = null;
let previousCpuUsage = null;

function getCpuLoad() {
  return new Promise((resolve, reject) => {
    chrome.system.cpu.getInfo((cpuInfo) => {
      if (cpuInfo) {
        if (!previousUsage) {
          // Initialize previous usage if it's the first run
          previousUsage = cpuInfo.processors.map(processor => ({
            idle: processor.usage.idle,
            total: processor.usage.total
          }));
          resolve(0); // Initial run, no usage to calculate
        } else {
          let totalCpuUsage = 0;

          cpuInfo.processors.forEach((processor, index) => {
            const prev = previousUsage[index];
            const currentIdle = processor.usage.idle;
            const currentTotal = processor.usage.total;

            const idleDelta = currentIdle - prev.idle;
            const totalDelta = currentTotal - prev.total;

            // Update the previous usage
            previousUsage[index] = { idle: currentIdle, total: currentTotal };

            // Calculate usage for this processor
            if (totalDelta > 0) {
              const usage = ((totalDelta - idleDelta) / totalDelta) * 100;
              totalCpuUsage += usage;
            }
          });

          // Average CPU usage across all processors
          const avgCpuUsage = totalCpuUsage / cpuInfo.numOfProcessors;
          console.log(`Total CPU Load: ${avgCpuUsage.toFixed(2)}%`);
          resolve(avgCpuUsage.toFixed(2));
        }
      } else {
        reject("Failed to retrieve CPU info");
      }
    });
  });
}

  
// Function to get RTT(round-trip time) of the network using the navigator.connection API
function getRtt() {
    if ('connection' in navigator) {
        const rtt = navigator.connection.rtt; // RTT in milliseconds
        // Update UI with RTT value
        console.log(`RJ RTT ${rtt}`);
        return rtt;
    } else {
        console.log('Network RTT not supported.');
        // document.getElementById('rtt-text').innerText = `RTT: N/A`;
    }
}

//////////// Send data to the content script
function updateDataSnapshot(cpuUsage, rtt) {
    console.log(`RJ update data received ${cpuUsage} ${rtt}`);
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'updateData',
            cpuUsage: cpuUsage,
            rtt: rtt
          }, function (response) {
            if (chrome.runtime.lastError) {
              console.warn('RJ Content script not running in active tab:', chrome.runtime.lastError.message);
            }
          });
       }
     });
}

//////////// report CPU usage and RTT to telemetry sheet 
function reportTelemetry(jsonData) {
  
  console.log(`RJ calling reportTelemetry ${jsonData.cpuUsage} ${jsonData.rttNow}`);

  const url = 'https://script.google.com/macros/s/AKfycbx2j_vkqn1p6oygLtCx7Fu2TAJV2bK4DBshxi3v_1T73UNOOf2uO2p3ZLy1QUR_cIJxvg/exec';

  // Send the POST request to the Apps Script Web App
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jsonData),  // Convert your JSON data into a string
  })
  .then(response => response.text())
  .then(data => {
    console.log('Success:', data);  // Log the response from Google Apps Script
  })
  .catch((error) => {
    console.error('Error:', error);
  });
}

async function monitorSystem() {
  try {
    const rttNow = getRtt();
    const cpuUsageNow = await getCpuLoad(); // Wait for CPU usage value
    console.log(`RJ monitorSystem cpuUsageNow: ${cpuUsageNow}, rttNow: ${rttNow}`);
    updateDataSnapshot(cpuUsageNow, rttNow);
    if (cpuUsageNow !== previousCpuUsage || rttNow !== previousRtt) {
      // Update previous values
      previousCpuUsage = cpuUsageNow;
      previousRtt = rttNow;
      console.log(`RJ telemetry cpuUsageNow: ${cpuUsageNow}, rttNow: ${rttNow}`);

      const jsonData = {
        cpuUsageNow: cpuUsageNow,
        rttNow: rttNow
      };
      reportTelemetry(jsonData);
    }
  } catch (error) {
    console.error("Error in monitorSystem:", error);
  }
}

// Set an interval to monitor every 5 seconds
setInterval(monitorSystem, 5000); // 5000ms = 5 seconds

////////// extension onClick and tab onUpdate event

let isVisible = true; // Keep track of the visibility state

chrome.action.onClicked.addListener((tab) => {
  // Toggle visibility state
  isVisible = !isVisible;
  if (isVisible) {
    // Indicate the extension is active
    chrome.action.setBadgeText({ text: "ON" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
  // Send a message to the content script to toggle the div
  chrome.tabs.sendMessage(tab.id, { toggleVisibility: isVisible });
  chrome.storage.local.set({ floatingBarVisible: isVisible });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url) {
    // Indicate the extension is active
    chrome.action.setBadgeText({ text: "ON" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
});
