# 🗳️ UniVote Kenya

**University Electoral Commission (UEC) Student Voting System**

A full-stack, production-grade digital voting platform inspired by Kenya's IEBC electoral process. Built for universities to conduct free, fair, and transparent student elections.

---

## ✨ Features

### 👩‍🎓 Students
- Login with email + password (default password = registration number)
- Forgot password → email reset link
- Register as a voter for an active election
- Cast secret ballot for all positions
- President vote **auto-selects Deputy President** (ticket system)
- View real-time live results with bar charts + progress bars
- See who is winning / who won

### 🏛️ IEBC Portal
- Create and manage elections (set voting window, academic year, status)
- **Register students** — name, phone, programme, school, admission date, auto-computes current year
- Review voter registration applications (Approve / Reject with reason)
- Manage candidates by position
- Approve candidates before they appear on ballot
- Live results monitoring with donut chart turnout + bar charts
- Post announcements

### 🛡️ Admin
- Full IEBC access + user management
- Separate admin dashboard

---

## 🗂️ Project Structure

```
univote/
│
├── backend/                            # Django REST API
│   ├── elections/
│   │   ├── models.py                   # User, Election, Candidate, Vote, VoterRegistration, Announcement
│   │   ├── serializers.py              # All serializers
│   │   ├── views.py                    # AuthViewSet, StudentViewSet, ElectionViewSet,
│   │   │                               #   CandidateViewSet, IEBCViewSet, AnnouncementViewSet
│   │   ├── urls.py                     # Router registration
│   │   └── apps.py
│   ├── univote/
│   │   ├── settings.py                 # Full Django settings
│   │   ├── urls.py                     # Root URLs
│   │   └── wsgi.py
│   └── requirements.txt
│
└── frontend/                           # React + Vite
    ├── index.html                      # Bootstrap Icons + Google Fonts CDN
    ├── vite.config.js                  # Vite + API proxy
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx                     # Router + role-based guards
        ├── context/
        │   └── AuthContext.jsx         # Auth state provider
        ├── services/
        │   └── api.js                  # All API calls
        ├── components/
        │   ├── Sidebar.jsx             # Collapsible sidebar (toggled)
        │   ├── Navbar.jsx              # Topbar with user info
        │   └── Layout.jsx              # Shell wrapper
        ├── pages/
        │   ├── Login.jsx               # Unified login (student/iebc/admin) + forgot password
        │   ├── ResetPassword.jsx       # Password reset via email link
        │   ├── student/
        │   │   ├── Dashboard.jsx       # Student home + voter reg
        │   │   ├── Vote.jsx            # Voting booth by position
        │   │   └── Results.jsx         # Live results with charts
        │   └── iebc/
        │       ├── Dashboard.jsx       # IEBC control panel
        │       ├── Students.jsx        # Register + list students
        │       ├── VoterRegistrations.jsx  # Approve/reject voter regs
        │       ├── Elections.jsx       # Create/manage elections
        │       ├── Candidates.jsx      # Approve candidates
        │       └── Results.jsx         # Live results monitor (IEBC view)
        └── styles/
            └── style.css              # Full design system (Kenya green + gold)
```

---

## 🚀 Getting Started

### Backend

```bash
cd backend

python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

pip install -r requirements.txt

python manage.py makemigrations elections
python manage.py migrate

# Create IEBC superuser
python manage.py createsuperuser
# Then in Django shell set role='iebc' or 'admin'

python manage.py runserver
```

### Frontend

```bash
cd frontend

npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Backend API: `http://localhost:8000/api/`

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login/` | No | Login (email + password) |
| POST | `/api/auth/logout/` | Yes | Logout |
| GET | `/api/auth/me/` | Yes | Current user profile |
| POST | `/api/auth/password-reset/` | No | Request reset email |
| POST | `/api/auth/password-reset-confirm/` | No | Confirm reset |

### Student
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/student/register-voter/` | Register for an election |
| POST | `/api/student/cast-vote/` | Submit ballot (multiple positions) |
| GET | `/api/student/my-votes/` | Check voted positions |
| GET | `/api/student/voter-status/` | Check voter registration status |

### Elections
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/elections/` | List all elections |
| GET | `/api/elections/active/` | Active elections only |
| GET | `/api/elections/{id}/live-results/` | Live results for election |

### IEBC
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/iebc/students/` | List / register students |
| GET | `/api/iebc/voter-registrations/` | List voter registration requests |
| POST | `/api/iebc/voter-registrations/{id}/review/` | Approve / reject |
| GET | `/api/iebc/dashboard-stats/` | Dashboard statistics |

---

## 🗳️ Positions (7 Total)

| Position | Scope |
|----------|-------|
| Student President | University-wide |
| Deputy President | Auto-linked to President (running mate) |
| Secretary General | University-wide |
| Finance Director | University-wide |
| School Governor | Per school |
| Programme Director (MCA) | Per programme |
| School Senator | Per school |

---

## 🎨 Design System

- **Theme**: Institutional Kenya — deep forest green (#115740) + gold (#c9952a)
- **Fonts**: DM Serif Display (headings) + DM Sans (body)
- **Icons**: Bootstrap Icons
- **Kenya stripe** decorative element on auth pages
- Collapsible sidebar with section labels
- Role badges: Student 🎓 | IEBC 🏛️ | Admin 🛡️
- Live dot indicator for active elections
- Real-time charts via Recharts

---

## 🔐 Roles & Access

| Role | Default Password | Access |
|------|-----------------|--------|
| Student | Registration Number | Student portal |
| IEBC | Set by admin | IEBC portal |
| Admin | Set manually | Full access |

---

## ⚙️ Settings Highlights

```python
AUTH_USER_MODEL = 'elections.User'       # Custom User
TIME_ZONE = 'Africa/Nairobi'            # Kenya timezone
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'  # Console for dev
FRONTEND_URL = 'http://localhost:5173'   # For reset links
```

---

## 📦 Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Django 4.2 + Django REST Framework |
| Auth | Token Authentication + Email Reset |
| Frontend | React 18 + Vite 5 |
| Routing | React Router v6 |
| Charts | Recharts |
| Icons | Bootstrap Icons (CDN) |
| Fonts | DM Serif Display + DM Sans (Google) |
| DB | SQLite (dev) → PostgreSQL (prod) |

---

## 🌍 Production Checklist

- [ ] Set `SECRET_KEY` from env variable
- [ ] Set `DEBUG = False`
- [ ] Configure real SMTP email (e.g., SendGrid)
- [ ] Switch to PostgreSQL
- [ ] Configure Nginx for static/media files
- [ ] Set `ALLOWED_HOSTS` and proper `CORS_ALLOWED_ORIGINS`
- [ ] Use HTTPS

---

**Made with 🇰🇪 for Kenyan universities**