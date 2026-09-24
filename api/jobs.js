export default async function handler(req, res) {
  // Support CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { query, location } = req.query;
  const keyword = query || 'Embedded Systems';
  const loc = location || 'Bengaluru';
  
  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    // If no API key is set on Vercel environment variables, return simulated data.
    // This allows local and free testing to work seamlessly.
    console.log("No RAPIDAPI_KEY found. Returning simulated fallback data.");
    const simulatedJobs = [
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
      },
      {
        job_title: "Data Analyst Trainee",
        employer_name: "Wipro Digital",
        job_city: "Bengaluru",
        job_state: "Karnataka",
        job_country: "IN",
        job_description: "Analyze operations pipelines. Requirements:\n- High proficiency in Microsoft Power BI and Excel.\n- SQL knowledge is highly preferred.\n- Creating visual reports and presenting findings to stakeholders.",
        job_employment_type: "Full-time",
        job_apply_link: "https://careers.wipro.com/"
      },
      {
        job_title: "Python Scripting Engineer",
        employer_name: "HCLTech Digital",
        job_city: "Chennai",
        job_state: "Tamil Nadu",
        job_country: "IN",
        job_description: "Write and optimize automation pipelines. Experience with Python packages, computer vision libraries (YOLO, OpenCV), and Google Sheets API integration is highly valued. Work with smart-retail sensor analytics.",
        job_employment_type: "Full-time",
        job_apply_link: "https://www.hcltech.com/careers"
      }
    ];

    const queryLower = keyword.toLowerCase();
    const locLower = loc.toLowerCase();
    const filtered = simulatedJobs.filter(j => 
      (j.job_title.toLowerCase().includes(queryLower) || j.employer_name.toLowerCase().includes(queryLower) || j.job_description.toLowerCase().includes(queryLower)) &&
      (j.job_city.toLowerCase().includes(locLower) || j.job_state.toLowerCase().includes(locLower) || locLower === "")
    );

    res.status(200).json({ data: filtered });
    return;
  }

  // Fetch real JSearch API
  try {
    const searchUrl = `https://jsearch.p.rapidapi.com/search-v2?query=${encodeURIComponent(keyword + " in " + loc)}&num_pages=1`;
    const apiResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      }
    });

    const data = await apiResponse.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("JSearch API proxy error:", error);
    res.status(500).json({ error: "Failed to fetch job data from JSearch API." });
  }
}
