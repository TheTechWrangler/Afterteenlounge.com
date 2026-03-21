const express = require('express');
const path = require('path');
const fs = require('fs');
const { requireRole } = require('./auth');

const router = express.Router();

const dataDir = path.join(__dirname, '../data');
const homepageDataPath = path.join(dataDir, 'homepage.json');
const calendarDataPath = path.join(dataDir, '../data/calendar.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }

    const rawData = fs.readFileSync(filePath, 'utf8');
    return rawData ? JSON.parse(rawData) : fallback;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
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

function getChicagoDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

router.get('/admin', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

router.get('/admin/homepage', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-homepage.html'));
});

router.get('/admin/calendar', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-calendar.html'));
});

router.post('/admin/homepage/save', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  const homepageData = {
    heroHeading: req.body.heroHeading || '',
    heroText: req.body.heroText || '',
    primaryButtonText: req.body.primaryButtonText || '',
    secondaryButtonText: req.body.secondaryButtonText || '',
    featureTitle: req.body.featureTitle || '',
    featureText: req.body.featureText || '',
    featureItemOneTime: req.body.featureItemOneTime || '',
    featureItemOneText: req.body.featureItemOneText || '',
    featureItemTwoTime: req.body.featureItemTwoTime || '',
    featureItemTwoText: req.body.featureItemTwoText || ''
  };

  writeJson(homepageDataPath, homepageData);
  res.redirect('/admin/homepage');
});

router.post('/admin/calendar/save', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  const eventDate = req.body.eventDate || '';
  const calendarData = readCalendarData();

  if (!eventDate) {
    return res.status(400).send('Event date is required');
  }

  const entry = {
    date: eventDate,
    featureText: req.body.featureText || '',
    featureItemOneTime: req.body.featureItemOneTime || '',
    featureItemOneText: req.body.featureItemOneText || '',
    featureItemTwoTime: req.body.featureItemTwoTime || '',
    featureItemTwoText: req.body.featureItemTwoText || ''
  };

  const existingIndex = calendarData.findIndex((item) => item.date === eventDate);

  if (existingIndex >= 0) {
    calendarData[existingIndex] = entry;
  } else {
    calendarData.push(entry);
  }

  calendarData.sort((a, b) => a.date.localeCompare(b.date));
  writeJson(calendarDataPath, calendarData);

  res.redirect(`/admin/calendar?date=${encodeURIComponent(eventDate)}&saved=1`);
});

router.post('/admin/calendar/delete', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  const eventDate = req.body.eventDate || '';
  const calendarData = readCalendarData();

  if (!eventDate) {
    return res.status(400).json({ error: 'Event date is required' });
  }

  const filtered = calendarData.filter((item) => item.date !== eventDate);
  writeJson(calendarDataPath, filtered);

  return res.json({ success: true });
});

router.get('/api/homepage', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  res.json(readHomepageData());
});

router.get('/api/public/homepage', (req, res) => {
  res.json(readHomepageData());
});

router.get('/api/calendar', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  const calendarData = readCalendarData();
  const date = req.query.date;

  if (date) {
    const entry = calendarData.find((item) => item.date === date);
    return res.json(entry || {});
  }

  res.json(calendarData);
});

router.get('/api/public/calendar/today', (req, res) => {
  const calendarData = readCalendarData();
  const today = getChicagoDateString();
  const entry = calendarData.find((item) => item.date === today);

  res.json({
    date: today,
    entry: entry || null
  });
});

router.get('/dashboard', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  res.send(`Dashboard placeholder (${req.user.role})`);
});

router.get('/users', requireRole(['super_admin']), (req, res) => {
  res.send(`Users placeholder (${req.user.role})`);
});

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'admin123') {
    req.session.user = {
      username: 'admin',
      role: 'admin'
    };
    return res.redirect('/admin');
  }

  return res.status(401).send('Invalid username or password');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;