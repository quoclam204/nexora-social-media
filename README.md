# 🌐 Nexora — Social Media Platform

Mạng xã hội đầy đủ tính năng xây dựng với **Next.js 16** + **Supabase**.

---

## 🚀 Cài đặt & Chạy

### 1. Tạo Supabase Project

1. Truy cập [supabase.com](https://supabase.com) → **New Project**
2. Đặt tên project, chọn region (Singapore gần nhất)
3. Vào **Settings → API** → Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Cấu hình biến môi trường

```bash
# Sao chép file mẫu
cp .env.example .env.local
```

Điền giá trị thực vào `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### 3. Chạy Database Migration

1. Vào **Supabase Dashboard → SQL Editor**
2. Copy toàn bộ nội dung file `supabase/migrations/001_initial_schema.sql`
3. Paste vào SQL Editor → **Run**

Migration sẽ tạo:
- ✅ 13 tables (profiles, posts, reactions, comments, follows, notifications, messages, conversations, hashtags, blocks, reports...)
- ✅ Row Level Security (RLS) policies
- ✅ Triggers (auto-create profile khi đăng ký, updated_at)
- ✅ Storage buckets (avatars, posts, messages)
- ✅ Full-text search indexes

### 4. Cấu hình OAuth (tùy chọn)

**Google OAuth:**
1. [console.cloud.google.com](https://console.cloud.google.com) → Create Project
2. APIs & Services → Credentials → OAuth 2.0 Client ID
3. Authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. Supabase Dashboard → Authentication → Providers → Google → bật ON

**GitHub OAuth:**
1. [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App
2. Authorization callback URL: `https://your-project.supabase.co/auth/v1/callback`
3. Supabase Dashboard → Authentication → Providers → GitHub → bật ON

### 5. Cấu hình Supabase Auth URL

Supabase Dashboard → **Authentication → URL Configuration**:
- Site URL: `http://localhost:3000` (dev) hoặc domain của bạn
- Redirect URLs: thêm `http://localhost:3000/**`

### 6. Chạy ứng dụng

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

---

## 📁 Cấu trúc Project

```
src/
├── app/
│   ├── (auth)/           # Login, Register, Forgot password
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (main)/           # Các trang chính (cần đăng nhập)
│   │   ├── feed/         # Trang chủ
│   │   ├── profile/[username]/
│   │   ├── posts/[id]/
│   │   ├── notifications/
│   │   ├── messages/
│   │   ├── search/
│   │   ├── hashtags/[tag]/
│   │   └── admin/
│   ├── auth/callback/    # OAuth callback
│   └── layout.tsx
├── components/
│   ├── layout/           # Sidebar, MobileNav
│   ├── posts/            # PostCard, CreatePostModal, CommentsSection
│   ├── profile/          # EditProfileModal
│   └── ui/               # Avatar
├── lib/supabase/         # Supabase clients
├── types/                # TypeScript types
└── proxy.ts              # Route protection (Next.js 16)
```

---

## ✨ Tính năng

| Module | Tính năng |
|--------|-----------|
| 🔐 **Auth** | Email/Password, Google OAuth, GitHub OAuth, Quên mật khẩu |
| 👤 **Profile** | Avatar upload, Bio, Website, Follow/Unfollow |
| 📝 **Posts** | Tạo/Xóa, Ảnh (tối đa 4), Quyền riêng tư, Hashtag tự động |
| ❤️ **Reactions** | 6 loại emoji (Like, Love, Haha, Wow, Sad, Angry) |
| 💬 **Comments** | Bình luận lồng nhau (nested), Realtime |
| 👥 **Follow** | Follow/Unfollow, Feed cá nhân hóa |
| 🔔 **Notifications** | Push realtime, Đánh dấu đã đọc |
| ✉️ **Messages** | Chat 1-1 realtime, Read receipts |
| 🔍 **Search** | Full-text search users/posts/hashtags |
| # **Hashtags** | Tự động extract, Trending, Explore |
| ⚡ **Realtime** | Supabase Realtime WebSocket |
| 🛡️ **Admin** | Dashboard stats, Xóa user/post |

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16.2 (App Router, Turbopack)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Styling**: Vanilla CSS Modules (Dark mode)
- **Language**: TypeScript
- **Realtime**: Supabase Realtime (WebSocket)

---

## 📝 Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Lint code
```
