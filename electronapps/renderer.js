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

  // Canvas Drawing Logic
  const canvas = document.getElementById('ink-canvas');
  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  
  // Set white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  function startDraw(e) {
    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  }
  
  function draw(e) {
    if (!isDrawing) return;
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  
  function stopDraw() {
    isDrawing = false;
  }
  
  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseout', stopDraw);

  const btnClear = document.getElementById('btn-clear');
  const btnText = document.getElementById('btn-recognize-text');
  const btnMath = document.getElementById('btn-recognize-math');
  const overlayBubble = document.getElementById('overlay-bubble');

  btnClear.addEventListener('click', () => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    overlayBubble.classList.add('hidden');
  });

  async function handleRecognize(type) {
    const base64Image = canvas.toDataURL('image/png');
    overlayBubble.textContent = "Processing...";
    overlayBubble.classList.remove('hidden');
    
    try {
      const result = await window.electronAPI.recognizeInk(base64Image, type);
      overlayBubble.textContent = result;
      // Also send it to chat to show we can use it
      currentText += `\n\n[OCR ${type.toUpperCase()}]: ${result}\nAssistant: Let me help you with that.\n`;
      chatStream.textContent = currentText;
      chatStream.scrollTop = chatStream.scrollHeight;
    } catch(e) {
      overlayBubble.textContent = "Error: " + e.message;
    }
    
    setTimeout(() => {
        overlayBubble.classList.add('hidden');
    }, 5000);
  }

  btnText.addEventListener('click', () => handleRecognize('text'));
  btnMath.addEventListener('click', () => handleRecognize('math'));
});
