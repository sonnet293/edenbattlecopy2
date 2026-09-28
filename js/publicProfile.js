// js/publicProfile.js
// 다른 트레이너에게 보여줄 공개 프로필(profiles/{uid}).
// users 문서는 본인/GM만 읽을 수 있으므로, 트레이너 카드에 필요한 필드만 여기에 복사해 둔다.
// 본인이 프로필 페이지를 열거나 수정할 때, 대기실에 들어올 때 갱신된다.
import { db } from "./firebase.js";
import { doc, getDoc, setDoc, serverTimestamp }
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export const profileRef = (uid) => doc(db, "profiles", uid);

// users 문서 데이터 -> 공개 프로필 (firestore.rules의 profiles 허용 필드와 맞출 것)
export function syncPublicProfile(uid, userData) {
    return setDoc(profileRef(uid), {
        nickname: userData?.nickname ?? null,
        profileImage: userData?.profileImage ?? null,
        cardSlots: Array.isArray(userData?.cardSlots) ? userData.cardSlots : [],
        entry: Array.isArray(userData?.entry) ? userData.entry : [],
        updatedAt: serverTimestamp(),
    }).catch((err) => console.error("공개 프로필 갱신 실패", err));
}

export async function loadPublicProfile(uid) {
    const snap = await getDoc(profileRef(uid));
    return snap.exists() ? snap.data() : null;
}
