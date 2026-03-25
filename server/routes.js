const express = require('express');
const path = require('path');
const fs = require('fs');
const { requireRole } = require('./auth');

const router = express.Router();

const dataDir = path.join(__dirname, '../data');
const homepageDataPath = path.join(dataDir, 'homepage.json');
const calendarDataPath = path.join(dataDir, 'calendar.json');
const contactDataPath = path.join(dataDir, 'contact.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function readHomepageData() {
  return readJson(homepageDataPath, {});
}

function readCalendarData() {
  return readJson(calendarDataPath, []);
}

function readContactData() {
  return readJson(contactDataPath, {});
}

function getChicagoDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

/* =======================
   PUBLIC PAGES
======================= */

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

router.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/contact.html'));
});

// 🔥 THIS WAS MISSING
router.get('/events', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/events.html'));
});

/* =======================
   ADMIN PAGES
======================= */

router.get('/admin', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

router.get('/admin/homepage', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-homepage.html'));
});

router.get('/admin/calendar', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-calendar.html'));
});

router.get('/admin/contact', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-contact.html'));
});

/* =======================
   SAVE ROUTES
======================= */

router.post('/admin/homepage/save', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  writeJson(homepageDataPath, req.body);
  res.redirect('/admin/homepage');
});

router.post('/admin/calendar/save', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  const calendar = readCalendarData();
  const date = req.body.eventDate;

  const entry = {
    date,
    featureText: req.body.featureText,
    featureItemOneTime: req.body.featureItemOneTime,
    featureItemOneText: req.body.featureItemOneText,
    featureItemTwoTime: req.body.featureItemTwoTime,
    featureItemTwoText: req.body.featureItemTwoText
  };

  const index = calendar.findIndex(e => e.date === date);

  if (index >= 0) calendar[index] = entry;
  else calendar.push(entry);

  calendar.sort((a, b) => a.date.localeCompare(b.date));

  writeJson(calendarDataPath, calendar);
  res.redirect(`/admin/calendar?date=${date}&saved=1`);
});

router.post('/admin/calendar/delete', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  const calendar = readCalendarData().filter(e => e.date !== req.body.eventDate);
  writeJson(calendarDataPath, calendar);
  res.json({ success: true });
});

router.post('/admin/contact/save', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  writeJson(contactDataPath, req.body);
  res.redirect('/admin/contact');
});

/* =======================
   API ROUTES
======================= */

router.get('/api/public/homepage', (req, res) => {
  res.json(readHomepageData());
});

router.get('/api/public/contact', (req, res) => {
  res.json(readContactData());
});

router.get('/api/public/calendar/today', (req, res) => {
  const calendar = readCalendarData();
  const today = getChicagoDateString();
  const entry = calendar.find(e => e.date === today);

  res.json({ date: today, entry: entry || null });
});

// 🔥 THIS feeds your events page
router.get('/api/calendar', (req, res) => {
  res.json(readCalendarData());
});

/* =======================
   AUTH
======================= */

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'admin123') {
    req.session.user = { username: 'admin', role: 'admin' };
    return res.redirect('/admin');
  }

  res.status(401).send('Invalid login');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;