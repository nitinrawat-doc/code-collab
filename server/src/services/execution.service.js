/**
 * services/execution.service.js
 * Adapter for sandboxed code execution.
 * Supports both Judge0 API (when configured) and fallback local execution.
 * Uses non-blocking async compilation to prevent spawnSync ETIMEDOUT errors on Windows/Linux.
 */
const axios = require('axios');
const { spawn, exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { JUDGE0_API_URL, JUDGE0_API_KEY: RAW_KEY, JUDGE0_API_HOST } = require('../config/env');

const execAsync = util.promisify(exec);

// Treat placeholder value as unconfigured
const JUDGE0_API_KEY = RAW_KEY && RAW_KEY !== 'your_rapidapi_key_here' ? RAW_KEY : null;

// Judge0 language IDs
const LANGUAGE_IDS = {
  javascript: 63, // Node.js 12.14.0
  python: 71,     // Python 3.8.1
  cpp: 54,        // C++ (GCC 9.2.0)
  java: 62,       // Java (OpenJDK 13.0.1)
};

const STATUS_MAP = {
  1: 'In Queue',
  2: 'Processing',
  3: 'Accepted',
  4: 'Wrong Answer',
  5: 'Time Limit Exceeded',
  6: 'Compilation Error',
  7: 'Runtime Error (SIGSEGV)',
  8: 'Runtime Error (SIGXFSZ)',
  9: 'Runtime Error (SIGFPE)',
  10: 'Runtime Error (SIGABRT)',
  11: 'Runtime Error (NZEC)',
  12: 'Runtime Error (Other)',
  13: 'Internal Error',
  14: 'Exec Format Error',
};

const toBase64 = (str) => Buffer.from(str || '').toString('base64');
const fromBase64 = (str) => (str ? Buffer.from(str, 'base64').toString('utf-8') : '');

/**
 * Local fallback runner when Judge0 is unconfigured.
 * Uses non-blocking async exec and spawn to prevent ETIMEDOUT errors.
 */
const runLocalSingle = async ({ code, language, stdin = '', expectedOutput = '' }) => {
  return new Promise(async (resolve) => {
    const tmpDir = os.tmpdir();
    const fileId = Date.now() + '_' + Math.floor(Math.random() * 10000);
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let killed = false;

    let child;
    let cleanupFile = null;
    let cleanupExec = null;

    try {
      if (language === 'javascript') {
        // Polyfill /dev/stdin for cross-platform Node.js readFileSync
        const safeCode = code
          .replace(/readFileSync\(\s*['"]\/dev\/stdin['"]\s*,/g, 'readFileSync(0,')
          .replace(/readFileSync\(\s*['"]\/dev\/stdin['"]\s*\)/g, 'readFileSync(0)');

        child = spawn(process.execPath, ['-e', safeCode], { timeout: 5000 });
      } else if (language === 'python') {
        const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
        child = spawn(pyCmd, ['-c', code], { timeout: 5000 });
      } else if (language === 'cpp') {
        const cppFile = path.join(tmpDir, `temp_${fileId}.cpp`);
        const exeFile = path.join(tmpDir, `temp_${fileId}.exe`);
        fs.writeFileSync(cppFile, code);
        cleanupFile = cppFile;
        cleanupExec = exeFile;

        // Non-blocking async compile
        await execAsync(`g++ "${cppFile}" -o "${exeFile}"`, { timeout: 10000 });
        child = spawn(exeFile, [], { timeout: 5000 });
      } else if (language === 'java') {
        const match = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
        const className = match ? match[1] : 'Solution';
        const javaFile = path.join(tmpDir, `${className}.java`);
        fs.writeFileSync(javaFile, code);
        cleanupFile = javaFile;

        // Non-blocking async compile
        await execAsync(`javac "${javaFile}"`, { timeout: 10000 });
        child = spawn('java', ['-cp', tmpDir, className], { timeout: 5000 });
      } else {
        return resolve({
          status: 'Unsupported Language',
          statusId: 6,
          stdout: `Language '${language}' is not supported locally.`,
          stderr: '',
          compileOutput: '',
          time: '0.00',
          memory: null,
          passed: false,
        });
      }
    } catch (compileErr) {
      if (cleanupFile && fs.existsSync(cleanupFile)) try { fs.unlinkSync(cleanupFile); } catch {}
      if (cleanupExec && fs.existsSync(cleanupExec)) try { fs.unlinkSync(cleanupExec); } catch {}
      
      const errMsg = compileErr.stderr ? compileErr.stderr.toString() : (compileErr.message || 'Compilation Error');
      return resolve({
        status: 'Compilation Error',
        statusId: 6,
        stdout: '',
        stderr: errMsg,
        compileOutput: errMsg,
        time: '0.00',
        memory: null,
        passed: false,
      });
    }

    const timer = setTimeout(() => {
      killed = true;
      if (child) child.kill('SIGKILL');
    }, 5000);

    if (stdin && child.stdin) {
      try { child.stdin.write(stdin); } catch (e) {}
      child.stdin.end();
    }

    child.stdout.on('data', (data) => {
      if (stdout.length < 100000) stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      if (stderr.length < 100000) stderr += data.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (cleanupFile && fs.existsSync(cleanupFile)) try { fs.unlinkSync(cleanupFile); } catch {}
      if (cleanupExec && fs.existsSync(cleanupExec)) try { fs.unlinkSync(cleanupExec); } catch {}
      resolve({
        status: 'Runtime Error',
        statusId: 11,
        stdout: stdout.trim(),
        stderr: err.message || stderr.trim(),
        compileOutput: '',
        time: ((Date.now() - startTime) / 1000).toFixed(2),
        memory: null,
        passed: false,
      });
    });

    child.on('close', (codeExit) => {
      clearTimeout(timer);
      if (cleanupFile && fs.existsSync(cleanupFile)) try { fs.unlinkSync(cleanupFile); } catch {}
      if (cleanupExec && fs.existsSync(cleanupExec)) try { fs.unlinkSync(cleanupExec); } catch {}

      const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

      if (killed) {
        return resolve({
          status: 'Time Limit Exceeded',
          statusId: 5,
          stdout: stdout.trim(),
          stderr: 'Time Limit Exceeded (5.00s)',
          compileOutput: '',
          time: '5.00',
          memory: null,
          passed: false,
        });
      }

      const trimmedStdout = stdout.trim();
      const trimmedExpected = expectedOutput.trim();

      let passed = false;
      if (trimmedExpected) {
        passed = (trimmedStdout === trimmedExpected) ||
                 (trimmedStdout.replace(/\s+/g, '') === trimmedExpected.replace(/\s+/g, ''));
      } else {
        passed = codeExit === 0;
      }

      let status = 'Accepted';
      if (codeExit !== 0) {
        status = 'Runtime Error';
      } else if (trimmedExpected && !passed) {
        status = 'Wrong Answer';
      }

      resolve({
        status,
        statusId: codeExit === 0 ? (passed ? 3 : 4) : 11,
        stdout: trimmedStdout,
        stderr: stderr.trim(),
        compileOutput: '',
        time: executionTime,
        memory: null,
        passed,
      });
    });
  });
};

/**
 * Submits code to Judge0 or local runner.
 */
const runSingle = async ({ code, language, stdin = '', expectedOutput = '' }) => {
  if (!JUDGE0_API_KEY) {
    return runLocalSingle({ code, language, stdin, expectedOutput });
  }

  const languageId = LANGUAGE_IDS[language];
  if (!languageId) throw new Error(`Unsupported language: ${language}`);

  const requestBody = {
    source_code: toBase64(code),
    language_id: languageId,
    stdin: toBase64(stdin),
    expected_output: toBase64(expectedOutput),
    base64_encoded: true,
    wait: true,
  };

  const response = await axios.post(
    `${JUDGE0_API_URL}/submissions?base64_encoded=true&wait=true`,
    requestBody,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': JUDGE0_API_KEY,
        'X-RapidAPI-Host': JUDGE0_API_HOST,
      },
      timeout: 15000,
    }
  );

  const result = response.data;
  const statusId = result.status?.id;
  const statusDesc = STATUS_MAP[statusId] || result.status?.description || 'Unknown';

  return {
    status: statusDesc,
    statusId,
    stdout: fromBase64(result.stdout),
    stderr: fromBase64(result.stderr),
    compileOutput: fromBase64(result.compile_output),
    time: result.time,
    memory: result.memory,
    passed: statusId === 3,
  };
};

/**
 * Runs code against multiple test cases.
 */
const runAgainstTestCases = async ({ code, language, testCases }) => {
  const results = await Promise.all(
    testCases.map(async (tc, idx) => {
      try {
        const result = await runSingle({
          code,
          language,
          stdin: tc.input,
          expectedOutput: tc.expectedOutput,
        });
        return {
          testCase: idx + 1,
          input: tc.isHidden ? '[hidden]' : tc.input,
          expectedOutput: tc.isHidden ? '[hidden]' : tc.expectedOutput,
          ...result,
        };
      } catch (err) {
        return {
          testCase: idx + 1,
          status: 'Execution Error',
          statusId: -1,
          passed: false,
          error: err.message,
        };
      }
    })
  );

  const allPassed = results.every((r) => r.passed);
  const overallStatus = allPassed
    ? 'Accepted'
    : results.find((r) => !r.passed)?.status || 'Wrong Answer';

  return { results, allPassed, overallStatus };
};

module.exports = { runSingle, runAgainstTestCases };
