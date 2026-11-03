# GarmentAI Inspector 🧵🤖

**AI-Powered Garment Quality Inspection System**

GarmentAI Inspector is an AI-powered web application designed to streamline garment quality inspection. It uses Google Gemini AI to analyze uploaded garment images, identify visible defects, and generate inspection reports.

The platform also provides a Human-in-the-Loop review system that allows inspectors to review AI findings and make the final quality decision.

## ✨ Features

- **AI-Powered Inspection:** Analyze garment images using Google Gemini AI.
- **Image Upload:** Upload garment images in JPG, JPEG, PNG, and WEBP formats.
- **Defect Detection:** Identify visible garment defects and generate AI-based inspection reports.
- **Human Review:** Review AI-generated findings before making decisions.
- **Approval Workflow:** Approve, reject, or mark inspections as Needs Review.
- **Inspection History:** View previously submitted inspections and their statuses.
- **Dashboard:** Monitor inspection activities and quality control statistics.
- **Secure Authentication:** User registration and login using Supabase Auth.
- **Database Management:** Store inspection reports and review information in Supabase PostgreSQL.
- **Private Image Storage:** Store original garment images in a private Supabase Storage bucket.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Frontend and application framework |
| React | User interface |
| TypeScript | Application development |
| CSS | Styling and responsive UI |
| Google Gemini API | AI-powered garment image analysis |
| Supabase Auth | User authentication |
| Supabase PostgreSQL | Database |
| Supabase Storage | Image storage |
| Vercel | Application deployment |

## 🔄 How It Works

1. The user signs up or logs into the application.
2. The user uploads a garment image.
3. The backend authenticates the user and validates the uploaded image.
4. The original image is securely stored in Supabase Storage.
5. Google Gemini AI analyzes the garment image.
6. Gemini generates an inspection report containing visible findings.
7. The inspection details and AI analysis are saved in the Supabase database.
8. A human inspector reviews the original image and AI-generated report.
9. The inspector selects one of the following decisions:
   - **Approve:** Approve the inspection.
   - **Reject:** Reject the inspection.
   - **Needs Review:** Keep the inspection available for further examination.
10. The inspection status and review information are updated in the database.

> **Important:** AI provides inspection assistance and suggestions. The final quality decision is made by a human inspector.

## 📁 Project Structure

```text
garment-ai-inspector/
│
├── app/
│   ├── api/
│   │   ├── inspect/
│   │   │   └── route.ts
│   │   └── inspections/
│   │       └── [id]/
│   │           └── route.ts
│   │
│   ├── page.tsx
│   ├── layout.tsx
│   └── globals.css
│
├── lib/
│   ├── supabase-admin.ts
│   └── supabase-browser.ts
│
├── public/
│
├── supabase/
│   └── schema.sql
│
├── .gitignore
├── package.json
├── next.config.ts
└── README.md
```

*Note: This structure shows the main application files. Additional configuration and supporting files may also exist.*

## ⚙️ Getting Started

Follow these steps to run the project locally.

### 1. Clone the Repository

```bash
git clone https://github.com/zari12-dev/garment-ai-inspector.git
```

### 2. Navigate to the Project Folder

```bash
cd garment-ai-inspector
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory and add:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

Replace the placeholder values with your actual credentials.

**Security Note:**
- Never commit `.env.local` to GitHub.
- Never expose the Supabase Service Role Key.
- Never expose the Gemini API Key in client-side code.
- Keep privileged credentials on the server.

### 5. Run the Development Server

```bash
npm run dev
```

Open the application:

```text
http://localhost:3000
```

## 🗄️ Supabase Configuration

GarmentAI Inspector uses Supabase for authentication, PostgreSQL database management, and private image storage.

### 1. Authentication

Configure Supabase Authentication for user registration and login.

### 2. Database

The application uses an `inspections` table with the following columns:

| Column | Data Type | Nullable | Default |
|---|---|---|---|
| id | bigint | No | None |
| file_name | text | No | None |
| file_size | integer | No | 0 |
| analysis | text | No | None |
| status | text | No | Pending |
| review_comment | text | Yes | Empty string |
| created_at | timestamptz | No | now() |
| reviewed_at | timestamptz | Yes | null |
| user_id | uuid | Yes | null |
| image_path | text | Yes | null |

The database stores:
- Uploaded image information.
- Gemini-generated inspection reports.
- Inspection status.
- Human review comments.
- User ownership information.
- Inspection and review timestamps.

**Database SQL File**

The repository includes:

```text
supabase/schema.sql
```

This file contains the SQL configuration for:
- User relationship column configuration.
- Review timestamp column configuration.
- Optional review comments.
- Row Level Security (RLS).
- User-specific SELECT policy.
- Inspection history index.

**Important:** The SQL file configures an existing `public.inspections` table. It does not create the complete table from scratch. For a fresh database, the original table structure must also be created before running this SQL file.

To apply the SQL configuration:

1. Open your Supabase project.
2. Navigate to SQL Editor.
3. Open the `supabase/schema.sql` file from this repository.
4. Copy its SQL statements into the SQL Editor.
5. Review and execute the statements.

### 3. Row Level Security (RLS)

Row Level Security is enabled on the `inspections` table.

The user-specific SELECT policy restricts authenticated users to reading their own inspection records:

```sql
CREATE POLICY "Users can read their inspections"
ON public.inspections
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

The application also performs server-side authentication and user ownership checks in its API routes.

### 4. Supabase Storage

Create a storage bucket with the following name:

```text
garment-images
```

Keep the bucket private.

The application uploads original garment images to this bucket and retrieves them through server-generated signed URLs.

## 🔌 API Routes

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/inspect` | Authenticate user, validate image, upload image, generate AI analysis, and save inspection |
| PATCH | `/api/inspections/[id]` | Update inspection status and human review information |
| GET | `/api/inspections/[id]` | Retrieve a signed URL for the inspection image |

All protected API operations require a valid authenticated user session.

## 🔐 Environment Variables

| Variable | Description |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase public/anonymous key |
| SUPABASE_SERVICE_ROLE_KEY | Server-side Supabase service role key |
| GEMINI_API_KEY | Google Gemini API key |

Keep all sensitive credentials secure and never upload secret keys to GitHub.

## 🚀 Deployment

The application is deployed using **Vercel**.

To deploy your own instance:

1. Push the project to a GitHub repository.
2. Import the repository into Vercel.
3. Configure the required environment variables in Vercel.
4. Deploy the application.
5. Verify the production application and its connected services.

Production URL:

https://garment-ai-inspector.vercel.app

## 🧪 Production Testing

The following production workflows have been tested successfully:

| Test | Status |
|---|---|
| User Authentication | Passed |
| Image Upload and AI Analysis | Passed |
| Human Review Display | Passed |
| Approve Workflow | Passed |
| Reject Workflow | Passed |
| Needs Review Workflow | Passed |
| Dashboard Statistics | Pending |
| Multi-User Security | Pending |
| Final Production Verification | Pending |

## 🔮 Future Improvements

- Advanced garment defect classification.
- More detailed inspection analytics and reports.
- Inspection export functionality.
- Improved AI accuracy through specialized inspection datasets.
- Enhanced review history and audit tracking.
- Additional quality control metrics.

## 👩‍💻 Author

**GarmentAI Inspector**

Developed as an AI automation project focused on improving garment quality inspection through AI-assisted analysis and human decision-making.

## 📄 License

This project is developed for educational and demonstration purposes. A formal open-source license can be added when selected.
