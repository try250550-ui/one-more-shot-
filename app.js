// =========================================================================
// 1. DATABASE & CLOUD CONFIGURATION (SUPABASE)
// =========================================================================
// If you want to connect to your live Supabase cloud database:
// 1. Create a free project on https://supabase.com
// 2. Put your project URL and Anon Key here:
const SUPABASE_URL = ""; 
const SUPABASE_KEY = ""; 

let supabaseClient = null;
let isOfflineMode = true;

if (SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL !== "https://your-proj.supabase.co") {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    isOfflineMode = false;
    console.log("Connected to Supabase Cloud Database successfully!");
  } catch (error) {
    console.error("Failed to initialize Supabase, running in Local Mock Mode:", error);
    isOfflineMode = true;
  }
} else {
  console.log("No Supabase credentials found. Running in Local Mock Mode (Data stored in browser localStorage).");
}

// =========================================================================
// 2. SIMULATED OFFLINE STATE (LOCAL STORAGE FALLBACK)
// =========================================================================
const getLocalData = (key, defaultVal) => JSON.parse(localStorage.getItem(key)) || defaultVal;
const saveLocalData = (key, val) => localStorage.setItem(key, JSON.stringify(val));

let mockUsers = getLocalData('mock_users', []);
let currentUser = getLocalData('current_user', null);
let trackedJobs = getLocalData('tracked_jobs', [
  { id: '1', company: 'HCLTech', role: 'Graduate Engineer Trainee', status: 'Wishlist', notes: 'Apply via careers.hcltech.com once registration link opens.', date: '2026-07-07' },
  { id: '2', company: 'Wipro', role: 'Intern L0', status: 'Applied', notes: 'Submitted resume on Wipro Careers portal.', date: '2026-06-25' }
]);
let communityJobs = getLocalData('community_jobs', [
  { id: '101', company: 'SEG Automotive', role: 'Embedded Systems Intern', link: 'https://www.seg-automotive.com/careers/', description: 'Looking for a final year ECE student skilled in CAPL scripting and CAN bus testing. Bengaluru location.', posted_by_name: 'Akash Rajanna', created_at: '2026-07-06' },
  { id: '102', company: 'Adani Group', role: 'Graduate Engineer (Automation)', link: 'https://www.adani.com/Careers', description: 'Hiring ECE graduates for industrial automation projects. ESP32, sensors, and hardware programming basic required.', posted_by_name: 'Akash Rajanna', created_at: '2026-07-07' }
]);

// =========================================================================
// 3. RESUME PROFILE DATA
// =========================================================================
const RESUME_DATA = {
  name: "Akash Rajanna",
  email: "akash.rajanna02@gmail.com",
  phone: "9449751537",
  linkedin: "linkedin.com/in/akash-rajanna",
  location: "Bengaluru, Karnataka",
  education: "B.E. — Electronics & Comm. (Vemana IT, 2022-2026)",
  skills: "Python, Embedded C, CAPL, CAN Bus, ECU Testing, ESP32, YOLOv8, Power BI"
};

// =========================================================================
// 4. COVER LETTER & FOLLOW-UP TEMPLATE CONSTRUCTORS
// =========================================================================
const getCoverLetter = (company, role) => {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  let body = "";
  if (company === "HCLTech") {
    body = `I am writing to express my strong interest in the ${role} position at HCLTech. As a final-year Electronics & Communication Engineering student at Vemana Institute of Technology with hands-on experience at SEG Automotive, I am eager to apply my skills in Embedded C, CAPL scripting, and CAN bus diagnostics. My projects—such as an autonomous Landmine Detection Rover built on ESP32, and an Auto Self-Checkout System leveraging YOLOv8—demonstrate my capability to build and integrate hardware and software solutions.`;
  } else if (company === "Adani Group") {
    body = `I am writing to formally apply for the ${role} opportunity within the Adani Group. Given Adani's leadership in infrastructure and green energy, I believe my background in Electronics & Communication Engineering, hardware integration (ESP32/Arduino), and data analytics (Microsoft Power BI Associate certification) aligns perfectly with your technology initiatives. My diagnostics internship at SEG Automotive has also equipped me with professional validation and testing methodologies.`;
  } else {
    body = `I am writing to express my enthusiastic interest in the ${role} program at Wipro. As an ECE student graduating in 2026, I am eager to apply my skills in microcontrollers, Python development, and system automation to Wipro's projects. My diagnostics internship at SEG Automotive and my leadership role as the Chair of the IEEE Circuits & Systems Student Branch at Vemana IT have prepared me to make a meaningful impact.`;
  }

  return `Akash Rajanna\nBengaluru, Karnataka | ${RESUME_DATA.email} | ${RESUME_DATA.phone}\n${RESUME_DATA.linkedin}\n\n${date}\n\nRecruitment Team\n${company}\n\nSubject: Application for ${role}\n\nDear Hiring Manager,\n\n${body}\n\nThank you for your time and consideration.\n\nSincerely,\n\nAkash Rajanna`;
};

const getFollowUpEmail = (company, role) => {
  return `Subject: Application Status Inquiry: ${role} - Akash Rajanna\n\nDear Hiring Manager / Recruitment Team,\n\nI hope this email finds you well.\n\nI am writing to politely follow up on the status of my application for the ${role} position at ${company}, which I submitted recently. \n\nAs a final-year ECE student at Vemana IT and an Embedded Systems Intern at SEG Automotive, I remain highly interested in this opportunity. I would appreciate any updates you can share regarding the next steps in your recruitment process.\n\nSincerely,\n\nAkash Rajanna\nakash.rajanna02@gmail.com | 9449751537`;
};

// =========================================================================
// 5. INTERACTIVE 3D FALLING LETTERS CANVAS
// =========================================================================
function initFallingLetters() {
  const canvas = document.getElementById('falling-letters-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const letterCount = 50;
  const letters = [];

  let mouseX = 0;
  let mouseY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / width) - 0.5; // -0.5 to 0.5
    mouseY = (e.clientY / height) - 0.5;
  });

  for (let i = 0; i < letterCount; i++) {
    letters.push({
      x: Math.random() * width,
      y: Math.random() * height - height - 40,
      z: Math.random() * 0.8 + 0.2, // 3D depth layers
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.025
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    letters.forEach(p => {
      const speed = p.z * 0.9 + (mouseY * 0.3) + 0.6;
      p.y += speed;
      p.angle += p.spin;
      
      // Sway floating motion
      p.x += Math.sin(p.y * 0.01) * 0.2 + (mouseX * 0.5);

      if (p.y > height + 40) {
        p.y = -40;
        p.x = Math.random() * width;
        p.angle = Math.random() * Math.PI * 2;
        p.spin = (Math.random() - 0.5) * 0.02;
        p.z = Math.random() * 0.8 + 0.2;
      }

      if (p.x < -40) p.x = width + 40;
      if (p.x > width + 40) p.x = -40;

      // Draw 3D Floating Offer Letter Document
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      const w = p.z * 18 + 7;
      const h = w * 1.35;
      const opacity = p.z * 0.45 + 0.08;

      // Paper shadow
      ctx.shadowColor = `rgba(22, 163, 74, ${p.z * 0.12})`;
      ctx.shadowBlur = p.z * 6;

      // Paper base sheet (frosted white document)
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.95})`;
      ctx.strokeStyle = `rgba(22, 163, 74, ${opacity * 0.45})`;
      ctx.lineWidth = p.z * 1.2;

      ctx.beginPath();
      // Using basic rect support (older browsers fallback) or roundRect
      if (ctx.roundRect) {
        ctx.roundRect(-w/2, -h/2, w, h, p.z * 2.5);
      } else {
        ctx.rect(-w/2, -h/2, w, h);
      }
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Offer Header line (Vibrant green brand line)
      ctx.fillStyle = `rgba(22, 163, 74, ${opacity * 0.8})`;
      ctx.fillRect(-w/2 + w*0.15, -h/2 + h*0.12, w*0.7, h*0.08);

      // Offer Content text lines (Sage green lines representing writing)
      ctx.fillStyle = `rgba(113, 168, 135, ${opacity * 0.6})`;
      ctx.fillRect(-w/2 + w*0.15, -h/2 + h*0.32, w*0.7, h*0.04);
      ctx.fillRect(-w/2 + w*0.15, -h/2 + h*0.44, w*0.5, h*0.04);
      ctx.fillRect(-w/2 + w*0.15, -h/2 + h*0.56, w*0.6, h*0.04);

      // Gold seal of approval
      ctx.fillStyle = `rgba(217, 119, 6, ${opacity * 0.85})`;
      ctx.beginPath();
      ctx.arc(w/2 - w*0.25, h/2 - h*0.2, w*0.09, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    requestAnimationFrame(draw);
  }

  draw();
}

// Premium 3D Tilt Parallax Effect (Wix Studio reference)
function bindTiltEffects() {
  const cards = document.querySelectorAll('.company-card, .glass-panel, .job-feed-card, .community-post');
  cards.forEach(card => {
    if (card.getAttribute('data-tilt-bound')) return;
    card.setAttribute('data-tilt-bound', 'true');
    
    card.style.transition = 'transform 0.15s ease-out, box-shadow 0.15s ease-out';
    card.style.transformStyle = 'preserve-3d';

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const rotateY = ((x / rect.width) - 0.5) * 12;
      const rotateX = -((y / rect.height) - 0.5) * 12;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });
}

// =========================================================================
// 6. SIMULATED JOB FINDER SEARCH DATA (FALLBACK)
// =========================================================================
const getSimulatedJobs = (query, location) => {
  const q = query.toLowerCase();
  const loc = location.toLowerCase();
  
  const pool = [
    {
      title: "Graduate Engineer Trainee (GET) - Electronics",
      company: "HCLTech",
      location: "Bengaluru, Karnataka",
      description: "Hiring engineering graduates for our embedded systems division. Requirements:\n- Basic understanding of C, Embedded C, and microcontroller architectures.\n- Experience with communication protocols (CAN, I2C, SPI) is a plus.\n- Strong analytical and debugging skills.",
      type: "Full-time",
      link: "https://www.hcltech.com/careers"
    },
    {
      title: "Embedded Systems Intern",
      company: "SEG Automotive",
      location: "Bengaluru, Karnataka",
      description: "Join our core diagnostics team. Responsibilities include:\n- Developing CAPL scripts to validate ECU responses.\n- Troubleshooting CAN bus network communications.\n- Simulating ECU faults and diagnosing diagnostic trouble codes (DTCs).",
      type: "Internship",
      link: "https://www.seg-automotive.com/careers/"
    },
    {
      title: "IoT & Automation Graduate Engineer",
      company: "Adani Group",
      location: "Ahmedabad / Bengaluru",
      description: "Looking for graduates to work on renewable energy monitoring grids. Skills required:\n- Interfacing ESP32, NodeMCU, and sensors (Ultrasonic, IR, Metal detection).\n- Programming in Python and C.\n- Data visualization and analytics dashboards (Power BI is a plus).",
      type: "Full-time",
      link: "https://www.adani.com/Careers"
    },
    {
      title: "Intern L0 - Software & Hardware Integration",
      company: "Wipro",
      location: "Bengaluru, India",
      description: "Project-based early career internship. Work with hardware integration, IoT gateways, and automation scripting. Ideal for Electronics & Communication Engineering students graduating in 2026. Familiarity with Arduino, Python, and basic circuits required.",
      type: "Internship",
      link: "https://careers.wipro.com/"
    },
    {
      title: "Data Analyst Trainee",
      company: "Wipro Digital",
      location: "Bengaluru, Karnataka",
      description: "Analyze operations pipelines. Requirements:\n- High proficiency in Microsoft Power BI and Excel.\n- SQL knowledge is highly preferred.\n- Creating visual reports and presenting findings to stakeholders.",
      type: "Full-time",
      link: "https://careers.wipro.com/"
    },
    {
      title: "Python Scripting Engineer",
      company: "HCLTech Digital",
      location: "Chennai / Remote",
      description: "Write and optimize automation pipelines. Experience with Python packages, computer vision libraries (YOLO, OpenCV), and Google Sheets API integration is highly valued. Work with smart-retail sensor analytics.",
      type: "Contract",
      link: "https://www.hcltech.com/careers"
    }
  ];

  return pool.filter(j => 
    (j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.description.toLowerCase().includes(q)) &&
    (j.location.toLowerCase().includes(loc) || loc === "")
  );
};

// =========================================================================
// 7. HELPER FUNCTIONS
// =========================================================================
const getDaysElapsed = (dateString) => {
  const jobDate = new Date(dateString);
  const today = new Date();
  jobDate.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  const diffTime = today - jobDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : 0;
};

function showToast(message, icon = 'check') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i data-lucide="${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  lucide.createIcons();
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function copyToClipboard(text, successMessage) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMessage || 'Copied!');
  }).catch(() => showToast('Failed to copy', 'x-circle'));
}

// =========================================================================
// 8. DATABASE CRUD ACTIONS (HYBRID OFFLINE/ONLINE)
// =========================================================================

async function handleUserSignUp(name, email, password) {
  if (!isOfflineMode) {
    const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { data: { full_name: name } } });
    if (error) throw error;
    await supabaseClient.from('profiles').upsert({ id: data.user.id, full_name: name });
    return data.user;
  } else {
    if (mockUsers.some(u => u.email === email)) throw new Error("Email already registered locally.");
    const newUser = { id: Date.now().toString(), full_name: name, email };
    mockUsers.push({ ...newUser, password });
    saveLocalData('mock_users', mockUsers);
    return newUser;
  }
}

async function handleUserLogIn(email, password) {
  if (!isOfflineMode) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  } else {
    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (!user) throw new Error("Invalid local email or password.");
    return { id: user.id, full_name: user.full_name, email: user.email };
  }
}

async function handleUserLogOut() {
  if (!isOfflineMode) {
    await supabaseClient.auth.signOut();
  }
  currentUser = null;
  localStorage.removeItem('current_user');
  location.reload();
}

async function getUserProfile(user) {
  if (!isOfflineMode) {
    const { data, error } = await supabaseClient.from('profiles').select('full_name').eq('id', user.id).single();
    return data ? data.full_name : user.email;
  }
  return user.full_name;
}

async function fetchTrackedJobs(userId) {
  if (!isOfflineMode) {
    const { data, error } = await supabaseClient.from('tracked_jobs').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) console.error(error);
    return data || [];
  }
  return trackedJobs;
}

async function addTrackedJob(job) {
  if (!isOfflineMode) {
    const { data, error } = await supabaseClient.from('tracked_jobs').insert({
      company: job.company,
      role: job.role,
      status: job.status,
      notes: job.notes || '',
      date_applied: job.date
    });
    if (error) throw error;
  } else {
    const newJob = { id: Date.now().toString(), ...job };
    trackedJobs.unshift(newJob);
    saveLocalData('tracked_jobs', trackedJobs);
  }
}

async function deleteTrackedJob(jobId) {
  if (!isOfflineMode) {
    const { error } = await supabaseClient.from('tracked_jobs').delete().eq('id', jobId);
    if (error) throw error;
  } else {
    trackedJobs = trackedJobs.filter(j => j.id !== jobId);
    saveLocalData('tracked_jobs', trackedJobs);
  }
}

async function updateTrackedJobStatus(jobId, status) {
  if (!isOfflineMode) {
    const { error } = await supabaseClient.from('tracked_jobs').update({ status }).eq('id', jobId);
    if (error) throw error;
  } else {
    const job = trackedJobs.find(j => j.id === jobId);
    if (job) {
      job.status = status;
      saveLocalData('tracked_jobs', trackedJobs);
    }
  }
}

async function fetchCommunityJobs() {
  if (!isOfflineMode) {
    const { data, error } = await supabaseClient.from('community_jobs').select('*, profiles(full_name)').order('created_at', { ascending: false });
    if (error) console.error(error);
    return (data || []).map(j => ({
      id: j.id,
      company: j.company,
      role: j.role,
      link: j.link,
      description: j.description,
      posted_by_name: j.profiles ? j.profiles.full_name : 'Collaborator',
      created_at: j.created_at.split('T')[0]
    }));
  }
  return communityJobs;
}

async function postCommunityJob(job) {
  if (!isOfflineMode) {
    const { error } = await supabaseClient.from('community_jobs').insert({
      company: job.company,
      role: job.role,
      link: job.link,
      description: job.description
    });
    if (error) throw error;
  } else {
    const newPost = {
      id: Date.now().toString(),
      company: job.company,
      role: job.role,
      link: job.link,
      description: job.description,
      posted_by_name: currentUser ? currentUser.full_name : 'Akash Rajanna',
      created_at: new Date().toISOString().split('T')[0]
    };
    communityJobs.unshift(newPost);
    saveLocalData('community_jobs', communityJobs);
  }
}

// Check and Render PDF Resume from Supabase Storage
async function checkAndRenderResume(userId) {
  if (isOfflineMode) return;
  try {
    const { data, error } = await supabaseClient.storage.from('resumes').list(userId);
    if (data && data.length > 0) {
      const resumeFile = data.find(f => f.name.endsWith('.pdf'));
      if (resumeFile) {
        const { data: urlData } = supabaseClient.storage.from('resumes').getPublicUrl(`${userId}/${resumeFile.name}`);
        document.getElementById('resume-status-text').innerText = `Uploaded: ${resumeFile.name}`;
        document.getElementById('resume-download-link').href = urlData.publicUrl;
        document.getElementById('resume-download-action').style.display = 'block';
      }
    }
  } catch (err) {
    console.error("Failed to check resume storage:", err);
  }
}

// Upload PDF Resume to Supabase Storage
async function uploadResumeFile(file, userId) {
  if (isOfflineMode) return;
  showToast("Uploading resume...", "loader");
  const filePath = `${userId}/resume.pdf`;
  try {
    const { data, error } = await supabaseClient.storage.from('resumes').upload(filePath, file, {
      upsert: true
    });
    if (error) throw error;
    showToast("Resume uploaded successfully!");
    checkAndRenderResume(userId);
  } catch (err) {
    console.error("Upload error:", err);
    showToast(err.message || "Failed to upload resume", "x-circle");
  }
}

// =========================================================================
// 9. RENDER LAYOUTS
// =========================================================================

async function syncAndRefreshTracker() {
  if (!currentUser) return;
  const list = await fetchTrackedJobs(currentUser.id);
  
  const tbody = document.getElementById('tracker-table-body');
  const searchQuery = document.getElementById('tracker-search').value.toLowerCase();
  tbody.innerHTML = '';
  
  const filtered = list.filter(job => 
    job.company.toLowerCase().includes(searchQuery) ||
    job.role.toLowerCase().includes(searchQuery) ||
    job.status.toLowerCase().includes(searchQuery)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No applications logged. Add one or search in the Job Finder!</td></tr>`;
  } else {
    filtered.forEach(job => {
      const dateVal = job.date_applied || job.date || '2026-07-07';
      const days = getDaysElapsed(dateVal);
      let followUpCell = "";

      if (job.status === 'Applied' || job.status === 'Interviewing') {
        if (days > 7) {
          followUpCell = `
            <button class="followup-alert-btn" data-id="${job.id}">
              <i data-lucide="bell" style="width:12px; height:12px;"></i> Follow Up (${days}d)
            </button>`;
        } else {
          followUpCell = `<span class="followup-safe"><i data-lucide="check-circle-2"></i> Active (${days}d)</span>`;
        }
      } else if (job.status === 'Offer') {
        followUpCell = `<span class="followup-safe" style="color: #16a34a;"><i data-lucide="award" style="color: #16a34a;"></i> Offered!</span>`;
      } else {
        followUpCell = `<span class="followup-safe" style="color: var(--text-muted);"><i data-lucide="minus-circle" style="color: var(--text-muted);"></i> N/A</span>`;
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-weight: 600; color: var(--text-primary);">${job.company}</td>
        <td>${job.role}</td>
        <td>
          <select class="status-badge ${job.status.toLowerCase()}" data-id="${job.id}">
            <option value="Wishlist" ${job.status === 'Wishlist' ? 'selected' : ''}>Wishlist</option>
            <option value="Applied" ${job.status === 'Applied' ? 'selected' : ''}>Applied</option>
            <option value="Interviewing" ${job.status === 'Interviewing' ? 'selected' : ''}>Interviewing</option>
            <option value="Offer" ${job.status === 'Offer' ? 'selected' : ''}>Offer</option>
            <option value="Rejected" ${job.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </td>
        <td>${dateVal}</td>
        <td>${followUpCell}</td>
        <td>
          <button class="delete-btn" data-id="${job.id}"><i data-lucide="trash-2"></i></button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  const total = list.length;
  const activeApps = list.filter(j => j.status === 'Applied' || j.status === 'Interviewing' || j.status === 'Offer').length;
  document.getElementById('total-apps').innerText = total;
  document.getElementById('completed-apps').innerText = activeApps;
  const percentage = total > 0 ? (activeApps / total) * 100 : 0;
  document.getElementById('tracker-progress').style.width = `${percentage}%`;

  tbody.querySelectorAll('.status-badge').forEach(select => {
    select.addEventListener('change', async (e) => {
      const jobId = e.target.getAttribute('data-id');
      await updateTrackedJobStatus(jobId, e.target.value);
      showToast(`Updated status to ${e.target.value}`);
      syncAndRefreshTracker();
    });
  });

  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const jobId = e.currentTarget.getAttribute('data-id');
      await deleteTrackedJob(jobId);
      showToast('Application deleted', 'trash');
      syncAndRefreshTracker();
    });
  });

  tbody.querySelectorAll('.followup-alert-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const jobId = e.currentTarget.getAttribute('data-id');
      const job = list.find(j => j.id === jobId);
      if (job) {
        document.getElementById('followup-email-content').innerText = getFollowUpEmail(job.company, job.role);
        document.getElementById('followup-modal').classList.add('active');
      }
    });
  });

  lucide.createIcons();
  bindTiltEffects();
}

async function renderCommunityFeed() {
  const posts = await fetchCommunityJobs();
  const container = document.getElementById('community-feed-container');
  container.innerHTML = '';
  
  if (posts.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">No jobs broadcasted yet. Be the first to share one!</div>`;
    return;
  }

  posts.forEach(post => {
    const card = document.createElement('div');
    card.className = 'community-post glass-panel';
    card.innerHTML = `
      <div class="post-header">
        <div class="post-title">
          <h4>${post.role}</h4>
          <div class="post-meta">
            <span>at <strong style="color: var(--accent-wipro);">${post.company}</strong></span>
            <span class="meta-bullet">•</span>
            <span>Shared by <span class="post-user">${post.posted_by_name}</span></span>
            <span class="meta-bullet">•</span>
            <span>${post.created_at}</span>
          </div>
        </div>
      </div>
      <p class="post-desc">${post.description}</p>
      <div class="post-actions">
        <a href="${post.link}" target="_blank" class="action-btn wipro-btn" style="width: auto; padding: 0.45rem 1rem; font-size: 0.8rem; text-decoration: none;">
          Apply Direct <i data-lucide="external-link" style="width: 12px; height: 12px;"></i>
        </a>
        <button class="add-to-tracker-btn quick-track-comm" data-company="${post.company}" data-role="${post.role}" style="padding: 0.45rem 1rem; font-size: 0.8rem;">
          <i data-lucide="plus" style="width: 12px; height: 12px;"></i> Track Job
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll('.quick-track-comm').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const company = e.currentTarget.getAttribute('data-company');
      const role = e.currentTarget.getAttribute('data-role');
      await addTrackedJob({
        company,
        role,
        status: 'Wishlist',
        date: new Date().toISOString().split('T')[0],
        notes: 'Added from Community Board Feed'
      });
      showToast(`Tracking ${company} (${role})`);
      syncAndRefreshTracker();
    });
  });

  lucide.createIcons();
  bindTiltEffects();
}

// Call Serverless Vercel Keyless Backend Proxy API
async function handleJobSearch(keyword, location) {
  const container = document.getElementById('jobs-grid-container');
  container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 3rem;">
    <i data-lucide="loader" class="animate-spin" style="width: 24px; height: 24px; margin-bottom: 0.5rem;"></i>
    <p>Searching for openings...</p>
  </div>`;
  lucide.createIcons();

  const indicator = document.getElementById('live-indicator');

  try {
    const searchUrl = `/api/jobs?query=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}`;
    const response = await fetch(searchUrl);
    const resData = await response.json();
    
    if (resData.data && resData.data.length > 0) {
      indicator.innerHTML = `<i data-lucide="wifi"></i> Live API Feed`;
      indicator.className = "live-indicator live";
      renderJobsGrid(resData.data.map(j => ({
        title: j.job_title,
        company: j.employer_name,
        location: `${j.job_city || ''} ${j.job_state || ''} ${j.job_country || ''}`.trim() || 'Remote',
        description: j.job_description,
        type: j.job_employment_type || 'Full-time',
        link: j.job_apply_link || j.job_google_link
      })));
    } else {
      throw new Error("No live listings found.");
    }
  } catch (error) {
    console.error("API proxy failed, calling simulated query search:", error);
    triggerSimulatedSearch(keyword, location);
  }
}

function triggerSimulatedSearch(keyword, location) {
  const indicator = document.getElementById('live-indicator');
  indicator.innerHTML = `<i data-lucide="activity"></i> Simulated Feed`;
  indicator.className = "live-indicator";
  const results = getSimulatedJobs(keyword, location);
  renderJobsGrid(results);
}

function renderJobsGrid(jobsList) {
  const container = document.getElementById('jobs-grid-container');
  const countTitle = document.getElementById('results-count-title');
  container.innerHTML = '';
  
  if (jobsList.length === 0) {
    countTitle.innerText = "No Openings Found";
    container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 3rem; grid-column: 1/-1;">
      No matching jobs found. Try adjusting your keyword or search criteria.
    </div>`;
    return;
  }

  countTitle.innerText = `Found ${jobsList.length} Job${jobsList.length > 1 ? 's' : ''}`;

  jobsList.forEach(job => {
    const isWipro = job.company.toLowerCase().includes('wipro');
    const isHCL = job.company.toLowerCase().includes('hcl');
    const isAdani = job.company.toLowerCase().includes('adani');
    let colorClass = "";
    if (isWipro) colorClass = "";
    else if (isHCL) colorClass = "hcl-color";
    else if (isAdani) colorClass = "adani-color";

    const card = document.createElement('div');
    card.className = 'job-feed-card';
    card.innerHTML = `
      <div class="job-feed-card-header">
        <div class="job-title-block">
          <h4>${job.title}</h4>
          <div class="job-meta-row">
            <span class="meta-company ${colorClass}">${job.company}</span>
            <span class="meta-bullet">•</span>
            <span>${job.location}</span>
            <span class="meta-bullet">•</span>
            <span class="badge-tag highlight">${job.type}</span>
          </div>
        </div>
      </div>
      <div class="job-feed-description">${job.description}</div>
      <div class="job-feed-actions">
        <a href="${job.link}" target="_blank" class="action-btn wipro-btn" style="width: auto; padding: 0.45rem 1rem; font-size: 0.8rem; text-decoration: none;">
          Apply Portal <i data-lucide="external-link" style="width: 12px; height: 12px;"></i>
        </a>
        <button class="add-to-tracker-btn track-finder-job" data-company="${job.company}" data-role="${job.title}" style="padding: 0.45rem 1rem; font-size: 0.8rem;">
          <i data-lucide="plus" style="width: 12px; height: 12px;"></i> Track
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll('.job-feed-description').forEach(desc => {
    desc.addEventListener('click', () => {
      desc.classList.toggle('expanded');
    });
  });

  container.querySelectorAll('.track-finder-job').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const company = e.currentTarget.getAttribute('data-company');
      const role = e.currentTarget.getAttribute('data-role');
      await addTrackedJob({
        company,
        role,
        status: 'Wishlist',
        date: new Date().toISOString().split('T')[0],
        notes: 'Added from Live Job Finder'
      });
      showToast(`Added ${company} to Tracker!`);
      syncAndRefreshTracker();
    });
  });

  lucide.createIcons();
  bindTiltEffects();
}

function runStartupNotifications(list) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const count = list.filter(j => (j.status === 'Applied' || j.status === 'Interviewing') && getDaysElapsed(j.date_applied || j.date) > 7).length;
  if (count > 0 && !sessionStorage.getItem('notified_followup')) {
    new Notification("Job Follow-Up Reminder", {
      body: `Hi ${currentUser.full_name || 'Akash'}, you have ${count} application${count > 1 ? 's' : ''} that need follow-up emails today!`,
    });
    sessionStorage.setItem('notified_followup', 'true');
  }
}

// Activate Dashboard View once user is authenticated
async function activateAppDashboard(user) {
  currentUser = user;
  saveLocalData('current_user', currentUser);
  
  document.getElementById('auth-overlay').classList.remove('active');
  document.getElementById('auth-overlay').classList.add('inactive');
  document.getElementById('app-container').style.display = 'grid';

  const fullName = await getUserProfile(user);
  currentUser.full_name = fullName;
  document.getElementById('user-display-name').innerText = fullName;
  document.getElementById('user-display-email').innerText = user.email;
  
  const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('user-initials').innerText = initials;

  triggerSimulatedSearch("Embedded Systems", "Bengaluru");
  syncAndRefreshTracker();
  renderCommunityFeed();

  const list = await fetchTrackedJobs(user.id);
  runStartupNotifications(list);
  
  // Storage Integration Setup
  if (!isOfflineMode) {
    document.getElementById('resume-upload-card').style.display = 'block';
    await checkAndRenderResume(user.id);
    
    const fileInput = document.getElementById('resume-file-input');
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.type !== "application/pdf") {
          showToast("Only PDF format is supported", "alert-circle");
          return;
        }
        await uploadResumeFile(file, user.id);
      }
    };
  }

  showToast(`Welcome back, ${fullName}!`);
}

// =========================================================================
// 10. EVENT LISTENERS SETUP
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initFallingLetters();

  if (currentUser) {
    activateAppDashboard(currentUser);
  }

  document.getElementById('go-to-signup').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form').classList.add('active');
    document.getElementById('auth-desc').innerText = "Register your email to sync your application data across devices.";
  });

  document.getElementById('go-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-form').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
    document.getElementById('auth-desc').innerText = "Create an account or sign in to track jobs 24/7 and share job leads.";
  });

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    try {
      const user = await handleUserLogIn(email, pass);
      activateAppDashboard(user);
    } catch (err) {
      showToast(err.message || "Failed to sign in", "alert-circle");
    }
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    try {
      const user = await handleUserSignUp(name, email, pass);
      activateAppDashboard(user);
    } catch (err) {
      showToast(err.message || "Registration failed", "alert-circle");
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await handleUserLogOut();
  });

  const navBtns = document.querySelectorAll('.nav-btn');
  const panels = document.querySelectorAll('.tab-panel');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      navBtns.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });

  document.getElementById('job-search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const company = document.getElementById('search-company').value.trim();
    const role = document.getElementById('search-query').value.trim();
    const loc = document.getElementById('search-location').value.trim();
    
    let combinedQuery = "";
    if (company) combinedQuery += company + " ";
    combinedQuery += role;
    
    handleJobSearch(combinedQuery, loc);
  });

  document.querySelectorAll('.copyable-item').forEach(item => {
    const btn = item.querySelector('.copy-field-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = item.getAttribute('data-value');
        const label = item.querySelector('.label').innerText;
        copyToClipboard(val, `Copied ${label}!`);
      });
    }
  });

  const clPreview = document.getElementById('letter-content');
  function runCLGen() {
    const comp = document.getElementById('cl-company').value;
    const role = document.getElementById('cl-role').value;
    clPreview.innerText = getCoverLetter(comp, role);
  }
  document.getElementById('generate-cl-btn').addEventListener('click', () => {
    runCLGen();
    showToast("Generated Cover Letter!");
  });
  document.getElementById('copy-cl-btn').addEventListener('click', () => {
    copyToClipboard(clPreview.innerText, "Copied Cover Letter!");
  });
  runCLGen();

  document.getElementById('add-app-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const company = document.getElementById('track-company').value;
    const role = document.getElementById('track-role').value;
    const status = document.getElementById('track-status').value;
    const notes = document.getElementById('track-notes').value;
    await addTrackedJob({
      company,
      role,
      status,
      notes,
      date: new Date().toISOString().split('T')[0]
    });
    document.getElementById('add-app-form').reset();
    showToast(`Logged application for ${company}!`);
    syncAndRefreshTracker();
  });

  document.getElementById('tracker-search').addEventListener('input', () => {
    syncAndRefreshTracker();
  });

  document.getElementById('community-post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const company = document.getElementById('comm-company').value;
    const role = document.getElementById('comm-role').value;
    const link = document.getElementById('comm-link').value;
    const description = document.getElementById('comm-desc').value;
    await postCommunityJob({ company, role, link, description });
    document.getElementById('community-post-form').reset();
    showToast("Broadcasted job details successfully!");
    renderCommunityFeed();
  });

  document.querySelectorAll('.add-to-tracker-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (e.currentTarget.classList.contains('quick-track-comm') || e.currentTarget.classList.contains('track-finder-job')) return;
      const company = e.currentTarget.getAttribute('data-company');
      const role = e.currentTarget.getAttribute('data-role');
      await addTrackedJob({
        company,
        role,
        status: 'Wishlist',
        date: new Date().toISOString().split('T')[0],
        notes: 'Added from company direct career cards.'
      });
      showToast(`Added ${company} to Tracker!`);
      syncAndRefreshTracker();
    });
  });

  const followupModal = document.getElementById('followup-modal');
  const setupModal = document.getElementById('setup-modal');

  document.getElementById('close-modal').addEventListener('click', () => followupModal.classList.remove('active'));
  document.getElementById('copy-followup-btn').addEventListener('click', () => {
    copyToClipboard(document.getElementById('followup-email-content').innerText, "Copied Follow-up Email Draft!");
    followupModal.classList.remove('active');
  });

  document.getElementById('close-setup-modal').addEventListener('click', () => setupModal.classList.remove('active'));

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
      setupModal.classList.add('active');
    }
  });

  if ("Notification" in window) {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }

  bindTiltEffects();
});
