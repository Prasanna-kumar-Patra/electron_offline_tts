document.addEventListener('DOMContentLoaded', async () => {
  const promptList = document.getElementById('prompt-list');
  const chatStream = document.getElementById('chat-stream');
  const audioIndicator = document.getElementById('audio-indicator');
  const modeToggle = document.getElementById('mode-toggle');
  const modeLabel = document.getElementById('mode-label');

  let currentText = '';

  // Load samples
  const samples = await window.electronAPI.getSamples();
  samples.forEach(sample => {
    const btn = document.createElement('button');
    btn.className = 'sample-btn';
    btn.textContent = sample.prompt;
    btn.onclick = () => {
      // Clear stream and start
      currentText = `User: ${sample.prompt}\n\nAssistant: `;
      chatStream.textContent = currentText;
      window.electronAPI.startGeneration(sample.id);
    };
    promptList.appendChild(btn);
  });

  // Handle mode toggle
  modeToggle.addEventListener('change', async (e) => {
    const isLocal = e.target.checked;
    const actualMode = await window.electronAPI.toggleMode(isLocal);
    
    // If it failed to enable local mode (e.g., model missing), revert switch
    if (isLocal && !actualMode) {
      modeToggle.checked = false;
      alert("Failed to load local model. Please wait for the download to finish or check logs.");
    }
    
    modeLabel.textContent = actualMode ? 'Local AI Model Mode' : 'Preloaded Demo Mode';
    if (actualMode) {
        modeLabel.classList.add('text-primary');
    } else {
        modeLabel.classList.remove('text-primary');
    }
  });

  // Handle incoming tokens
  window.electronAPI.onLlmToken((token) => {
    currentText += token;
    chatStream.textContent = currentText;
    // Auto scroll to bottom
    chatStream.scrollTop = chatStream.scrollHeight;
  });

  // Handle TTS status
  window.electronAPI.onTtsStatus((data) => {
    if (data.status === 'speaking') {
      audioIndicator.classList.add('active');
      audioIndicator.innerHTML = `
        <div class="waves">
          <div class="wave"></div>
          <div class="wave"></div>
          <div class="wave"></div>
        </div>
        <span>Speaking: "${data.text}"</span>
      `;
    } else {
      audioIndicator.classList.remove('active');
      audioIndicator.innerHTML = `<span>Audio Engine Idle</span>`;
    }
  });

  window.electronAPI.onModeChanged((isLocal) => {
    modeToggle.checked = isLocal;
    modeLabel.textContent = isLocal ? 'Local AI Model Mode' : 'Preloaded Demo Mode';
    if (isLocal) {
        modeLabel.classList.add('text-primary');
    } else {
        modeLabel.classList.remove('text-primary');
    }
  });
});
