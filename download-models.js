const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, 'models');

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR);
}

const url = 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf?download=true';
const dest = path.join(MODELS_DIR, 'model.gguf');

console.log('Downloading Qwen 0.5B Instruct model (approx 398MB)...');
console.log('This may take a minute or two...');

const file = fs.createWriteStream(dest);

let downloadedBytes = 0;
let totalBytes = 0;

https.get(url, (response) => {
  if (response.statusCode === 302 || response.statusCode === 301) {
    // Handle redirect
    https.get(response.headers.location, (res) => {
      totalBytes = parseInt(res.headers['content-length'], 10);
      
      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const percent = ((downloadedBytes / totalBytes) * 100).toFixed(2);
        process.stdout.write(`\rDownloading... ${percent}% (${(downloadedBytes/1024/1024).toFixed(1)} MB / ${(totalBytes/1024/1024).toFixed(1)} MB)`);
      });

      res.pipe(file);
      file.on('finish', () => {
        console.log('\nDownload complete! Model saved to models/model.gguf');
        file.close();
      });
    });
  } else {
    totalBytes = parseInt(response.headers['content-length'], 10);
    
    response.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      const percent = ((downloadedBytes / totalBytes) * 100).toFixed(2);
      process.stdout.write(`\rDownloading... ${percent}% (${(downloadedBytes/1024/1024).toFixed(1)} MB / ${(totalBytes/1024/1024).toFixed(1)} MB)`);
    });

    response.pipe(file);
    file.on('finish', () => {
      console.log('\nDownload complete! Model saved to models/model.gguf');
      file.close();
    });
  }
}).on('error', (err) => {
  fs.unlink(dest, () => {});
  console.error('Error downloading:', err.message);
});
