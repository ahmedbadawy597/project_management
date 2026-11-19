# How Awqaf PPM works after importing the timeline

**Audience:** Project Managers  
**Language:** English  
**Related files:** `Awqaf_PPM_Project_Pack_Template.xlsx` / Sample pack  
**Product:** Awqaf PPM (Strategizeit)

---

## 1. Goal

The Excel **Project Pack** is the offline way to create a full project in the system:

- One **project**
- Several **apps** under that project
- **Team** membership (a person can join more than one app)
- One **delivery plan per app** (phases, tasks, milestones, risks)

After import, the PM manages delivery inside Awqaf PPM (Gantt, tasks, milestones, risks, tickets) without using the old free-form timeline as the operating file.

---

## 2. What you prepare in Excel

| Sheet | What you fill | Becomes in the system |
|---|---|---|
| Cover / Document Control | Document identity (branding) | Reference only (not imported) |
| How_to_Fill | Instructions | Reference only |
| **01_Project** | One project row | **Project** |
| **02_Apps** | One row per application | **Applications** under the project |
| **03_Team** | Email + role; repeat email for multi-app | **Project members** + **App teams** |
| **Plan\_\<APP_CODE\>** | Schedule / milestones / risks for that app | **WBS (Gantt)**, **Milestones**, **Risks** |
| 99_Lists | Allowed values | Reference only |

**Rules that matter**

- Dates: `YYYY-MM-DD` only  
- Codes (`project_code`, `app_code`, `item_code`) stay stable after first import  
- Emails must already exist in the system  
- Same person on many apps = **several rows** in `03_Team` (same email, different `app_code`)  
- Copy `Plan_TEMPLATE` → rename to `Plan_GIS-UNIT` (must match `app_code`)

---

## 3. Import steps (in the website)

1. Sign in as **Project Manager** or **Admin**.
2. Open **Projects (Manage)**.
3. Download **Template** or **Sample** (optional), fill offline, save `.xlsx`.
4. Click **Import pack** and choose your file.
5. If validation fails, fix the listed sheet/row errors and import again.
6. On success, the system creates or updates the project tree by **stable codes** (safe to re-import).

You can also **Export pack** from a project later, edit offline, and re-import.

---

## 4. What appears in the system after a successful import

```text
Project (01_Project)
├── Apps (02_Apps)
│   ├── App team (03_Team rows with that app_code)
│   └── Plan sheet Plan_<APP_CODE>
│       ├── Schedule  → Gantt / Tasks (WBS phases & tasks)
│       ├── Milestones → Delivery Milestones
│       └── Risks      → Risks & Issues
└── Project-level team (03_Team rows with blank app_code)
```

### 4.1 Project

- Visible in **Manage** and portfolio views  
- Manager, dates, status, phase come from `01_Project`  
- Open **Manage → project** to edit details, team, and apps

### 4.2 Applications

- Each `02_Apps` row becomes an application under the project  
- Shown in **Manage → Applications**, **Apps catalog**, and app workspace  
- Owner / App Manager comes from `owner_email` and team rows

### 4.3 Team (including multi-app)

- Project-level members: `app_code` empty  
- App members: one row per person **per app**  
- Example after import:
  - Developer A on App 1 + App 2 + App 3 → three memberships  
  - That developer only sees the apps they joined (membership scope)

### 4.4 Schedule → Gantt, Tasks & App dashboard

- Every `section=schedule` row becomes a **WBS** item (phase or task)  
- Linked to the **project** and tagged with the **app** from the plan sheet  
- **App workspace overview:** automatic dashboard (overall progress, delay days, phase bars) from `type=phase` + `weight_pct` and child task progress  
- **Gantt & Scheduling:** choose the project → bars show the imported plan  
  - Today the Gantt is **project-level** (all apps of that project in one chart)  
  - Tasks also appear under **Tasks & Work Management** for that project  
- Progress, dates, assignees, and hierarchy (`parent_code`) drive the bar tree

### 4.5 Milestones

- `section=milestone` rows → **Delivery Milestones** for the project  
- Use for acceptance points only (UAT, Go-Live, schema approved, …)  
- Baseline / forecast dates and deliverables come from the plan sheet

### 4.6 Risks & issues

- `section=risk` rows → **Risks & Issues** register for the project  
- Severity, status, owner, and due date are imported

### 4.7 What is *not* created by the pack

- Tickets / team chat (created later inside the app)  
- Documents upload history  
- Approvals workflow items  
- Budget transactions  

Those stay day-to-day tools inside Awqaf PPM after the plan exists.

---

## 5. Recommended PM workflow after import

1. **Manage** → open the project → confirm apps and teams.  
2. **Gantt** → select the project → review phases/tasks and dates.  
3. **Milestones** → confirm acceptance dates with stakeholders.  
4. **Risks** → review and assign mitigations.  
5. **Apps / Tickets** → run daily collaboration per app.  
6. When the plan changes offline → **Export pack** → edit → **Import** again (codes unchanged).

---

## 6. End-to-end picture

```text
Awqaf Timeline (old Excel)
        │
        ▼
Official Project Pack (.xlsx)   ← PM fills / sample from Phase 1
        │
        ▼ Import (Manage)
Awqaf PPM database
        │
        ├── Project + Apps + Teams
        ├── WBS  → Gantt + Tasks
        ├── Milestones
        └── Risks
        │
        ▼ Daily work
Tickets, chat, updates, re-export/re-import as needed
```

---

## 7. Quick FAQ

**Where is the Gantt for one app?**  
Imported app plans are stored with an app tag, but the Gantt screen currently shows the **whole project**. Filter/grouping by app can be added later; until then, use WBS names/codes that start from each `Plan_<APP_CODE>`.

**Can I import twice?**  
Yes. The system **upserts** by codes. Same codes update; new codes create.

**Who can import?**  
Users with project write access (PM / Admin).

**Which emails work?**  
Only people already registered in Awqaf PPM (see Admin / People).

---

*Strategizeit — Awqaf PPM Project Control*
