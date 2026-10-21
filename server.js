/**
 * server.js
 * AI Lecture Studio Local Server (Node.js built-in, zero external dependencies required)
 * Phục vụ Web Dashboard và cung cấp REST API điều khiển toàn bộ pipeline:
 * - Upload PPTX -> Trích xuất hình ảnh & nội dung -> Phân loại vào 6 Template Academic Pro
 * - Tái tạo âm thanh VieNeu-TTS theo từng slide (Granular Regeneration)
 * - Tự động đồng bộ timeline và render HyperFrames Video MP4
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import { syncHyperframesTimeline } from './scripts/build_hyperframes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4'
};

// Helper: send JSON response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// Helper: read request body
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Render status tracker
let currentRenderJob = {
  status: 'idle', // idle, rendering, completed, error
  progress: 0,
  message: '',
  outputFile: null,
  startedAt: null
};

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = reqUrl.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // Redirect any legacy /studio, /studio/index.html or /studio.html to root /
  if (pathname === '/studio' || pathname === '/studio/' || pathname === '/studio/index.html' || pathname === '/studio.html') {
    res.writeHead(302, { 'Location': '/' });
    res.end();
    return;
  }

  // Serve index.html directly at root /
  if (pathname === '/' || pathname === '/index.html') {
    const indexPath = path.join(__dirname, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    fs.createReadStream(indexPath).pipe(res);
    return;
  }

  // Alias for /reducer.js if requested from root
  if (pathname === '/reducer.js') {
    const reducerPath = path.join(__dirname, 'studio', 'reducer.js');
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    fs.createReadStream(reducerPath).pipe(res);
    return;
  }

  // Reverse proxy for Python FastAPI Backend (:8000)
  if (pathname.startsWith('/projects') || pathname.startsWith('/exports') || pathname.startsWith('/storage')) {
    const proxyReq = http.request(`http://localhost:8000${reqUrl.pathname}${reqUrl.search}`, {
      method: req.method,
      headers: { ...req.headers, host: 'localhost:8000' }
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (err) => {
      // If backend is unreachable and requesting /storage, serve directly from local storage directory
      if (pathname.startsWith('/storage/')) {
        const localRel = pathname.replace(/^\//, '');
        const localPath = path.join(__dirname, localRel);
        if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
          const ext = path.extname(localPath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';
          res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400'
          });
          fs.createReadStream(localPath).pipe(res);
          return;
        }
      }
      sendJson(res, 502, { error: 'Không thể kết nối FastAPI backend (:8000). Đảm bảo uvicorn đang chạy: ' + err.message });
    });
    req.pipe(proxyReq);
    return;
  }

  // ----------------------------------------------------------------
  // 1. REST API ENDPOINTS
  // ----------------------------------------------------------------

  // GET /api/lecture - Đọc dữ liệu bài giảng hiện tại
  if (req.method === 'GET' && pathname === '/api/lecture') {
    try {
      const data = fs.readFileSync(path.join(__dirname, 'lecture.json'), 'utf-8');
      sendJson(res, 200, JSON.parse(data));
    } catch (e) {
      sendJson(res, 500, { error: 'Không thể đọc lecture.json: ' + e.message });
    }
    return;
  }

  // POST /api/lecture - Lưu cập nhật bài giảng
  if (req.method === 'POST' && pathname === '/api/lecture') {
    try {
      const body = await readRequestBody(req);
      const lectureData = JSON.parse(body.toString('utf-8'));
      fs.writeFileSync(path.join(__dirname, 'lecture.json'), JSON.stringify(lectureData, null, 2), 'utf-8');
      syncHyperframesTimeline();
      sendJson(res, 200, { success: true, message: 'Đã lưu lecture.json và đồng bộ timeline thành công' });
    } catch (e) {
      sendJson(res, 500, { error: 'Lỗi lưu bài giảng: ' + e.message });
    }
    return;
  }

  // POST /api/upload-pptx - Tải lên file PPTX và tự động trích xuất
  if (req.method === 'POST' && pathname === '/api/upload-pptx') {
    try {
      const buffer = await readRequestBody(req);
      const uploadDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const pptxPath = path.join(uploadDir, 'uploaded_lecture.pptx');
      
      // If multipart/form-data, extract the binary body between boundaries
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('multipart/form-data')) {
        const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
        if (boundaryMatch) {
          const boundary = boundaryMatch[1] || boundaryMatch[2];
          const raw = buffer;
          const boundaryBuffer = Buffer.from('--' + boundary);
          
          let startIndex = raw.indexOf(Buffer.from('\r\n\r\n'));
          if (startIndex !== -1) {
            startIndex += 4; // skip \r\n\r\n
            const endIndex = raw.lastIndexOf(boundaryBuffer) - 2; // skip \r\n before next boundary
            if (endIndex > startIndex) {
              const fileData = raw.subarray(startIndex, endIndex);
              fs.writeFileSync(pptxPath, fileData);
            } else {
              fs.writeFileSync(pptxPath, raw);
            }
          } else {
            fs.writeFileSync(pptxPath, raw);
          }
        } else {
          fs.writeFileSync(pptxPath, buffer);
        }
      } else {
        // Raw binary stream
        fs.writeFileSync(pptxPath, buffer);
      }

      console.log(`[UPLOAD] Đã nhận file PPTX, đang chạy trích xuất...`);
      exec(`python scripts/pptx_to_lecture.py "${pptxPath}"`, { cwd: __dirname }, (err, stdout, stderr) => {
        if (err) {
          console.error('[PPTX ERROR]', stderr);
          sendJson(res, 500, { error: 'Lỗi trích xuất PPTX: ' + stderr });
          return;
        }

        console.log('[PPTX EXTRACT]', stdout);
        try {
          syncHyperframesTimeline();
          const result = fs.readFileSync(path.join(__dirname, 'lecture.json'), 'utf-8');
          sendJson(res, 200, {
            success: true,
            message: 'Trích xuất bài giảng thành công!',
            data: JSON.parse(result)
          });
        } catch (readErr) {
          sendJson(res, 500, { error: 'Không thể đọc kết quả lecture.json' });
        }
      });
    } catch (e) {
      sendJson(res, 500, { error: 'Lỗi upload PPTX: ' + e.message });
    }
    return;
  }

  // GET /api/images - Danh sách ảnh có sẵn trong thư mục images/
  if (req.method === 'GET' && pathname === '/api/images') {
    try {
      const imgDir = path.join(__dirname, 'images');
      if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
      const files = fs.readdirSync(imgDir).filter(f => /\.(png|jpg|jpeg|svg|webp)$/i.test(f));
      const imageList = files.map(f => `images/${f}`);
      sendJson(res, 200, { images: imageList });
    } catch (e) {
      sendJson(res, 500, { error: e.message });
    }
    return;
  }

  // POST /api/upload-image - Tải ảnh mới lên từ máy tính
  if (req.method === 'POST' && pathname === '/api/upload-image') {
    try {
      const buffer = await readRequestBody(req);
      const imgDir = path.join(__dirname, 'images');
      if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
      
      const filename = `custom_${Date.now()}.png`;
      const filePath = path.join(imgDir, filename);
      fs.writeFileSync(filePath, buffer);
      
      sendJson(res, 200, {
        success: true,
        imagePath: `images/${filename}`
      });
    } catch (e) {
      sendJson(res, 500, { error: 'Lỗi tải ảnh lên: ' + e.message });
    }
    return;
  }

  // POST /api/synthesize-slide - Tái sinh âm thanh VieNeu-TTS cho một slide cụ thể
  if (req.method === 'POST' && pathname === '/api/synthesize-slide') {
    try {
      const body = await readRequestBody(req);
      const { slideId, text, voice } = JSON.parse(body.toString('utf-8'));

      if (!slideId || !text) {
        sendJson(res, 400, { error: 'Thiếu slideId hoặc text' });
        return;
      }

      console.log(`[TTS] Đang sinh âm thanh cho ${slideId}...`);
      // Escape text for shell
      const safeText = text.replace(/"/g, '\\"');
      const safeVoice = (voice || 'Mỹ Duyên').replace(/"/g, '\\"');
      const cmd = `python scripts/synthesize_slide.py --slide-id "${slideId}" --text "${safeText}" --voice "${safeVoice}"`;

      exec(cmd, { cwd: __dirname }, (err, stdout, stderr) => {
        if (err) {
          console.error('[TTS ERROR]', stderr);
          sendJson(res, 500, { error: 'Lỗi sinh âm thanh: ' + (stderr || err.message) });
          return;
        }

        try {
          syncHyperframesTimeline();
          // Parse stdout JSON output from synthesize_slide.py
          const lines = stdout.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const data = JSON.parse(lastLine);
          sendJson(res, 200, data);
        } catch (jsonErr) {
          sendJson(res, 200, { success: true, message: stdout });
        }
      });
    } catch (e) {
      sendJson(res, 500, { error: 'Lỗi xử lý yêu cầu TTS: ' + e.message });
    }
    return;
  }

  // GET /api/preview-status - Trạng thái HyperFrames Studio Preview
  if (req.method === 'GET' && pathname === '/api/preview-status') {
    exec('npx hyperframes preview --status', { cwd: __dirname }, (err, stdout) => {
      const isRunning = stdout && stdout.includes('http://localhost:3002');
      sendJson(res, 200, {
        running: isRunning,
        url: 'http://localhost:3002/#project/my-presentation',
        output: stdout.trim()
      });
    });
    return;
  }

  // POST /api/preview-toggle - Bật hoặc tắt HyperFrames Studio Preview
  if (req.method === 'POST' && pathname === '/api/preview-toggle') {
    try {
      const body = await readRequestBody(req);
      const { action } = JSON.parse(body.toString('utf-8') || '{}');
      const cmd = action === 'stop' ? 'npx hyperframes preview --stop' : 'npx hyperframes preview --background';
      exec(cmd, { cwd: __dirname }, (err, stdout, stderr) => {
        sendJson(res, 200, { success: !err, message: stdout.trim() });
      });
    } catch (e) {
      sendJson(res, 500, { error: e.message });
    }
    return;
  }

  // POST /api/render-video - Bắt đầu render video MP4
  if (req.method === 'POST' && pathname === '/api/render-video') {
    if (currentRenderJob.status === 'rendering') {
      sendJson(res, 400, { error: 'Đang có một tiến trình render video đang chạy, vui lòng chờ...' });
      return;
    }

    currentRenderJob = {
      status: 'rendering',
      progress: 5,
      message: 'Khởi động bộ render HyperFrames...',
      outputFile: null,
      startedAt: Date.now()
    };

    const renderProc = spawn('npx', ['--yes', 'hyperframes@0.8.156', 'render'], {
      cwd: __dirname,
      shell: true
    });

    renderProc.stdout.on('data', data => {
      const str = data.toString('utf-8');
      console.log('[RENDER]', str);

      // Match progress if available
      const pctMatch = str.match(/(\d+)%/);
      if (pctMatch) {
        currentRenderJob.progress = parseInt(pctMatch[1], 10);
      }

      // Check for completion message
      if (str.includes('.mp4')) {
        const fileMatch = str.match(/([^\s]+\.mp4)/);
        if (fileMatch) currentRenderJob.outputFile = fileMatch[1];
      }

      currentRenderJob.message = str.trim().split('\n').pop() || currentRenderJob.message;
    });

    renderProc.stderr.on('data', data => {
      console.error('[RENDER ERR]', data.toString('utf-8'));
    });

    renderProc.on('close', code => {
      if (code === 0) {
        currentRenderJob.status = 'completed';
        currentRenderJob.progress = 100;
        currentRenderJob.message = 'Render video hoàn tất thành công!';
      } else {
        currentRenderJob.status = 'error';
        currentRenderJob.message = `Quá trình render thất bại với mã lỗi ${code}`;
      }
    });

    sendJson(res, 200, { success: true, message: 'Đã bắt đầu render video' });
    return;
  }

  // GET /api/render-status - Lấy trạng thái tiến trình render
  if (req.method === 'GET' && pathname === '/api/render-status') {
    sendJson(res, 200, currentRenderJob);
    return;
  }

  // ----------------------------------------------------------------
  // 2. STATIC FILES SERVING
  // ----------------------------------------------------------------
  let cleanPath = pathname;
  if (cleanPath.startsWith('/studio/storage/')) {
    cleanPath = cleanPath.replace('/studio/storage/', '/storage/');
  }

  let filePath;
  if (cleanPath === '/studio' || cleanPath === '/studio/' || cleanPath === '/studio/index.html') {
    res.writeHead(302, { 'Location': '/' });
    res.end();
    return;
  }
  if (cleanPath === '/' || cleanPath === '/index.html') {
    filePath = 'index.html';
  } else {
    filePath = cleanPath.replace(/^\//, '');
  }

  let absolutePath = path.join(__dirname, filePath);

  // Fallback: If not found at root, check inside studio/ directory (e.g., reducer.js -> studio/reducer.js)
  if (!fs.existsSync(absolutePath) && fs.existsSync(path.join(__dirname, 'studio', filePath))) {
    absolutePath = path.join(__dirname, 'studio', filePath);
  }

  if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
    const ext = path.extname(absolutePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(absolutePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Không tìm thấy tệp');
  }
});

function startServer(port) {
  server.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🎓 HyperFrames Lecture Studio Server đang chạy tại:`);
    console.log(`👉 http://localhost:${port}`);
    console.log(`======================================================\n`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const nextPort = Number(PORT) + 1;
    console.warn(`[WARN] Cổng ${PORT} đang được sử dụng. Tự động chuyển sang cổng ${nextPort}...`);
    startServer(nextPort);
  } else {
    console.error('[SERVER ERROR]', err);
  }
});

startServer(PORT);
