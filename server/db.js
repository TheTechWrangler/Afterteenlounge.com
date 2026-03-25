const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'data', 'afterteen.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS page_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER NOT NULL,
      section_key TEXT NOT NULL,
      section_label TEXT,
      content_json TEXT NOT NULL DEFAULT '{}',
      is_enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
      UNIQUE(page_id, section_key)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_date TEXT NOT NULL UNIQUE,
      feature_text TEXT,
      feature_item_one_time TEXT,
      feature_item_one_text TEXT,
      feature_item_two_time TEXT,
      feature_item_two_text TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT,
      alt_text TEXT,
      caption TEXT,
      file_path TEXT NOT NULL,
      mime_type TEXT,
      file_size INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS gallery_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      description TEXT,
      file_path TEXT NOT NULL,
      alt_text TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_visible INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    INSERT OR IGNORE INTO pages (slug, title)
    VALUES
      ('home', 'Homepage'),
      ('events', 'Events'),
      ('contact', 'Contact')
  `);

  db.get(`SELECT id FROM pages WHERE slug = 'home'`, (err, row) => {
    if (err || !row) return;

    const homePageId = row.id;

    const sections = [
      {
        key: 'hero',
        label: 'Hero',
        sort: 1,
        content: {
          heroHeading: 'A place to grow, connect, and belong.',
          heroText: 'A structured, welcoming space where teens can focus, build friendships, and take part in positive after-school activities.'
        }
      },
      {
        key: 'tonight',
        label: 'Tonight Card',
        sort: 2,
        content: {
          featureTitle: 'Tonight at the Lounge'
        }
      },
      {
        key: 'intro',
        label: 'Intro Section',
        sort: 3,
        content: {
          heading: 'More than just a place to go after school.',
          text: 'The After Teen Lounge is built to feel supportive, safe, and fun — with structure for families and flexibility for teens.'
        }
      },
      {
        key: 'offer_card',
        label: 'What We Offer Card',
        sort: 4,
        content: {
          title: 'What We Offer',
          text: 'Homework support, fun activities, quiet space, and room to build positive connections.'
        }
      },
      {
        key: 'spotlight_card',
        label: 'Community Spotlight Card',
        sort: 5,
        content: {
          title: 'Community Spotlight',
          text: 'Featured activities, photos, events, or important updates can live here as the site grows.'
        }
      },
      {
        key: 'highlights_intro',
        label: 'Highlights Intro',
        sort: 6,
        content: {
          heading: 'What’s happening now',
          text: 'Quick links to the biggest things families and teens may want to check first.'
        }
      },
      {
        key: 'announcements_card',
        label: 'Announcements Card',
        sort: 7,
        content: {
          tag: 'Announcements',
          title: 'Latest News',
          text: 'Important updates, reminders, schedule changes, and current information.'
        }
      },
      {
        key: 'events_card',
        label: 'Events Card',
        sort: 8,
        content: {
          tag: 'Events',
          title: 'Upcoming Activities',
          text: 'See what is coming up this week, from games and movie nights to special events.'
        }
      },
      {
        key: 'engagement_card',
        label: 'Engagement Card',
        sort: 9,
        content: {
          tag: 'Engagement',
          title: 'Get Involved',
          text: 'Highlights, opportunities, and ways to stay connected with the lounge community.'
        }
      }
    ];

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO page_sections
      (page_id, section_key, section_label, content_json, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);

    sections.forEach(section => {
      stmt.run(
        homePageId,
        section.key,
        section.label,
        JSON.stringify(section.content),
        section.sort
      );
    });

    stmt.finalize();
  });
});

module.exports = db;