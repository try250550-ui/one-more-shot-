const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = 8000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // 1. API Endpoint Proxy
  if (pathname === '/api/jobs') {
    const query = parsedUrl.searchParams.get('query') || 'Embedded Systems';
    const location = parsedUrl.searchParams.get('location') || 'Bengaluru';
    
    // Check environment variable or a local .env / key file
    let apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey && fs.existsSync(path.join(__dirname, '.env'))) {
      const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
      const match = envContent.match(/RAPIDAPI_KEY\s*=\s*(.*)/);
      if (match) apiKey = match[1].trim().replace(/['"]/g, '');
    }

    if (!apiKey) {
      console.log("No RAPIDAPI_KEY environment variable or .env file found. Returning simulated search payload.");
      // Simulated Fallback Data
      const mockData = {
        data: [
          {
            job_title: "Graduate Engineer Trainee (GET) - Electronics",
            employer_name: "HCLTech",
            job_city: "Bengaluru",
            job_state: "Karnataka",
            job_country: "IN",
            job_description: "Hiring engineering graduates for our embedded systems division. Requirements:\n- Basic understanding of C, Embedded C, and microcontroller architectures.\n- Experience with communication protocols (CAN, I2C, SPI) is a plus.\n- Strong analytical and debugging skills.",
            job_employment_type: "Full-time",
            job_apply_link: "https://www.hcltech.com/careers"
          },
          {
            job_title: "Embedded Systems Intern",
            employer_name: "SEG Automotive",
            job_city: "Bengaluru",
            job_state: "Karnataka",
            job_country: "IN",
            job_description: "Join our core diagnostics team. Responsibilities include:\n- Developing CAPL scripts to validate ECU responses.\n- Troubleshooting CAN bus network communications.\n- Simulating ECU faults and diagnosing diagnostic trouble codes (DTCs).",
            job_employment_type: "Internship",
            job_apply_link: "https://www.seg-automotive.com/careers/"
          },
          {
            job_title: "IoT & Automation Graduate Engineer",
            employer_name: "Adani Group",
            job_city: "Ahmedabad",
            job_state: "Gujarat",
            job_country: "IN",
            job_description: "Looking for graduates to work on renewable energy monitoring grids. Skills required:\n- Interfacing ESP32, NodeMCU, and sensors (Ultrasonic, IR, Metal detection).\n- Programming in Python and C.\n- Data visualization and analytics dashboards (Power BI is a plus).",
            job_employment_type: "Full-time",
            job_apply_link: "https://www.adani.com/Careers"
          },
          {
            job_title: "Intern L0 - Software & Hardware Integration",
            employer_name: "Wipro",
            job_city: "Bengaluru",
            job_state: "Karnataka",
            job_country: "IN",
            job_description: "Project-based early career internship. Work with hardware integration, IoT gateways, and automation scripting. Ideal for Electronics & Communication Engineering students graduating in 2026. Familiarity with Arduino, Python, and basic circuits required.",
            job_employment_type: "Internship",
            job_apply_link: "https://careers.wipro.com/"
          }
        ]
      };
      
      const queryLower = query.toLowerCase();
      const locLower = location.toLowerCase();
      const filtered = mockData.data.filter(j => 
        (j.job_title.toLowerCase().includes(queryLower) || j.employer_name.toLowerCase().includes(queryLower) || j.job_description.toLowerCase().includes(queryLower)) &&
        (j.job_city.toLowerCase().includes(locLower) || j.job_state.toLowerCase().includes(locLower) || locLower === "")
      );

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ data: filtered }));
      return;
    }

    // Call real JSearch API
    console.log(`Proxying live JSearch request for query: "${query}" in "${location}"`);
    const options = {
      hostname: 'jsearch.p.rapidapi.com',
      path: `/search-v2?query=${encodeURIComponent(query + " in " + location)}&num_pages=1`,
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      }
    };

    const apiReq = https.request(options, (apiRes) => {
      let body = '';
      apiRes.on('data', chunk => body += chunk);
      apiRes.on('end', () => {
        res.writeHead(apiRes.statusCode, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(body);
      });
    });

    apiReq.on('error', (err) => {
      console.error("RapidAPI connection error:", err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "Failed to connect to RapidAPI." }));
    });

    apiReq.end();
    return;
  }

  // 2. Static File Server Route
  let filePath = pathname === '/' ? './index.html' : '.' + pathname;
  filePath = path.join(__dirname, filePath);

  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Local Job Hub Node server running at http://localhost:${PORT}`);
  console.log("Press Ctrl + C to stop the server.");
});
