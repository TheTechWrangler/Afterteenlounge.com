const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireRole } = require('./auth');
const db = require('./db');

const router = express.Router();

const dataDir = path.join(__dirname, '../data');
const calendarDataPath = path.join(dataDir, 'calendar.json');
const contactDataPath = path.join(dataDir, 'contact.json');
const uploadsDir = path.join(__dirname, '../public/uploads');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
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

ensureUploadsDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    cb(null, `${Date.now()}-${base}${ext}`);
  }
});

const upload = multer({ storage });

/* =======================
   PUBLIC PAGES
======================= */

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

router.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/contact.html'));
});

router.get('/events', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/events.html'));
});

router.get('/gallery', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/gallery.html'));
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

router.get('/admin/gallery', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-gallery.html'));
});

/* =======================
   SAVE ROUTES
======================= */

router.post('/admin/homepage/save', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  db.get(`SELECT id FROM pages WHERE slug = 'home'`, (err, page) => {
    if (err || !page) {
      return res.status(500).send('Homepage not found');
    }

    const updates = [
      {
        key: 'hero',
        content: {
          heroHeading: req.body.heroHeading || '',
          heroText: req.body.heroText || ''
        }
      },
      {
        key: 'intro',
        content: {
          heading: req.body.introHeading || '',
          text: req.body.introText || ''
        }
      },
      {
        key: 'offer_card',
        content: {
          title: req.body.offerTitle || '',
          text: req.body.offerText || ''
        }
      },
      {
        key: 'spotlight_card',
        content: {
          title: req.body.spotlightTitle || '',
          text: req.body.spotlightText || ''
        }
      },
      {
        key: 'highlights_intro',
        content: {
          heading: req.body.highlightsHeading || '',
          text: req.body.highlightsText || ''
        }
      },
      {
        key: 'announcements_card',
        content: {
          tag: req.body.announcementsTag || '',
          title: req.body.announcementsTitle || '',
          text: req.body.announcementsText || ''
        }
      },
      {
        key: 'events_card',
        content: {
          tag: req.body.eventsTag || '',
          title: req.body.eventsTitle || '',
          text: req.body.eventsText || ''
        }
      },
      {
        key: 'engagement_card',
        content: {
          tag: req.body.engagementTag || '',
          title: req.body.engagementTitle || '',
          text: req.body.engagementText || ''
        }
      }
    ];

    const stmt = db.prepare(`
      UPDATE page_sections
      SET content_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE page_id = ? AND section_key = ?
    `);

    updates.forEach(section => {
      stmt.run(
        JSON.stringify(section.content),
        page.id,
        section.key
      );
    });

    stmt.finalize((finalizeErr) => {
      if (finalizeErr) {
        return res.status(500).send('Failed to save homepage');
      }

      res.redirect('/admin/homepage');
    });
  });
});

router.post('/admin/calendar/save', requireRole(['super_admin', 'admin', 'limited_admin']), (req, res) => {
  const calendar = readCalendarData();
  const date = req.body.eventDate;

  const entry = {
    date,
    featureText: req.body.featureText || '',
    featureItemOneTime: req.body.featureItemOneTime || '',
    featureItemOneText: req.body.featureItemOneText || '',
    featureItemTwoTime: req.body.featureItemTwoTime || '',
    featureItemTwoText: req.body.featureItemTwoText || ''
  };

  const index = calendar.findIndex(e => e.date === date);

  if (index >= 0) {
    calendar[index] = entry;
  } else {
    calendar.push(entry);
  }

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

router.post(
  '/admin/gallery/upload',
  requireRole(['super_admin', 'admin', 'limited_admin']),
  upload.single('galleryImage'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }

    const title = req.body.title || '';
    const description = req.body.description || '';
    const altText = req.body.altText || '';
    const sortOrder = Number(req.body.sortOrder || 0);
    const filePath = `/uploads/${req.file.filename}`;

    db.run(
      `
      INSERT INTO gallery_images (title, description, file_path, alt_text, sort_order)
      VALUES (?, ?, ?, ?, ?)
      `,
      [title, description, filePath, altText, sortOrder],
      (err) => {
        if (err) {
          return res.status(500).send('Failed to save gallery image');
        }

        res.redirect('/admin/gallery');
      }
    );
  }
);

/* =======================
   API ROUTES
======================= */
router.get('/api/admin/gallery', requireRole(['super_admin', 'admin', 'limited_admin']), (_req, res) => {
  db.all(
    `
    SELECT id, title, description, file_path, alt_text, sort_order, is_visible, created_at
    FROM gallery_images
    ORDER BY sort_order ASC, id DESC
    `,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json(rows);
    }
  );
});

router.get('/api/public/homepage', (req, res) => {
  db.all(`
    SELECT ps.section_key, ps.content_json
    FROM page_sections ps
    JOIN pages p ON p.id = ps.page_id
    WHERE p.slug = 'home'
    ORDER BY ps.sort_order ASC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const sections = {};

    rows.forEach(row => {
      try {
        sections[row.section_key] = JSON.parse(row.content_json || '{}');
      } catch {
        sections[row.section_key] = {};
      }
    });

    res.json(sections);
  });
});

router.get('/api/homepage', (req, res) => {
  db.all(`
    SELECT ps.section_key, ps.content_json
    FROM page_sections ps
    JOIN pages p ON p.id = ps.page_id
    WHERE p.slug = 'home'
    ORDER BY ps.sort_order ASC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const sections = {};

    rows.forEach(row => {
      try {
        sections[row.section_key] = JSON.parse(row.content_json || '{}');
      } catch {
        sections[row.section_key] = {};
      }
    });

    res.json(sections);
  });
});

router.get('/api/public/contact', (req, res) => {
  res.json(readContactData());
});

router.get('/api/contact', (req, res) => {
  res.json(readContactData());
});

router.get('/api/public/calendar/today', (req, res) => {
  const calendar = readCalendarData();
  const today = getChicagoDateString();
  const entry = calendar.find(e => e.date === today);

  res.json({ date: today, entry: entry || null });
});

router.get('/api/calendar', (req, res) => {
  const calendar = readCalendarData();
  const requestedDate = req.query.date;

  if (requestedDate) {
    const entry = calendar.find(e => e.date === requestedDate);
    return res.json(entry || {});
  }

  res.json(calendar);
});

router.get('/api/public/gallery', (_req, res) => {
  db.all(
    `
    SELECT id, title, description, file_path, alt_text, sort_order, created_at
    FROM gallery_images
    WHERE is_visible = 1
    ORDER BY sort_order ASC, id DESC
    `,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json(rows);
    }
  );
});
router.post(
  '/admin/gallery/delete',
  requireRole(['super_admin', 'admin', 'limited_admin']),
  (req, res) => {
    const imageId = Number(req.body.imageId || 0);

    if (!imageId) {
      return res.status(400).send('Missing image id');
    }

    db.get(
      `SELECT file_path FROM gallery_images WHERE id = ?`,
      [imageId],
      (err, row) => {
        if (err) {
          return res.status(500).send('Failed to find image');
        }

        if (!row) {
          return res.status(404).send('Image not found');
        }

        const fullPath = path.join(__dirname, '../public', row.file_path.replace(/^\//, ''));

        db.run(
          `DELETE FROM gallery_images WHERE id = ?`,
          [imageId],
          (deleteErr) => {
            if (deleteErr) {
              return res.status(500).send('Failed to delete image record');
            }

            fs.unlink(fullPath, () => {
              res.redirect('/admin/gallery');
            });
          }
        );
      }
    );
  }
);

router.post(
  '/admin/gallery/toggle',
  requireRole(['super_admin', 'admin', 'limited_admin']),
  (req, res) => {
    const imageId = Number(req.body.imageId || 0);

    if (!imageId) {
      return res.status(400).send('Missing image id');
    }

    db.run(
      `
      UPDATE gallery_images
      SET is_visible = CASE WHEN is_visible = 1 THEN 0 ELSE 1 END
      WHERE id = ?
      `,
      [imageId],
      (err) => {
        if (err) {
          return res.status(500).send('Failed to toggle image');
        }

        res.redirect('/admin/gallery');
      }
    );
  }
);


router.get('/api/debug/home-sections', (req, res) => {
  db.all(`
    SELECT ps.id, ps.section_key, ps.section_label, ps.content_json, ps.sort_order
    FROM page_sections ps
    JOIN pages p ON p.id = ps.page_id
    WHERE p.slug = 'home'
    ORDER BY ps.sort_order ASC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
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