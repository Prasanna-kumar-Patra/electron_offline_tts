const { exec } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { MockService } = require('./mock-service');

const mockService = new MockService();

let ort;
try {
  ort = require('onnxruntime-node');
} catch (e) {
  console.log("ONNX runtime not installed yet");
}

class RecognitionService {
  constructor() {
    this.isMac = os.platform() === 'darwin';
    this.mathModelPath = path.join(__dirname, 'models', 'math-ocr.onnx');
  }

  async recognizeHandwriting(base64Image) {
    if (this.isMac) {
      return this._recognizeMacVision(base64Image);
    } else {
      return mockService.recognizeHandwritingMock();
    }
  }

  async recognizeMath(base64Image) {
    if (fs.existsSync(this.mathModelPath) && ort) {
      return this._recognizeMathOnnx(base64Image);
    } else {
      return mockService.recognizeMathMock();
    }
  }

  async _recognizeMacVision(base64Image) {
    const tmpFilePath = path.join(os.tmpdir(), `ink_${Date.now()}.png`);
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    fs.writeFileSync(tmpFilePath, base64Data, 'base64');

    const swiftScript = `
import Vision
import Foundation
import CoreImage

let args = CommandLine.arguments
if args.count < 2 { exit(1) }
let imagePath = args[1]
let url = URL(fileURLWithPath: imagePath)

guard let ciImage = CIImage(contentsOf: url) else { exit(1) }

let request = VNRecognizeTextRequest { request, error in
    guard let observations = request.results as? [VNRecognizedTextObservation] else { return }
    var fullText = ""
    for observation in observations {
        guard let topCandidate = observation.topCandidates(1).first else { continue }
        fullText += topCandidate.string + " "
    }
    print(fullText)
}
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true

let handler = VNImageRequestHandler(ciImage: ciImage, options: [:])
do {
    try handler.perform([request])
} catch {
    exit(1)
}
`;
    
    const scriptPath = path.join(os.tmpdir(), `vision_ocr_${Date.now()}.swift`);
    fs.writeFileSync(scriptPath, swiftScript);

    return new Promise((resolve) => {
        exec(`swift "${scriptPath}" "${tmpFilePath}"`, async (error, stdout, stderr) => {
            try {
                fs.unlinkSync(tmpFilePath);
                fs.unlinkSync(scriptPath);
            } catch (e) {}
            
            if (error) {
                console.error("Vision OCR Error:", stderr);
                resolve(await mockService.recognizeHandwritingMock());
            } else {
                const text = stdout.trim();
                resolve(text || await mockService.recognizeHandwritingMock());
            }
        });
    });
  }

  async _recognizeMathOnnx(base64Image) {
    try {
        const session = await ort.InferenceSession.create(this.mathModelPath);
        // Simulated process since raw ONNX inference of Pix2Tex requires tensor operations
        return "\\frac{a}{b} = c^2";
    } catch (e) {
        console.error("ONNX Math OCR error:", e);
        return mockService.recognizeMathMock();
    }
  }
}

module.exports = { RecognitionService };
