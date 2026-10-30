# GarmentAI Inspector 🧵🤖

**AI-Powered Garment Quality Inspection System**

GarmentAI Inspector is an AI-powered web application that helps streamline garment quality inspection. It uses Google Gemini AI to analyze uploaded garment images, identify visible defects, and generate inspection reports.

The platform also provides a Human-in-the-Loop review system that allows inspectors to review AI findings and make the final quality decision.

## ✨ Features

- **AI-Powered Inspection:** Analyze garment images using Google Gemini AI.
- **Image Upload:** Upload garment images in JPG, JPEG, PNG, and WEBP formats.
- **Defect Detection:** Identify visible garment defects and generate AI-based inspection reports.
- **Human Review:** Inspectors can review AI-generated results before making decisions.
- **Approval Workflow:** Approve, reject, or mark inspections as Needs Review.
- **Inspection History:** View previously submitted inspections and their review statuses.
- **Dashboard:** Monitor inspection activities and quality control statistics.
- **Secure Authentication:** User registration and login using Supabase Auth.
- **Database Management:** Store inspection reports and review information in Supabase.
- **Image Storage:** Store original garment images in a private Supabase Storage bucket.

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
3. The backend validates the uploaded image.
4. The image is securely stored in Supabase Storage.
5. Google Gemini AI analyzes the garment image.
6. The AI generates an inspection report with its findings.
7. The inspection details and analysis are saved in Supabase.
8. A human inspector reviews the original image and AI-generated report.
9. The inspector selects one of the following decisions:
   - **Approve:** Approve the inspection.
   - **Reject:** Reject the inspection.
   - **Needs Review:** Keep the inspection available for further examination.
10. The inspection status and review information are saved in the database.

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
│   │           ├── route.ts
│   │           └── image/
│   │               └── route.ts
│   │
│   ├── page.tsx
│   └── ...
│
├── components/
│   └── ...
│
├── lib/
│   └── ...
│
├── public/
│
├── .env.local
├── .gitignore
├── package.json
└── README.md
```

*Note: This is an overview of the main project structure. Additional files and folders may exist in the repository.*

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

Create a `.env.local` file in the root directory and add the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

Replace the placeholder values with your actual credentials.

**Important:** Never commit `.env.local` or expose your Supabase Service Role Key or Gemini API Key in client-side code.

### 5. Run the Development Server

```bash
npm run dev
```

Open the following URL in your browser:

```text
http://localhost:3000
```

## 🗄️ Supabase Configuration

GarmentAI Inspector uses Supabase for authentication, database management, and image storage.

### Database

Create an `inspections` table in your Supabase PostgreSQL database with the following fields:

| Column | Type |
|---|---|
| id | bigint |
| file_name | text |
| file_size | integer |
| analysis | text |
| status | text |
| review_comment | text |
| created_at | timestamptz |
| reviewed_at | timestamptz |
| user_id | uuid |
| image_path | text |

### Storage

Create a storage bucket with the following name:

```text
garment-images
```

Keep the bucket private and configure access through secure server-side operations.

### Row Level Security (RLS)

Enable Row Level Security on the `inspections` table and configure policies to restrict users to their own inspection records.

Example SELECT policy:

```sql
create policy "Users can read their inspections"
on public.inspections
for select
to authenticated
using (auth.uid() = user_id);
```

Additional policies and server-side authorization should be configured according to the application's database operations.

## 🔐 Environment Variables

| Variable | Description |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase public/anonymous key |
| SUPABASE_SERVICE_ROLE_KEY | Server-side Supabase service role key |
| GEMINI_API_KEY | Google Gemini API key |

Keep all sensitive credentials secure. Do not upload secret keys to GitHub.

## 🚀 Deployment

The application is deployed using **Vercel**.

To deploy your own instance:

1. Push the project to a GitHub repository.
2. Import the repository into Vercel.
3. Configure the required environment variables in Vercel.
4. Deploy the application.
5. Verify the production application and its connected services.

## 🧪 Production Testing

The following production workflows have been tested successfully:

| Test | Status |
|---|---|
| User Authentication | ✅ Passed |
| Image Upload and AI Analysis | ✅ Passed |
| Human Review Display | ✅ Passed |
| Approve Workflow | ✅ Passed |
| Reject Workflow | ✅ Passed |
| Needs Review Workflow | ✅ Passed |
| Dashboard Statistics | ⏳ Pending |
| Multi-User Security | ⏳ Pending |
| Final Production Verification | ⏳ Pending |

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
