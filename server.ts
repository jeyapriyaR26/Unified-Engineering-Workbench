import express, { Request, Response } from 'express';
import { execFile, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const ENGINE_BIN = path.resolve(__dirname, 'build/workbench_engine');

// Helper to execute C++ engine with command and JSON payload
function executeCppEngine(cmd: string, payload: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(ENGINE_BIN)) {
      return reject(new Error(`C++ Engine binary not found at ${ENGINE_BIN}. Please run cmake build.`));
    }

    const payloadStr = JSON.stringify(payload);
    const child = spawn(ENGINE_BIN, ['--cmd', cmd, '--payload', payloadStr]);

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    child.on('close', (code) => {
      if (stdoutData.trim().length > 0) {
        try {
          const parsed = JSON.parse(stdoutData.trim());
          return resolve(parsed);
        } catch (e: any) {
          // If parse fails, return raw output
          return resolve({ success: code === 0, raw: stdoutData, error: stderrData });
        }
      }
      if (code !== 0) {
        return reject(new Error(`C++ engine exited with code ${code}: ${stderrData}`));
      }
      resolve({ success: true, data: {} });
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

// API Routes
app.get('/api/status', async (_req: Request, res: Response) => {
  try {
    const result = await executeCppEngine('status', {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/thermal/solve', async (req: Request, res: Response) => {
  try {
    const result = await executeCppEngine('thermal_solve', req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/thermal/convergence', async (req: Request, res: Response) => {
  try {
    const result = await executeCppEngine('thermal_convergence', req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/geometry/stl', async (req: Request, res: Response) => {
  try {
    const result = await executeCppEngine('geometry_parse_stl', req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/geometry/csv', async (req: Request, res: Response) => {
  try {
    const result = await executeCppEngine('geometry_parse_csv', req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/geometry/sample-stl', (_req: Request, res: Response) => {
  try {
    const filePath = path.resolve(__dirname, 'data/sample_bracket.stl');
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ success: true, content, filename: 'sample_bracket.stl' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/geometry/sample-csv', (_req: Request, res: Response) => {
  try {
    const filePath = path.resolve(__dirname, 'data/sample_temperature_field.csv');
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ success: true, content, filename: 'sample_temperature_field.csv' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/performance/benchmark', async (req: Request, res: Response) => {
  try {
    const result = await executeCppEngine('performance_benchmark', req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/hardware/devices', async (_req: Request, res: Response) => {
  try {
    const result = await executeCppEngine('hardware_discover', {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/hardware/connect', async (req: Request, res: Response) => {
  try {
    const result = await executeCppEngine('hardware_connect', req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/hardware/disconnect', async (req: Request, res: Response) => {
  try {
    const result = await executeCppEngine('hardware_disconnect', req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/hardware/recover', async (req: Request, res: Response) => {
  try {
    const result = await executeCppEngine('hardware_recover', req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/hardware/telemetry/:id', async (req: Request, res: Response) => {
  try {
    const result = await executeCppEngine('hardware_telemetry', { device_id: req.params.id });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/ml/train', async (req: Request, res: Response) => {
  try {
    const result = await executeCppEngine('ml_train', req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/ml/appendix', async (_req: Request, res: Response) => {
  try {
    const result = await executeCppEngine('ml_appendix', {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Unified Engineering Workbench] Full-stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
