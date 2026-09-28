// js/supabase.js
// Supabase는 Storage(프로필 이미지)만 사용. 로그인은 Firebase Auth를 그대로 쓰고,
// Firebase ID 토큰을 Supabase에 넘겨서(Third-Party Auth) Storage 정책에서 uid를 확인한다.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { auth } from "./firebase.js";

// Supabase 대시보드 > Project Settings > API 에서 복사
const SUPABASE_URL = "https://xnbegbwpqhhfbnhwjbuw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuYmVnYndwcWhoZmJuaHdqYnV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0OTU0NDMsImV4cCI6MjEwNjA3MTQ0M30.2_3nEFLW0IBU6X-ZM0PhMxyNzBc4iHRP9901t1a1ky4";

export const AVATAR_BUCKET = "avatars";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  // 요청마다 현재 Firebase 유저의 ID 토큰을 Authorization 헤더로 보냄
  accessToken: async () => (await auth.currentUser?.getIdToken()) ?? null,
});
